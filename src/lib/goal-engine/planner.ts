import type { WorkflowStepDefinition } from '@/lib/workflows';
import type { IntelligencePlatform } from '@/lib/intelligence';
import type { AIRuntime } from '@/lib/ai';
import type { SkillDefinition, SkillEngine, SkillMatch } from '@/lib/skills';
import { resolveEmployeeForQuery, CONFIRMATION_REQUIRED_TOOLS } from '@/lib/command-center/router';
import { CLAUDE_HAIKU_MODEL } from '@/lib/system/bootstrap';
import { logger } from '@/lib/logger';
import { getSkillIndex } from './skill-index';
import { GOAL_SKILL_PROMPT_KEY, formatSkillList, parseSkillKeys } from './prompt';
import type { GoalPlan } from './types';

/** Capabilities Knottix genuinely has no skill for — checked before skill discovery, so e.g.
 *  "create a logo for our new landing page" is honestly declined rather than partially matching
 *  the website-plan skill and pretending a logo was made. */
const UNSUPPORTED_CAPABILITIES: { keywords: string[]; capability: string }[] = [
  { keywords: ['logo'], capability: 'image or logo generation' },
  { keywords: ['invoice'], capability: 'invoice generation' },
  { keywords: ['presentation', 'slide deck', 'slides for', 'powerpoint'], capability: 'presentation/slide generation' },
];

function checkUnsupported(goal: string): string | null {
  const g = goal.toLowerCase();
  const hit = UNSUPPORTED_CAPABILITIES.find((entry) => entry.keywords.some((kw) => g.includes(kw)));
  return hit ? `Knottix has no ${hit.capability} tool yet, so nothing was executed. Try asking an AI Employee to draft the text/brief for this instead.` : null;
}

function unsupportedPlan(goal: string, reason: string, classifiedBy: GoalPlan['classifiedBy']): GoalPlan {
  return {
    goal,
    kind: 'unsupported',
    skillKeys: [],
    templateName: 'Unsupported',
    reasoning: reason,
    steps: [],
    startStepId: '',
    requiresConfirmation: false,
    unsupportedReason: reason,
    classifiedBy,
  };
}

function generalQuestionPlan(goal: string, classifiedBy: GoalPlan['classifiedBy']): GoalPlan {
  const employee = resolveEmployeeForQuery(goal);
  return {
    goal,
    kind: 'general-question',
    skillKeys: [],
    templateName: `Ask ${employee.name}`,
    reasoning: `"${goal}" didn't match any registered skill — routed to ${employee.name} for a conversational answer.`,
    steps: [{ id: 's1', name: 'Ask AI Employee', type: 'agent', config: { agentKey: employee.key, input: goal } }],
    startStepId: 's1',
    requiresConfirmation: false,
    unsupportedReason: null,
    classifiedBy,
  };
}

function computeRequiresConfirmation(steps: WorkflowStepDefinition[]): boolean {
  return steps.some((s) => {
    const toolName = (s.config as { toolName?: string }).toolName;
    return typeof toolName === 'string' && CONFIRMATION_REQUIRED_TOOLS.has(toolName);
  });
}

function renumber(steps: WorkflowStepDefinition[], prefix: string): WorkflowStepDefinition[] {
  const idMap = new Map(steps.map((s) => [s.id, `${prefix}${s.id}`]));
  return steps.map((s) => ({
    ...s,
    id: idMap.get(s.id) as string,
    onSuccess: s.onSuccess ? idMap.get(s.onSuccess) : undefined,
    onFailure: s.onFailure ? idMap.get(s.onFailure) : undefined,
  }));
}

/**
 * Composes one or more matched skills into a single step graph — "instead of hardcoded templates,
 * the Goal Engine composes plans from registered skills" is implemented literally here: each
 * skill's own `buildPlan()` output is renumbered (so multiple skills' step IDs never collide) and
 * chained in order (the previous skill's terminal step's `onSuccess` points at the next skill's
 * start). A skill that can't build a plan for its matched clause (a required input is missing) is
 * dropped from the composition and named honestly in `reasoning`/`unsupportedReason`, never
 * silently skipped.
 */
function composeFromSkills(goal: string, matches: { clause: string; skill: SkillDefinition }[], classifiedBy: GoalPlan['classifiedBy']): GoalPlan {
  const allSteps: WorkflowStepDefinition[] = [];
  const usedNames: string[] = [];
  const usedKeys: string[] = [];
  const dropped: string[] = [];
  let startStepId = '';
  let lastStepId: string | null = null;

  matches.forEach(({ clause, skill }, index) => {
    const built = skill.buildPlan(clause);
    if (!built) {
      dropped.push(skill.name);
      return;
    }

    const prefix = `sk${index}_`;
    const renumbered = renumber(built.steps, prefix);
    const thisStart = `${prefix}${built.startStepId}`;

    if (!startStepId) startStepId = thisStart;
    if (lastStepId) {
      const lastStep = allSteps.find((s) => s.id === lastStepId);
      if (lastStep && !lastStep.onSuccess) lastStep.onSuccess = thisStart;
    }

    allSteps.push(...renumbered);
    lastStepId = renumbered[renumbered.length - 1]?.id ?? lastStepId;
    usedNames.push(skill.name);
    usedKeys.push(skill.key);
  });

  if (allSteps.length === 0) {
    return unsupportedPlan(
      goal,
      `Matched ${dropped.join(', ')} but couldn't extract the required input from "${goal}" — nothing was executed.`,
      classifiedBy,
    );
  }

  const droppedNote = dropped.length > 0 ? ` Skipped ${dropped.join(', ')} — missing required input.` : '';

  return {
    goal,
    kind: 'skill-composed',
    skillKeys: usedKeys,
    templateName: usedNames.join(' + '),
    reasoning: `Matched skill${usedNames.length === 1 ? '' : 's'}: ${usedNames.join(', ')}.${droppedNote}`,
    steps: allSteps,
    startStepId,
    requiresConfirmation: computeRequiresConfirmation(allSteps),
    unsupportedReason: null,
    classifiedBy,
  };
}

function splitClauses(goal: string): string[] {
  const clauses = goal.split(/\band\b|,|;/i).map((c) => c.trim()).filter(Boolean);
  return clauses.length > 1 ? clauses : [goal.trim()];
}

export interface OrgSkillSource {
  skillEngine: SkillEngine;
  organizationId: string;
}

/** Merges the static, database-free catalog's ranking with an org-scoped `SkillEngine`'s (which,
 *  in real mode, also holds this organization's connected MCP servers' dynamically-registered
 *  tool-skills — see `mcp/skills.ts`) — picks the single best match across BOTH by score, so
 *  "Local Skills and MCP Skills" are genuinely indistinguishable to the planner, not just visually
 *  similar. Always passes an explicit `organizationId` filter to `skillEngine.discover()` — the
 *  Skill Registry is a single process-wide instance shared by every organization (DEC-010), and
 *  omitting the filter would surface every OTHER organization's MCP-derived skills too, not just
 *  this one's. `orgSkills` is undefined in Demo Mode (no database, no MCP connections), so this
 *  degrades to exactly the static-only behavior it always had. */
function discoverBest(clause: string, orgSkills?: OrgSkillSource): SkillMatch | null {
  const staticMatches = getSkillIndex().discover(clause);
  const orgMatches = orgSkills ? orgSkills.skillEngine.discover(clause, { organizationId: orgSkills.organizationId }) : [];
  const combined = [...staticMatches, ...orgMatches].sort((a, b) => b.score - a.score);
  return combined[0] ?? null;
}

/**
 * Pure, deterministic planning by default — "search available skills, select the best ones, build
 * the plan" via the static, database-free catalog (`getSkillIndex().discover()`). This is the ONLY
 * planning path Demo Mode is allowed to use (mirrors `command-center/classify.ts`'s own
 * `isDemoMode()` short-circuit) — called with no second argument. Real mode additionally passes
 * `orgSkills` (this organization's `SkillEngine` + id, which includes any connected MCP servers'
 * tools) so a goal can be composed from local AND external skills in one pass.
 */
export function planGoalHeuristic(goal: string, orgSkills?: OrgSkillSource): GoalPlan {
  const trimmed = goal.trim();
  const unsupportedReason = checkUnsupported(trimmed);
  if (unsupportedReason) return unsupportedPlan(trimmed, unsupportedReason, 'heuristic');

  const clauses = splitClauses(trimmed);

  const matches: { clause: string; skill: SkillDefinition }[] = [];
  for (const clause of clauses) {
    const best = discoverBest(clause, orgSkills);
    if (best) matches.push({ clause, skill: best.skill });
  }

  if (matches.length === 0) return generalQuestionPlan(trimmed, 'heuristic');
  return composeFromSkills(trimmed, matches, 'heuristic');
}

/**
 * Real-mode planner — the heuristic result always runs first, and an optional AI call only ever
 * upgrades skill SELECTION when the heuristic found no match at all (fell through to
 * 'general-question'), mirroring `command-center/classify.ts`'s exact discipline: never in Demo
 * Mode, falls back to the heuristic result on any failure. The AI picks from the SAME live list of
 * currently-registered skill keys `getSkillIndex()` already knows about — it can never cause an
 * unbuilt/fabricated plan to run, and a brand-new skill is immediately eligible with zero prompt
 * changes needed.
 */
export async function planGoal(
  goal: string,
  deps: { platform: IntelligencePlatform; aiRuntime: AIRuntime; organizationId: string; userId: string; skillEngine?: SkillEngine },
): Promise<GoalPlan> {
  const trimmed = goal.trim();
  const orgSkills: OrgSkillSource | undefined = deps.skillEngine
    ? { skillEngine: deps.skillEngine, organizationId: deps.organizationId }
    : undefined;
  const heuristic = planGoalHeuristic(trimmed, orgSkills);

  if (heuristic.kind !== 'general-question') return heuristic;

  try {
    // Combined candidate list for the AI upgrade too — an MCP tool the founder just connected is
    // immediately eligible for AI-assisted selection, the same "future ready" guarantee the static
    // catalog already had (see `prompt.ts`'s live `{{skillList}}`). Explicitly org-filtered for the
    // same cross-tenant reason `discoverBest()` is.
    const activeSkills = [
      ...getSkillIndex().find({ isActive: true }),
      ...(deps.skillEngine?.find({ organizationId: deps.organizationId, isActive: true }) ?? []),
    ];

    const rendered = deps.platform.prompts.render({
      key: GOAL_SKILL_PROMPT_KEY,
      variables: { goal: trimmed, skillList: formatSkillList(activeSkills) },
    });
    const response = await deps.aiRuntime.complete({
      model: CLAUDE_HAIKU_MODEL,
      messages: [
        { role: 'system', content: rendered.content },
        { role: 'user', content: trimmed },
      ],
      temperature: 0,
      maxTokens: 40,
      organizationId: deps.organizationId,
      userId: deps.userId,
      module: 'goal-engine',
    });

    const keys = parseSkillKeys(response.content, activeSkills.map((s) => s.key));
    if (!keys) return heuristic;

    const matches = keys
      .map((key) => activeSkills.find((s) => s.key === key))
      .filter((s): s is SkillDefinition => Boolean(s))
      .map((skill) => ({ clause: trimmed, skill }));

    if (matches.length === 0) return heuristic;
    return composeFromSkills(trimmed, matches, 'ai');
  } catch (error) {
    logger.warn('goal-engine.planner', 'AI skill classification failed, using heuristic fallback', {
      error: error instanceof Error ? error.message : String(error),
    });
    return heuristic;
  }
}
