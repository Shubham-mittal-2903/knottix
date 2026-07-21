import type { IntelligencePlatform } from '@/lib/intelligence';
import { isPromptError } from '@/lib/prompt';
import type { SkillDefinition } from '@/lib/skills';

export const GOAL_SKILL_PROMPT_KEY = 'goal-engine-skill-classifier';

/**
 * Registered once (idempotent, same DUPLICATE_KEY-swallowing pattern every other global prompt
 * template uses — see `command-center/prompt.ts`). Unlike the old fixed-template version, the
 * skill list is NOT baked into this static template — it's rendered fresh into `{{skillList}}` on
 * every call from whatever is actually registered right now (`planner.ts`), so a newly-registered
 * skill is immediately selectable by the AI without editing this file. The AI is still constrained
 * to choosing a key from that list — it can never invent a skill that doesn't exist.
 */
export function registerGoalEnginePrompt(platform: IntelligencePlatform): void {
  try {
    platform.prompts.createTemplate({
      key: GOAL_SKILL_PROMPT_KEY,
      name: 'Goal Engine — Skill Classifier',
      description: 'Picks the best-fit registered Skill(s) for a free-text goal, from a live list.',
      category: 'system',
      organizationId: null,
      template: `You are the goal-planning classifier for Knottix's Goal Execution Engine. Given one user goal and a list of currently registered skills, respond with EXACTLY one line: the key(s) of the skill(s) that should run, comma-separated, in execution order — or the single word "none" if nothing fits.

Rules:
- Only use keys from the list below. Never invent a key.
- Most goals need exactly one skill. Only list more than one if the goal genuinely asks for multiple distinct actions.
- Respond with ONLY the key(s), no punctuation beyond commas, no explanation.

Registered skills:
{{skillList}}

Goal: {{goal}}`,
      variables: [
        { name: 'goal', type: 'string', description: 'The raw user goal', required: true },
        { name: 'skillList', type: 'string', description: 'Newline-separated "key — description" list of live registered skills', required: true },
      ],
    });
  } catch (error) {
    if (!(isPromptError(error) && error.code === 'DUPLICATE_KEY')) throw error;
  }
}

export function formatSkillList(skills: SkillDefinition[]): string {
  return skills.map((s) => `${s.key} — ${s.description}`).join('\n');
}

/** Parses the classifier's comma-separated key list; returns null on any malformed/empty response
 *  (including "none") so the caller falls back to the heuristic result. Every returned key is
 *  verified against `validKeys` — a key the AI invented or a currently-inactive skill is dropped
 *  rather than trusted. */
export function parseSkillKeys(raw: string, validKeys: string[]): string[] | null {
  const line = raw.trim().split('\n')[0]?.trim().toLowerCase() ?? '';
  if (!line || line === 'none') return null;

  const validSet = new Set(validKeys.map((k) => k.toLowerCase()));
  const keys = line
    .split(',')
    .map((k) => k.trim())
    .filter((k) => validSet.has(k));

  return keys.length > 0 ? keys : null;
}
