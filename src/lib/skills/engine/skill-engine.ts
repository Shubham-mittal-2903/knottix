import type { RegisterSkillInput, SkillDefinition, SkillFilter, SkillMatch } from '../types';
import type { SkillRegistry } from '../registry/skill-registry';
import type { SkillDiscovery } from '../discovery/skill-discovery';
import type { SkillAccessContext, SkillAccessLayer } from '../permissions/skill-access';
import { logger } from '@/lib/logger';

export interface SkillEngine {
  register(input: RegisterSkillInput): SkillDefinition;
  get(key: string, organizationId?: string | null): SkillDefinition;
  find(filter: SkillFilter): SkillDefinition[];
  discover(query: string, filter?: SkillFilter): SkillMatch[];
  canUse(skill: SkillDefinition, ctx: SkillAccessContext): boolean;
  assertCanUse(skill: SkillDefinition, ctx: SkillAccessContext): void;
  deactivate(key: string): void;
  activate(key: string): void;
}

export function createSkillEngine(deps: {
  registry: SkillRegistry;
  discovery: SkillDiscovery;
  accessLayer: SkillAccessLayer;
}): SkillEngine {
  return {
    register(input: RegisterSkillInput): SkillDefinition {
      const skill = deps.registry.register(input);
      logger.info('skill.engine', `Skill registered: ${skill.key}`);
      return skill;
    },
    get(key: string, organizationId?: string | null): SkillDefinition {
      return deps.registry.get(key, organizationId);
    },
    find(filter: SkillFilter): SkillDefinition[] {
      return deps.registry.find(filter);
    },
    discover(query: string, filter?: SkillFilter): SkillMatch[] {
      return deps.discovery.discover(query, filter);
    },
    canUse(skill: SkillDefinition, ctx: SkillAccessContext): boolean {
      return deps.accessLayer.canUse(skill, ctx);
    },
    assertCanUse(skill: SkillDefinition, ctx: SkillAccessContext): void {
      deps.accessLayer.assertCanUse(skill, ctx);
    },
    deactivate(key: string): void {
      deps.registry.deactivate(key);
    },
    activate(key: string): void {
      deps.registry.activate(key);
    },
  };
}
