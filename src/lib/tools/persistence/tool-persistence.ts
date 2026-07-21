import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import type { ToolRegistry } from '../registry/tool-registry';
import type { RegisterToolInput, ToolCategory, ToolDefinition } from '../types';
import { fireAndForget } from '@/lib/db/persist';
import { logger } from '@/lib/logger';

export interface PersistedToolRegistry extends ToolRegistry {
  hydrate(organizationId?: string | null): Promise<number>;
}

type DbToolCategory = 'DATA' | 'COMMUNICATION' | 'ANALYSIS' | 'AUTOMATION' | 'SYSTEM' | 'INTEGRATION' | 'UTILITY';

function categoryToDb(category: ToolCategory): DbToolCategory {
  return category.toUpperCase() as DbToolCategory;
}

export function createPersistedToolRegistry(
  base: ToolRegistry,
  db: PrismaClient,
  organizationId: string | null = null,
): PersistedToolRegistry {
  function persist(tool: ToolDefinition): void {
    fireAndForget(`tool:${tool.name}`, async () => {
      const shared = {
        description: tool.description,
        category: categoryToDb(tool.category),
        parameters: tool.parameters as unknown as Prisma.InputJsonValue,
        permission: tool.permission,
        metadata: tool.metadata as unknown as Prisma.InputJsonValue,
        version: tool.version,
        isActive: tool.isActive,
      };

      const existing = await db.aITool.findFirst({ where: { organizationId, name: tool.name }, select: { id: true } });
      if (existing) {
        await db.aITool.update({ where: { id: existing.id }, data: shared });
      } else {
        await db.aITool.create({ data: { organizationId, name: tool.name, ...shared } });
      }
    });
  }

  return {
    ...base,

    register(input: RegisterToolInput): ToolDefinition {
      const tool = base.register(input);
      persist(tool);
      return tool;
    },

    deactivate(name: string): void {
      base.deactivate(name);
      persist(base.get(name));
    },

    activate(name: string): void {
      base.activate(name);
      persist(base.get(name));
    },

    async hydrate(orgId: string | null = organizationId): Promise<number> {
      const rows = await db.aITool.findMany({ where: { organizationId: orgId } });

      let applied = 0;
      for (const row of rows) {
        if (base.exists(row.name)) {
          base.applyPersistedState(row.name, row.isActive);
          applied += 1;
        }
      }

      logger.info(
        'tool.persistence',
        `Applied persisted activation state for ${applied}/${rows.length} tools (handlers must be registered in code at boot; DB stores metadata + isActive only)`,
      );
      return applied;
    },
  };
}
