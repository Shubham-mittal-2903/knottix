import type { SkillDefinition } from '../types';
import { SkillError } from '../errors';

export interface SkillAccessContext {
  isFounder: boolean;
  permissions: string[];
}

export function createSkillAccessLayer() {
  return {
    canUse(skill: SkillDefinition, ctx: SkillAccessContext): boolean {
      return ctx.isFounder || ctx.permissions.includes(skill.requiredPermission);
    },
    assertCanUse(skill: SkillDefinition, ctx: SkillAccessContext): void {
      if (!ctx.isFounder && !ctx.permissions.includes(skill.requiredPermission)) {
        throw SkillError.accessDenied(skill.key, `Requires permission: ${skill.requiredPermission}`);
      }
    },
  };
}

export type SkillAccessLayer = ReturnType<typeof createSkillAccessLayer>;
