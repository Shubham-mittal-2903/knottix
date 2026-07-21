import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import type { SkillRegistry } from '../registry/skill-registry';
import type { RegisterSkillInput, SkillCategory, SkillDefinition } from '../types';
import { fireAndForget } from '@/lib/db/persist';
import { logger } from '@/lib/logger';

export interface PersistedSkillRegistry extends SkillRegistry {
  hydrate(organizationId?: string | null): Promise<number>;
}

function categoryToDb(category: SkillCategory): string {
  return category.toUpperCase();
}

/**
 * Metadata-only write-through decorator, the exact same shape as `createPersistedToolRegistry`
 * (DEC-027 point 3) — a skill's `buildPlan` closure can't be serialized, so only its descriptive
 * fields persist to the `Skill` table. `hydrate()` never fabricates a runnable skill from a
 * database row that has no matching code registration.
 */
export function createPersistedSkillRegistry(
  base: SkillRegistry,
  db: PrismaClient,
  organizationId: string | null = null,
): PersistedSkillRegistry {
  function persist(skill: SkillDefinition): void {
    fireAndForget(`skill:${skill.key}`, async () => {
      const shared = {
        name: skill.name,
        description: skill.description,
        category: categoryToDb(skill.category) as never,
        requiredTools: skill.requiredTools as unknown as Prisma.InputJsonValue,
        requiredPermission: skill.requiredPermission,
        inputs: skill.inputs as unknown as Prisma.InputJsonValue,
        outputs: skill.outputs,
        verificationMethod: skill.verificationMethod,
        version: skill.version,
        isActive: skill.isActive,
      };

      const existing = await db.skill.findFirst({ where: { organizationId: skill.organizationId, key: skill.key }, select: { id: true } });
      if (existing) {
        await db.skill.update({ where: { id: existing.id }, data: shared });
      } else {
        await db.skill.create({ data: { organizationId: skill.organizationId, key: skill.key, ...shared } });
      }
    });
  }

  return {
    ...base,

    register(input: RegisterSkillInput): SkillDefinition {
      const skill = base.register(input);
      persist(skill);
      return skill;
    },

    deactivate(key: string): void {
      base.deactivate(key);
      persist(base.get(key));
    },

    activate(key: string): void {
      base.activate(key);
      persist(base.get(key));
    },

    async hydrate(orgId: string | null = organizationId): Promise<number> {
      const rows = await db.skill.findMany({ where: { organizationId: orgId } });

      let applied = 0;
      for (const row of rows) {
        if (base.exists(row.key, orgId)) {
          base.applyPersistedState(row.key, orgId, row.isActive);
          applied += 1;
        }
      }

      logger.info(
        'skill.persistence',
        `Applied persisted activation state for ${applied}/${rows.length} skills (buildPlan must be registered in code at boot; DB stores metadata + isActive only)`,
      );
      return applied;
    },
  };
}
