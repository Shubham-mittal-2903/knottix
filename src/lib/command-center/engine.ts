import type { NavItem, CommandAction } from '@/config/navigation';
import type { SessionUser } from '@/types';
import { isDemoMode, DEMO_PROJECTS, DEMO_TASKS, DEMO_MEETINGS, DEMO_REPOSITORIES, DEMO_MEMORY_ENTRIES } from '@/lib/demo';
import { getSystem, ensureOrganizationReady } from '@/lib/system/bootstrap';
import { buildIntelligenceContext } from '@/lib/system/request-context';
import { createAuditLog } from '@/lib/db/queries/audit';
import { getRequestContext } from '@/lib/request';
import { logger } from '@/lib/logger';
import { classifyCommand } from './classify';
import { continueTaskSession, cancelTaskSession, findTaskSessionByKeyword, listRunningTaskSessions } from '@/lib/task-sessions';
import { explainContext } from '@/lib/context-engine';
import { listServerInfos, refreshMCPServers } from '@/lib/mcp/manager';
import { explainRecentMCPToolChoice } from '@/lib/mcp/explain';
import type { CommandExecutionResult, CommandPlan, CommandStepResult } from './types';

export async function planCommand(
  query: string,
  user: SessionUser,
  navItems: NavItem[],
  staticCommands: CommandAction[],
): Promise<CommandPlan> {
  const demo = isDemoMode();
  const system = await getSystem();
  if (!demo) await ensureOrganizationReady(system, user.organizationId);

  const plan = await classifyCommand(
    query,
    { platform: system.intelligence, aiRuntime: system.aiRuntime, organizationId: user.organizationId, userId: user.id },
    navItems,
    staticCommands,
  );

  // A resolved tool can declare `metadata.requiresConfirmation` (close_app, git_commit,
  // git_push, whatsapp_send_message, ...) — the router doesn't know about tool metadata, so the
  // engine checks the real Tool Registry here and upgrades the plan if any step needs it.
  if (!demo && !plan.requiresConfirmation && plan.steps.length > 0) {
    const needsConfirmation = plan.steps.some((step) => {
      try {
        return Boolean(system.intelligence.tools.get(step.toolName).metadata?.requiresConfirmation);
      } catch {
        return false;
      }
    });
    if (needsConfirmation) return { ...plan, requiresConfirmation: true };
  }

  return plan;
}

function suggestionsFor(plan: CommandPlan): string[] {
  switch (plan.intent) {
    case 'tool':
    case 'workflow':
      return plan.steps.map((s) => `Open the full ${s.label} page`);
    case 'search':
      return ['Open Knowledge to see all results'];
    case 'conversation':
    case 'information':
      return plan.employeeKey ? [`Continue this in ${plan.employeeName}'s full chat`] : [];
    default:
      return [];
  }
}

async function runDemoStep(step: CommandPlan['steps'][number], plan: CommandPlan): Promise<CommandStepResult> {
  if (step.toolName.startsWith('task_session:')) {
    // Not a "simulate success" case — Task Sessions genuinely require a real database (session
    // recovery across a restart is the whole point), so Demo Mode says so honestly rather than
    // pretending a session was continued/paused.
    return {
      toolName: step.toolName,
      label: step.label,
      success: false,
      summary: 'Task Sessions require a real database and are not available in Demo Mode.',
    };
  }

  if (step.toolName === 'context:explain') {
    return {
      toolName: step.toolName,
      label: step.label,
      success: false,
      summary: 'The Context Engine queries real organizational data directly and is not available in Demo Mode.',
    };
  }

  if (step.toolName.startsWith('mcp:')) {
    // MCP servers are real, authenticated external connections — there is nothing honest to
    // simulate (mirrors the Task Sessions demo guard directly above).
    return {
      toolName: step.toolName,
      label: step.label,
      success: false,
      summary: 'MCP servers require real, authenticated external connections and are not available in Demo Mode.',
    };
  }

  switch (step.toolName) {
    case 'list_projects':
      return {
        toolName: step.toolName,
        label: step.label,
        success: true,
        summary: `${DEMO_PROJECTS.length} projects — ${DEMO_PROJECTS.slice(0, 3).map((p) => p.title).join(', ')}${DEMO_PROJECTS.length > 3 ? ', ...' : ''}`,
      };
    case 'list_tasks': {
      const overdue = plan.query.toLowerCase().includes('overdue');
      const now = Date.now();
      const tasks = overdue
        ? DEMO_TASKS.filter((t) => t.dueDate && t.dueDate.getTime() < now && t.status !== 'DONE' && t.status !== 'CANCELLED')
        : DEMO_TASKS;
      return {
        toolName: step.toolName,
        label: overdue ? 'Overdue Tasks' : step.label,
        success: true,
        summary:
          tasks.length === 0
            ? overdue
              ? 'No overdue tasks — everything is on track.'
              : 'No tasks found.'
            : `${tasks.length} task${tasks.length === 1 ? '' : 's'} — ${tasks.slice(0, 3).map((t) => t.title).join(', ')}${tasks.length > 3 ? ', ...' : ''}`,
      };
    }
    case 'list_meetings': {
      const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
      const endOfToday = new Date(new Date().setHours(23, 59, 59, 999));
      const today = plan.query.toLowerCase().includes('today')
        ? DEMO_MEETINGS.filter((m) => m.startTime >= startOfToday && m.startTime <= endOfToday)
        : DEMO_MEETINGS;
      return {
        toolName: step.toolName,
        label: step.label,
        success: true,
        summary:
          today.length === 0
            ? 'No meetings found for that range.'
            : `${today.length} meeting${today.length === 1 ? '' : 's'} — ${today.slice(0, 3).map((m) => m.title).join(', ')}${today.length > 3 ? ', ...' : ''}`,
      };
    }
    case 'github_list_repositories':
      return {
        toolName: step.toolName,
        label: step.label,
        success: true,
        summary: `${DEMO_REPOSITORIES.length} repositories — ${DEMO_REPOSITORIES.slice(0, 3).map((r) => r.fullName).join(', ')}`,
      };
    case 'read_organization_memory': {
      const q = plan.searchQuery?.toLowerCase().trim();
      const entries = q
        ? DEMO_MEMORY_ENTRIES.filter((e) => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q))
        : DEMO_MEMORY_ENTRIES;
      return {
        toolName: step.toolName,
        label: step.label,
        success: true,
        summary:
          entries.length === 0
            ? `No knowledge entries matched "${plan.searchQuery}".`
            : `${entries.length} result${entries.length === 1 ? '' : 's'} — ${entries.slice(0, 3).map((e) => e.title).join(', ')}`,
      };
    }
    default:
      // Desktop Runtime tools have no fixture data to simulate against — Demo Mode reports a
      // clean, honest "simulated" success rather than a failure, and never actually launches
      // anything, sends anything, or touches the filesystem.
      return {
        toolName: step.toolName,
        label: step.label,
        success: true,
        summary: 'Demo Mode — this action was simulated. Nothing was actually executed on the computer.',
      };
  }
}

/** "Continue my website" / "Resume ACCD" / "Show active work" / "Pause current session" — Task
 *  Sessions aren't a Tool Engine tool (they're a persisted control-plane concept, not a
 *  composable skill), so these are handled here directly rather than through
 *  `system.intelligence.tools.execute()`, but every action still goes through the exact same
 *  `task-sessions/manager.ts` functions the `/task-sessions` page itself calls — no duplicate
 *  session-control logic. */
async function runTaskSessionStep(step: CommandPlan['steps'][number], user: SessionUser): Promise<CommandStepResult> {
  const keyword = typeof step.params?.keyword === 'string' ? step.params.keyword.trim() : '';

  async function resolveSession() {
    if (keyword) return findTaskSessionByKeyword(keyword, user);
    const active = await listRunningTaskSessions(user);
    return active[0] ?? null;
  }

  if (step.toolName === 'task_session:list') {
    const active = await listRunningTaskSessions(user);
    return {
      toolName: step.toolName,
      label: step.label,
      success: true,
      summary:
        active.length === 0
          ? 'No active task sessions.'
          : `${active.length} active session${active.length === 1 ? '' : 's'} — ${active.map((s) => s.objective).join(', ')}`,
    };
  }

  const session = await resolveSession();
  if (!session) {
    return {
      toolName: step.toolName,
      label: step.label,
      success: false,
      summary: keyword ? `No active session matching "${keyword}".` : 'No active task session to act on.',
    };
  }

  if (step.toolName === 'task_session:continue') {
    const progress = await continueTaskSession(session.id, user);
    return {
      toolName: step.toolName,
      label: step.label,
      success: true,
      summary: `"${progress.session.objective}" is now ${progress.session.status.toLowerCase()}.`,
    };
  }

  const cancelled = await cancelTaskSession(session.id, user);
  return {
    toolName: step.toolName,
    label: step.label,
    success: true,
    summary: `"${cancelled.objective}" cancelled.`,
  };
}

/** "What do you know about ACCD?" / "Why did you choose this context?" / "What information are
 *  you using?" — answered directly from the Context Engine's real, live collection+ranking
 *  pipeline (`explainContext`), the same one `startGoal()` itself runs before planning. */
async function runContextStep(step: CommandPlan['steps'][number], plan: CommandPlan, user: SessionUser): Promise<CommandStepResult> {
  const query = typeof step.params?.query === 'string' && step.params.query ? step.params.query : plan.query;
  const explanation = await explainContext(query, user);
  return { toolName: step.toolName, label: step.label, success: true, summary: explanation };
}

/** "Show connected MCP servers" / "Refresh MCP servers" / "What tools are available?" / "Use the
 *  Figma MCP" / "Why did you choose this MCP tool?" — every action routes through the real MCP
 *  Client Manager (`lib/mcp/manager.ts`) or the real Memory Engine record of a past goal
 *  (`lib/mcp/explain.ts`), the same functions the `/mcp` Mission Control page and Goal Engine
 *  themselves use. No parallel MCP status/listing logic. */
async function runMCPStep(step: CommandPlan['steps'][number], user: SessionUser): Promise<CommandStepResult> {
  if (step.toolName === 'mcp:list') {
    const servers = await listServerInfos(user.organizationId);
    if (servers.length === 0) {
      return { toolName: step.toolName, label: step.label, success: true, summary: 'No MCP servers configured yet.' };
    }
    const summary = servers
      .map((s) => `${s.server.name} (${s.server.status.toLowerCase()}${s.server.status === 'CONNECTED' ? `, ${s.tools.length} tool${s.tools.length === 1 ? '' : 's'}` : ''})`)
      .join(', ');
    return { toolName: step.toolName, label: step.label, success: true, summary: `${servers.length} MCP server${servers.length === 1 ? '' : 's'} — ${summary}` };
  }

  if (step.toolName === 'mcp:refresh') {
    const servers = await refreshMCPServers(user.organizationId);
    const connected = servers.filter((s) => s.server.status === 'CONNECTED').length;
    return {
      toolName: step.toolName,
      label: step.label,
      success: true,
      summary: servers.length === 0 ? 'No MCP servers configured yet.' : `Refreshed ${servers.length} server${servers.length === 1 ? '' : 's'} — ${connected} connected.`,
    };
  }

  if (step.toolName === 'mcp:tools') {
    const servers = await listServerInfos(user.organizationId);
    const tools = servers.flatMap((s) => s.tools.map((t) => `${t.name} (${s.server.name})`));
    return {
      toolName: step.toolName,
      label: step.label,
      success: true,
      summary: tools.length === 0 ? 'No MCP tools available — connect an MCP server first.' : `${tools.length} tool${tools.length === 1 ? '' : 's'} — ${tools.slice(0, 8).join(', ')}${tools.length > 8 ? ', ...' : ''}`,
    };
  }

  if (step.toolName === 'mcp:use') {
    const nameQuery = typeof step.params?.serverName === 'string' ? step.params.serverName.trim().toLowerCase() : '';
    const servers = await listServerInfos(user.organizationId);
    const match = servers.find((s) => s.server.name.toLowerCase().includes(nameQuery));
    if (!match) {
      return { toolName: step.toolName, label: step.label, success: false, summary: nameQuery ? `No MCP server matching "${nameQuery}".` : 'No MCP server name recognized.' };
    }
    if (match.server.status !== 'CONNECTED') {
      return { toolName: step.toolName, label: step.label, success: false, summary: `"${match.server.name}" is ${match.server.status.toLowerCase()}, not connected. Try "Refresh MCP servers" first.` };
    }
    return {
      toolName: step.toolName,
      label: step.label,
      success: true,
      summary: `"${match.server.name}" is connected with ${match.tools.length} tool${match.tools.length === 1 ? '' : 's'} available — its tools are already usable as Skills in any goal.`,
    };
  }

  // mcp:explain
  const { system, context } = await buildIntelligenceContext(user, 'command-center');
  const explanation = await explainRecentMCPToolChoice(system.memoryEngine, context, user);
  return { toolName: step.toolName, label: step.label, success: true, summary: explanation };
}

async function runRealStep(
  step: CommandPlan['steps'][number],
  plan: CommandPlan,
  user: SessionUser,
): Promise<CommandStepResult> {
  if (step.toolName.startsWith('task_session:')) return runTaskSessionStep(step, user);
  if (step.toolName === 'context:explain') return runContextStep(step, plan, user);
  if (step.toolName.startsWith('mcp:')) return runMCPStep(step, user);

  const { system, context } = await buildIntelligenceContext(user, 'command-center');
  const accessContext = system.intelligence.context.toToolAccessContext(context);
  const executionContext = system.intelligence.context.toToolExecutionContext(context);

  const input: Record<string, unknown> = { ...step.params };
  if (step.toolName === 'read_organization_memory' && plan.searchQuery && !input.query) input.query = plan.searchQuery;

  const result = await system.intelligence.tools.execute(step.toolName, input, accessContext, executionContext);

  if (!result.success) {
    return { toolName: step.toolName, label: step.label, success: false, summary: 'This tool failed to run.', error: result.error };
  }

  const output = result.output as Record<string, unknown> | undefined;
  const count = Array.isArray(output) ? output.length : Array.isArray(output?.repositories) ? (output.repositories as unknown[]).length : null;
  const message = typeof output?.message === 'string' ? output.message : null;
  const found = typeof output?.found === 'boolean' ? output.found : null;

  if (found === false) {
    return { toolName: step.toolName, label: step.label, success: false, summary: message ?? `${step.label} could not find what it was looking for.` };
  }

  return {
    toolName: step.toolName,
    label: step.label,
    success: true,
    summary: message ?? (count !== null ? `${count} result${count === 1 ? '' : 's'} from ${step.label}.` : `${step.label} completed.`),
  };
}

async function runConversation(plan: CommandPlan, user: SessionUser, demo: boolean): Promise<string> {
  if (!plan.employeeKey) return "I couldn't find an AI Employee to route this to.";

  if (demo) {
    return `Demo Mode — ${plan.employeeName} would ground a real answer to "${plan.query}" in live organizational data. Open the full chat to try one of its seeded example conversations.`;
  }

  try {
    const { system, context } = await buildIntelligenceContext(user, 'command-center');
    const result = await system.intelligence.agents.execute(
      { agentKey: plan.employeeKey, organizationId: user.organizationId, input: plan.query },
      { userId: user.id, organizationId: user.organizationId, workspaceId: user.workspaceId, isFounder: user.isFounder, permissions: user.permissions },
      context,
    );

    const { ipAddress, userAgent } = await getRequestContext();
    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.id,
      action: 'AI_EXECUTION',
      entityType: 'agent',
      entityId: plan.employeeKey,
      entityName: plan.employeeName ?? plan.employeeKey,
      metadata: { requestId: result.requestId, source: 'command-center' },
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    });

    if (result.status === 'failed') return result.error ?? `${plan.employeeName} could not answer that.`;
    return result.content;
  } catch (error) {
    logger.warn('command-center.execute', 'Conversation execution failed', { error: error instanceof Error ? error.message : String(error) });
    return `${plan.employeeName} is unavailable right now.`;
  }
}

export async function executeCommand(plan: CommandPlan, user: SessionUser): Promise<CommandExecutionResult> {
  const start = Date.now();
  const demo = isDemoMode();

  if (plan.intent === 'navigation') {
    return {
      status: 'completed',
      message: `Opening ${plan.navigationLabel ?? 'that screen'}.`,
      demo,
      stepResults: [],
      conversationReply: null,
      latencyMs: Date.now() - start,
      suggestions: [],
    };
  }

  // Only a write-shaped command with NO real tool resolved short-circuits here. When real steps
  // exist (e.g. a confirmed WhatsApp send sequence), `requiresConfirmation` only ever reaches
  // this function after the API route has already gated on the client sending `confirm: true` —
  // so it's safe to fall through and actually run the steps below.
  if (plan.requiresConfirmation && plan.steps.length === 0) {
    if (demo) {
      return {
        status: 'completed',
        message: 'Demo Mode — command simulated.',
        demo: true,
        stepResults: [
          {
            toolName: 'simulated',
            label: plan.affectedResources.join(', ') || 'This action',
            success: true,
            summary: 'No data was changed — this is a simulated result.',
          },
        ],
        conversationReply: null,
        latencyMs: Date.now() - start,
        suggestions: [],
      };
    }
    return {
      status: 'unavailable',
      message: "No tool is registered for this action yet, so nothing was changed. Try asking an AI Employee for guidance instead.",
      demo: false,
      stepResults: [],
      conversationReply: null,
      latencyMs: Date.now() - start,
      suggestions: plan.employeeName ? [`Ask ${plan.employeeName} about this instead`] : [],
    };
  }

  if (plan.intent === 'conversation' || plan.intent === 'information') {
    const reply = await runConversation(plan, user, demo);
    return {
      status: 'completed',
      message: demo ? 'Demo Mode — command simulated.' : `Answered by ${plan.employeeName ?? 'an AI Employee'}.`,
      demo,
      stepResults: [],
      conversationReply: reply,
      latencyMs: Date.now() - start,
      suggestions: suggestionsFor(plan),
    };
  }

  // tool | workflow | search — a multi-step plan (e.g. WhatsApp: open → find contact → draft →
  // send) stops at the first failure rather than continuing (never type/send into the wrong chat
  // because an earlier step silently failed).
  const stepResults: CommandStepResult[] = [];
  for (const step of plan.steps) {
    const outcome = demo ? await runDemoStep(step, plan) : await runRealStep(step, plan, user);
    stepResults.push(outcome);
    if (!outcome.success) break;
  }

  const incomplete = stepResults.length < plan.steps.length;
  const anyFailed = incomplete || stepResults.some((r) => !r.success);

  return {
    status: stepResults.length === 0 ? 'unavailable' : anyFailed ? 'failed' : 'completed',
    message:
      stepResults.length === 0
        ? "I couldn't find a matching tool for that request."
        : demo
          ? 'Demo Mode — command simulated.'
          : anyFailed
            ? `Stopped after ${stepResults.length} of ${plan.steps.length} step${plan.steps.length === 1 ? '' : 's'}.`
            : `Executed ${stepResults.length} tool${stepResults.length === 1 ? '' : 's'}.`,
    demo,
    stepResults,
    conversationReply: null,
    latencyMs: Date.now() - start,
    suggestions: suggestionsFor(plan),
  };
}
