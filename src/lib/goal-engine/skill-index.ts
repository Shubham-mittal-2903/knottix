import { createSkillAccessLayer, createSkillDiscovery, createSkillEngine, createSkillRegistry } from '@/lib/skills';
import type { SkillEngine } from '@/lib/skills';
import { registerCoreSkills } from '@/lib/skills/catalog/register-all';

/**
 * A standalone, in-memory, database-free `SkillEngine` used ONLY for planning-time discovery
 * (`skillIndex.discover(clause)`). It registers the exact same code-defined catalog
 * (`registerCoreSkills`) that the real, org-scoped, DB-persisted `system.skillEngine` also
 * registers via `ensureOrganizationReady` — discovery is a pure function of that catalog, so both
 * Demo Mode and real mode can safely share this one instance for matching without either path
 * touching a database. Execution-time concerns (persisted `isActive` overrides, real usage stats)
 * only ever come from `system.skillEngine`, never from here.
 *
 * Anchored to `globalThis`, not a bare module-level `const` — Next.js dev mode (Turbopack) can
 * re-instantiate a route's module graph independently per route file (the same risk documented in
 * IDEA-043 for the Demo Mode goal-execution store), which would otherwise silently give different
 * API routes different skill catalogs.
 */
const globalForSkillIndex = globalThis as unknown as { __knottixSkillIndex?: SkillEngine };

export function getSkillIndex(): SkillEngine {
  if (!globalForSkillIndex.__knottixSkillIndex) {
    const registry = createSkillRegistry();
    const engine = createSkillEngine({
      registry,
      discovery: createSkillDiscovery(registry),
      accessLayer: createSkillAccessLayer(),
    });
    registerCoreSkills(engine);
    globalForSkillIndex.__knottixSkillIndex = engine;
  }
  return globalForSkillIndex.__knottixSkillIndex;
}
