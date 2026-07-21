import type { RegisterSkillInput, SkillDefinition, SkillFilter } from '../types';
import { SkillError } from '../errors';

let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `skill_${Date.now()}_${idCounter}`;
}

export interface SkillRegistry {
  register(input: RegisterSkillInput): SkillDefinition;
  unregister(key: string): void;
  deactivate(key: string): void;
  activate(key: string): void;
  get(key: string, organizationId?: string | null): SkillDefinition;
  find(filter: SkillFilter): SkillDefinition[];
  exists(key: string, organizationId?: string | null): boolean;
  /** Applies persisted metadata (currently just `isActive`) to a skill already registered from
   *  code — mirrors the Tool Registry's own `hydrate()` discipline (DEC-027): never fabricates a
   *  runnable skill from a database row with no `buildPlan`. */
  applyPersistedState(key: string, organizationId: string | null, isActive: boolean): void;
}

export function createSkillRegistry(): SkillRegistry {
  const skillsByKey = new Map<string, SkillDefinition>();

  function scopedKey(key: string, organizationId?: string | null): string {
    return `${organizationId ?? 'global'}::${key}`;
  }

  return {
    register(input: RegisterSkillInput): SkillDefinition {
      const sk = scopedKey(input.key, input.organizationId ?? null);
      if (skillsByKey.has(sk)) throw SkillError.duplicateKey(input.key);

      const skill: SkillDefinition = {
        id: generateId(),
        key: input.key,
        name: input.name,
        description: input.description,
        category: input.category,
        requiredTools: input.requiredTools,
        requiredPermission: input.requiredPermission,
        inputs: input.inputs,
        outputs: input.outputs,
        verificationMethod: input.verificationMethod,
        keywords: input.keywords,
        buildPlan: input.buildPlan,
        organizationId: input.organizationId ?? null,
        isActive: true,
        version: input.version ?? '1.0.0',
        registeredAt: Date.now(),
      };

      skillsByKey.set(sk, skill);
      return skill;
    },

    unregister(key: string): void {
      skillsByKey.delete(scopedKey(key));
    },

    deactivate(key: string): void {
      const skill = skillsByKey.get(scopedKey(key));
      if (!skill) throw SkillError.notFound(key);
      skill.isActive = false;
    },

    activate(key: string): void {
      const skill = skillsByKey.get(scopedKey(key));
      if (!skill) throw SkillError.notFound(key);
      skill.isActive = true;
    },

    get(key: string, organizationId?: string | null): SkillDefinition {
      const skill = skillsByKey.get(scopedKey(key, organizationId ?? null)) ?? skillsByKey.get(scopedKey(key));
      if (!skill) throw SkillError.notFound(key);
      return skill;
    },

    find(filter: SkillFilter): SkillDefinition[] {
      return Array.from(skillsByKey.values()).filter((s) => {
        if (filter.organizationId !== undefined && s.organizationId !== filter.organizationId && s.organizationId !== null) return false;
        if (filter.category && s.category !== filter.category) return false;
        if (filter.isActive !== undefined && s.isActive !== filter.isActive) return false;
        if (filter.search) {
          const q = filter.search.toLowerCase();
          if (!s.name.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q) && !s.keywords.some((k) => k.includes(q))) return false;
        }
        return true;
      });
    },

    exists(key: string, organizationId?: string | null): boolean {
      return skillsByKey.has(scopedKey(key, organizationId ?? null)) || skillsByKey.has(scopedKey(key));
    },

    applyPersistedState(key: string, organizationId: string | null, isActive: boolean): void {
      const skill = skillsByKey.get(scopedKey(key, organizationId));
      if (skill) skill.isActive = isActive;
    },
  };
}
