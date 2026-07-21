import type { SkillFilter, SkillMatch } from '../types';
import type { SkillRegistry } from '../registry/skill-registry';

/**
 * Ranks registered, active skills against free text — the "search available skills, select the
 * best ones" step the mission asked for, done for real: every match is scored by how many of a
 * skill's own `keywords` actually appear in the query, so the ranking is a direct, inspectable
 * function of data the skill declared about itself, not a black box.
 */
export function createSkillDiscovery(registry: SkillRegistry) {
  return {
    discover(query: string, filter: SkillFilter = {}): SkillMatch[] {
      const q = query.toLowerCase();
      const candidates = registry.find({ ...filter, isActive: filter.isActive ?? true });

      const matches: SkillMatch[] = [];
      for (const skill of candidates) {
        const score = skill.keywords.reduce((acc, kw) => (q.includes(kw.toLowerCase()) ? acc + 1 : acc), 0);
        if (score > 0) matches.push({ skill, score });
      }

      return matches.sort((a, b) => b.score - a.score);
    },
  };
}

export type SkillDiscovery = ReturnType<typeof createSkillDiscovery>;
