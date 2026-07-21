import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import type { AgentRegistry } from '../registry/agent-registry';
import type { AgentDefinition, RegisterAgentInput } from '../types';
import { fireAndForget } from '@/lib/db/persist';
import { logger } from '@/lib/logger';

export interface PersistedAgentRegistry extends AgentRegistry {
  hydrate(organizationId: string): Promise<number>;
}

/**
 * Only the static agent definition is persisted. `AgentDefinition.status` is a transient
 * in-process execution lifecycle (registered/initializing/ready/running/stopped/error) and is
 * never written to or restored from the database — every hydrated agent starts fresh at
 * 'registered' and goes through the normal lifecycle on first invocation after boot.
 */
export function createPersistedAgentRegistry(base: AgentRegistry, db: PrismaClient): PersistedAgentRegistry {
  function persist(agent: AgentDefinition): void {
    if (!agent.organizationId) {
      logger.warn('agent.persistence', `Skipping persistence for global agent (no organizationId): ${agent.key}`);
      return;
    }

    const organizationId = agent.organizationId;

    fireAndForget(`agent:${agent.key}`, async () => {
      const shared = {
        name: agent.name,
        description: agent.description,
        model: agent.model ?? 'claude-sonnet-4-5',
        maxTokens: agent.maxTokens ?? 4096,
        temperature: agent.temperature ?? 0.7,
        tools: agent.allowedTools as unknown as Prisma.InputJsonValue,
        capabilities: agent.capabilities,
        permission: agent.permission,
        promptKey: agent.promptKey,
      };

      await db.aIAgent.upsert({
        where: { organizationId_key: { organizationId, key: agent.key } },
        create: { organizationId, key: agent.key, contextSources: [], modules: [], allowedRoles: [], ...shared },
        update: shared,
      });
    });
  }

  return {
    ...base,

    register(input: RegisterAgentInput): AgentDefinition {
      const agent = base.register(input);
      persist(agent);
      return agent;
    },

    async hydrate(organizationId: string): Promise<number> {
      const rows = await db.aIAgent.findMany({ where: { organizationId, status: 'ACTIVE' } });

      for (const row of rows) {
        if (base.exists(row.key, organizationId)) continue;

        const agent: AgentDefinition = {
          id: row.id,
          key: row.key,
          name: row.name,
          description: row.description ?? '',
          capabilities: row.capabilities as AgentDefinition['capabilities'],
          permission: row.permission,
          promptKey: row.promptKey ?? '',
          model: row.model,
          allowedTools: (row.tools as string[] | null) ?? [],
          maxTokens: row.maxTokens,
          temperature: row.temperature,
          organizationId: row.organizationId,
          status: 'registered',
          version: '1.0.0',
          registeredAt: row.createdAt.getTime(),
        };

        base.seed(agent);
      }

      logger.info('agent.persistence', `Hydrated ${rows.length} agent definitions from database`);
      return rows.length;
    },
  };
}
