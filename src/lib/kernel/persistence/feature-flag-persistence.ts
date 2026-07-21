import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import type { FeatureFlagManager } from '../types';
import { fireAndForget } from '@/lib/db/persist';
import { logger } from '@/lib/logger';

export interface PersistedFeatureFlagManager extends FeatureFlagManager {
  hydrate(organizationId: string): Promise<number>;
}

export function createPersistedFeatureFlags(
  base: FeatureFlagManager,
  db: PrismaClient,
  organizationId: string,
): PersistedFeatureFlagManager {
  function persist(flag: string, enabled: boolean): void {
    fireAndForget(`feature-flag:${flag}`, async () => {
      const value = { enabled } as unknown as Prisma.InputJsonValue;
      await db.setting.upsert({
        where: { scope_scopeId_key: { scope: 'FEATURE', scopeId: organizationId, key: flag } },
        create: { scope: 'FEATURE', scopeId: organizationId, key: flag, value },
        update: { value },
      });
    });
  }

  return {
    ...base,

    enable(flag: string): void {
      base.enable(flag);
      persist(flag, true);
    },

    disable(flag: string): void {
      base.disable(flag);
      persist(flag, false);
    },

    set(flag: string, enabled: boolean): void {
      base.set(flag, enabled);
      persist(flag, enabled);
    },

    async hydrate(orgId: string): Promise<number> {
      const rows = await db.setting.findMany({ where: { scope: 'FEATURE', scopeId: orgId } });

      for (const row of rows) {
        const value = row.value as { enabled?: boolean } | null;
        base.set(row.key, Boolean(value?.enabled));
      }

      logger.info('feature-flags.persistence', `Hydrated ${rows.length} feature flags from database`);
      return rows.length;
    },
  };
}
