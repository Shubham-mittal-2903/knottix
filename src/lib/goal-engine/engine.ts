import type { SessionUser } from '@/types';
import type { WorkflowContext, WorkflowExecutionState, WorkflowStepDefinition } from '@/lib/workflows';
import { CONFIRMATION_REQUIRED_TOOLS } from '@/lib/command-center/router';
import { isDemoMode } from '@/lib/demo';
import { buildIntelligenceContext } from '@/lib/system/request-context';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { planGoal, planGoalHeuristic } from './planner';
import { recallGoalHistory, recordGoalOutcome } from './memory';
import { collectContext, renderContextBlock, recordContextUsage } from '@/lib/context-engine';
import type { ContextCollectionResult, ContextItem } from '@/lib/context-engine/types';
import type { GoalExecutionSummary, GoalPlan, GoalStepArtifactHint, GoalStepSummary } from './types';

/** Prepends the collected context block to every 'agent' step's input — the concrete, real payoff
 *  of context collection: an AI Employee reasoning over a goal gets grounded in what Knottix
 *  already knows (real projects/tasks/memory/GitHub/session history), not just the raw goal text.
 *  'tool' steps are untouched — they take structured params, not free text. */
function enrichAgentSteps(steps: WorkflowStepDefinition[], contextBlock: string): WorkflowStepDefinition[] {
  if (!contextBlock) return steps;
  return steps.map((step) => {
    if (step.type !== 'agent') return step;
    const config = step.config as { agentKey: string; input: string };
    return { ...step, config: { ...config, input: `${contextBlock}\n\n${config.input}` } };
  });
}

/** Real, not fabricated: only ever returns a hint when the step's actual output object has a
 *  `.path`/`.url` string field, or its raw text output contains git's own commit-hash line
 *  (`[branch abc1234] message`) — the exact format `git commit` prints on success. A step with no
 *  such field produces no artifact, honestly. */
function extractArtifact(output: unknown): GoalStepArtifactHint | null {
  if (!output || typeof output !== 'object') return null;
  const record = output as Record<string, unknown>;

  if (typeof record.path === 'string' && record.path) {
    const isScreenshot = record.path.toLowerCase().includes('screenshot');
    return { type: isScreenshot ? 'screenshot' : 'file', value: record.path };
  }
  if (typeof record.url === 'string' && record.url) {
    return { type: 'url', value: record.url };
  }
  if (typeof record.output === 'string') {
    const commitMatch = record.output.match(/\[[\w/-]+\s+([0-9a-f]{7,40})\]/i);
    if (commitMatch) return { type: 'commit', value: commitMatch[1] };
  }
  return null;
}

function summarizeOutput(output: unknown): string | null {
  if (output === undefined || output === null) return null;
  if (typeof output === 'string') return output.slice(0, 400);
  if (typeof output === 'object') {
    const record = output as Record<string, unknown>;
    if (typeof record.message === 'string') return record.message.slice(0, 400);
    if (typeof record.content === 'string') return record.content.slice(0, 400);
    if (typeof record.output === 'string') return record.output.slice(0, 400);
    try {
      return JSON.stringify(output).slice(0, 400);
    } catch {
      return null;
    }
  }
  return String(output).slice(0, 400);
}

function toStepSummary(r: WorkflowExecutionState['stepResults'][number]): GoalStepSummary {
  return {
    id: r.stepId,
    name: r.stepName,
    type: r.stepType,
    status: r.status,
    attempts: r.attempts ?? 1,
    summary: r.status === 'failed' ? null : summarizeOutput(r.output),
    error: r.error ?? null,
    artifact: r.status === 'completed' ? extractArtifact(r.output) : null,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
  };
}

function toSummary(goal: string, templateName: string, totalSteps: number, state: WorkflowExecutionState): GoalExecutionSummary {
  const skillKeys = Array.isArray(state.variables.__skillKeys) ? (state.variables.__skillKeys as string[]) : [];
  const contextUsed = Array.isArray(state.variables.__contextUsed) ? (state.variables.__contextUsed as ContextItem[]) : [];
  return {
    executionId: state.executionId,
    goal,
    templateName,
    skillKeys,
    status: state.status,
    currentStepId: state.currentStepId,
    steps: state.stepResults.map(toStepSummary),
    totalSteps,
    demo: false,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    error: state.error,
    message: null,
    contextUsed,
  };
}

function unsupportedSummary(plan: GoalPlan): GoalExecutionSummary {
  const now = Date.now();
  return {
    executionId: null,
    goal: plan.goal,
    templateName: plan.templateName,
    skillKeys: [],
    status: 'UNSUPPORTED',
    currentStepId: null,
    steps: [],
    totalSteps: 0,
    demo: isDemoMode(),
    startedAt: now,
    completedAt: now,
    error: null,
    message: plan.unsupportedReason,
    contextUsed: [],
  };
}

// --- Demo Mode: an in-memory, pausable simulation so the Confirmation Card and Live Execution
// Panel can be exercised end-to-end without ever touching a real tool — mirrors DEC-038's
// requirement that the confirmation gate holds identically in Demo Mode and real mode, now
// extended to a multi-step goal instead of a single command.
interface DemoGoalState {
  summary: GoalExecutionSummary;
  remaining: WorkflowStepDefinition[];
}

// Anchored to `globalThis` (not a bare module-level `const`) — Next.js dev mode (Turbopack) can
// re-instantiate a route's module graph independently per route FILE, which would otherwise give
// `/api/goals` and `/api/goals/[executionId]/confirm` two different `Map` instances and break
// resume entirely. `globalThis` is the one thing guaranteed to be the same object across every
// module instantiation in one Node process — the identical fix Prisma's own Next.js integration
// guide uses to prevent duplicate clients under HMR.
const globalForGoalEngine = globalThis as unknown as { __knottixDemoGoalExecutions?: Map<string, DemoGoalState> };
const demoExecutions = (globalForGoalEngine.__knottixDemoGoalExecutions ??= new Map<string, DemoGoalState>());

function demoStepSummary(s: WorkflowStepDefinition, status: GoalStepSummary['status']): GoalStepSummary {
  const now = Date.now();
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    status,
    attempts: 1,
    summary: status === 'completed' ? 'Demo Mode — simulated, nothing was actually executed.' : null,
    error: null,
    artifact: null,
    startedAt: now,
    completedAt: status === 'waiting_confirmation' ? null : now,
  };
}

function runDemoSteps(
  goal: string,
  templateName: string,
  skillKeys: string[],
  totalSteps: number,
  remaining: WorkflowStepDefinition[],
  priorSteps: GoalStepSummary[],
): DemoGoalState {
  const steps = [...priorSteps];
  let index = 0;
  for (; index < remaining.length; index += 1) {
    const s = remaining[index];
    const toolName = (s.config as { toolName?: string }).toolName;
    if (typeof toolName === 'string' && CONFIRMATION_REQUIRED_TOOLS.has(toolName)) {
      steps.push(demoStepSummary(s, 'waiting_confirmation'));
      const summary: GoalExecutionSummary = {
        executionId: '',
        goal,
        templateName,
        skillKeys,
        status: 'WAITING_CONFIRMATION',
        currentStepId: s.id,
        steps,
        totalSteps,
        demo: true,
        startedAt: Date.now(),
        completedAt: null,
        error: null,
        message: null,
        contextUsed: [],
      };
      return { summary, remaining: remaining.slice(index + 1) };
    }
    steps.push(demoStepSummary(s, 'completed'));
  }

  const summary: GoalExecutionSummary = {
    executionId: '',
    goal,
    templateName,
    skillKeys,
    status: 'COMPLETED',
    currentStepId: null,
    steps,
    totalSteps,
    demo: true,
    startedAt: Date.now(),
    completedAt: Date.now(),
    error: null,
    message: null,
    contextUsed: [],
  };
  return { summary, remaining: [] };
}

function generateExecutionId(): string {
  return `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function startDemoGoal(plan: GoalPlan): Promise<GoalExecutionSummary> {
  const executionId = generateExecutionId();
  const state = runDemoSteps(plan.goal, plan.templateName, plan.skillKeys, plan.steps.length, plan.steps, []);
  state.summary.executionId = executionId;
  demoExecutions.set(executionId, state);
  return state.summary;
}

function resumeDemoGoal(executionId: string, confirm: boolean): GoalExecutionSummary {
  const existing = demoExecutions.get(executionId);
  if (!existing) throw AppError.notFound('Goal execution', executionId);

  if (!confirm) {
    const steps = existing.summary.steps.map((s) => (s.status === 'waiting_confirmation' ? { ...s, status: 'failed' as const, error: 'User declined confirmation.', completedAt: Date.now() } : s));
    const summary: GoalExecutionSummary = { ...existing.summary, steps, status: 'FAILED', error: 'User declined a required confirmation.', completedAt: Date.now() };
    demoExecutions.set(executionId, { summary, remaining: [] });
    return summary;
  }

  const priorSteps = existing.summary.steps.map((s) => (s.status === 'waiting_confirmation' ? { ...s, status: 'completed' as const, summary: 'Demo Mode — simulated, nothing was actually executed.', completedAt: Date.now() } : s));
  const next = runDemoSteps(existing.summary.goal, existing.summary.templateName, existing.summary.skillKeys, existing.summary.totalSteps, existing.remaining, priorSteps);
  next.summary.executionId = executionId;
  demoExecutions.set(executionId, next);
  return next.summary;
}

// --- Real execution ---

export async function startGoal(goal: string, user: SessionUser): Promise<GoalExecutionSummary> {
  // Demo Mode must never call `buildIntelligenceContext` — it resolves a real Organization/
  // Workspace via Prisma, which this sandboxed/no-database environment (and any demo deployment)
  // doesn't have. Planning uses the pure heuristic path only; no AI call, no database read.
  if (isDemoMode()) {
    const plan = planGoalHeuristic(goal);
    if (plan.kind === 'unsupported') return unsupportedSummary(plan);
    return startDemoGoal(plan);
  }

  const { system, context } = await buildIntelligenceContext(user, 'goal-engine');

  const plan = await planGoal(goal, {
    platform: system.intelligence,
    aiRuntime: system.aiRuntime,
    organizationId: user.organizationId,
    userId: user.id,
    skillEngine: system.skillEngine,
  });

  const history = await recallGoalHistory(system.memoryEngine, context, user, plan.skillKeys);
  if (history.succeeded > 0 || history.failed > 0) {
    plan.reasoning += ` (These skills have run before: ${history.succeeded} succeeded, ${history.failed} failed.)`;
  }

  if (plan.kind === 'unsupported') {
    return unsupportedSummary(plan);
  }

  // Context Collection — real data from Memory/Knowledge/Projects/Tasks/Meetings/Documents/
  // GitHub/Task Sessions/Workflow History/Skill History/Artifacts/Browser/Desktop, ranked, and
  // folded into every 'agent' step's input before execution starts. Runs after skill selection
  // (not strictly before, as the mission's own pipeline diagram shows) because there is no value
  // in collecting context for a goal that turned out `unsupported` — but always before any step
  // actually executes.
  const contextResult = await collectContext(goal, user);
  const contextBlock = renderContextBlock(contextResult.selected);
  const enrichedSteps = enrichAgentSteps(plan.steps, contextBlock);

  const workflowKey = generateExecutionId();
  system.intelligence.workflows.create({
    key: workflowKey,
    name: plan.templateName,
    description: plan.goal,
    steps: enrichedSteps,
    startStepId: plan.startStepId,
    organizationId: user.organizationId,
    createdBy: user.id,
  });

  const workflowContext: WorkflowContext = {
    requestId: context.requestId,
    organizationId: user.organizationId,
    workspaceId: user.workspaceId,
    userId: user.id,
    variables: {},
    accessContext: { isFounder: user.isFounder, permissions: user.permissions },
    intelligenceContext: context,
  };

  const state = await system.intelligence.workflows.execute({
    workflowKey,
    organizationId: user.organizationId,
    context: workflowContext,
    // Stashed so `workflow-persistence.ts` can include it in the execution's persisted metadata —
    // `__skillKeys` is what `getSkillStats()` needs to attribute a real, finished execution back
    // to the skill(s) it composed (Skill Registry); `__contextUsed` is what `toSummary()` reads
    // back to populate `GoalExecutionSummary.contextUsed` for the Context Inspector.
    initialVariables: { __skillKeys: plan.skillKeys, __contextUsed: contextResult.selected },
  });

  if (state.status === 'COMPLETED' || state.status === 'FAILED') {
    await recordGoalOutcome(system.memoryEngine, context, user, plan, state);
    await recordContextUsage(contextResult, state.status === 'COMPLETED' ? 'succeeded' : 'failed', user);
  }

  return toSummary(plan.goal, plan.templateName, plan.steps.length, state);
}

export async function resumeGoal(executionId: string, confirm: boolean, user: SessionUser): Promise<GoalExecutionSummary> {
  if (demoExecutions.has(executionId)) {
    return resumeDemoGoal(executionId, confirm);
  }

  const { system, context } = await buildIntelligenceContext(user, 'goal-engine');
  // Only actually used if the in-memory paused execution was lost (e.g. a server restart) — see
  // `WorkflowExecutor.resume()`'s rehydration path. Real session recovery: this is what lets a
  // Task Session's paused goal survive a restart and still be resumable.
  const rehydrationContext: WorkflowContext = {
    requestId: context.requestId,
    organizationId: user.organizationId,
    workspaceId: user.workspaceId,
    userId: user.id,
    variables: {},
    accessContext: { isFounder: user.isFounder, permissions: user.permissions },
    intelligenceContext: context,
  };
  const state = await system.intelligence.workflows.resume(executionId, confirm, rehydrationContext);
  const workflow = system.intelligence.workflows.getById(state.workflowId);

  if (state.status === 'COMPLETED' || state.status === 'FAILED') {
    logger.info('goal-engine.engine', `Goal execution finished after resume: ${executionId} (${state.status})`);
    const skillKeys = Array.isArray(state.variables.__skillKeys) ? (state.variables.__skillKeys as string[]) : [];
    const plan: GoalPlan = {
      goal: workflow.description,
      kind: 'skill-composed',
      skillKeys,
      templateName: workflow.name,
      reasoning: '',
      steps: workflow.steps,
      startStepId: workflow.startStepId,
      requiresConfirmation: false,
      unsupportedReason: null,
      classifiedBy: 'heuristic',
    };
    await recordGoalOutcome(system.memoryEngine, context, user, plan, state);
  }

  return toSummary(workflow.description, workflow.name, workflow.steps.length, state);
}

export async function getGoalStatus(executionId: string, user: SessionUser): Promise<GoalExecutionSummary> {
  const demoState = demoExecutions.get(executionId);
  if (demoState) return demoState.summary;

  const { system } = await buildIntelligenceContext(user, 'goal-engine');

  // Real session recovery: after a server restart, the in-memory `WorkflowStateManager` won't
  // have this execution even though it's a real, persisted `WorkflowExecution` row — fall back to
  // a direct database read rather than throwing "not found" for a session that genuinely exists.
  let state;
  try {
    state = system.intelligence.workflows.getExecution(executionId);
  } catch {
    const remote = await system.workflowHistoryStore.getByIdRemote?.(executionId);
    if (!remote) throw AppError.notFound('Goal execution', executionId);
    state = remote;
  }

  const workflow = system.intelligence.workflows.getById(state.workflowId);
  return toSummary(workflow.description, workflow.name, workflow.steps.length, state);
}
