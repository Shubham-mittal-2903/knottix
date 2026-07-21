import type { SkillEngine } from '../engine/skill-engine';
import { isSkillError } from '../errors';
import { createDevelopmentSkills } from './development';
import { createBusinessSkills } from './business';
import { createDesktopSkills } from './desktop';
import { createBrowserSkills } from './browser';

/**
 * Registers every real, code-defined skill — idempotent (swallows DUPLICATE_KEY, the same pattern
 * `registerTools()`/`registerAllAIEmployees()` already use). "Adding a new capability should
 * require only registering a new skill" (the mission's own words): a future session adds one entry
 * to one of the `create*Skills()` arrays above (or a new catalog file) and calls
 * `skillEngine.register()` on it here — nothing else in the Goal Engine, Command Center, or
 * Mission Control needs to change, since the planner discovers skills dynamically (see
 * `goal-engine/planner.ts`).
 */
export function registerCoreSkills(skillEngine: SkillEngine): void {
  const all = [...createDevelopmentSkills(), ...createBusinessSkills(), ...createDesktopSkills(), ...createBrowserSkills()];

  for (const input of all) {
    try {
      skillEngine.register(input);
    } catch (error) {
      if (!(isSkillError(error) && error.code === 'DUPLICATE_KEY')) throw error;
    }
  }
}
