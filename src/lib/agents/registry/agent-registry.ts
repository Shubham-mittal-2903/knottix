import type { AgentDefinition, AgentFilter, RegisterAgentInput } from '../types';
import { AgentError } from '../errors';

let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `agent_${Date.now()}_${idCounter}`;
}

export interface AgentRegistry {
  register(input: RegisterAgentInput): AgentDefinition;
  get(key: string, organizationId?: string | null): AgentDefinition;
  getById(agentId: string): AgentDefinition;
  find(filter: AgentFilter): AgentDefinition[];
  updateStatus(agentId: string, status: AgentDefinition['status']): AgentDefinition;
  exists(key: string, organizationId?: string | null): boolean;
  seed(agent: AgentDefinition): void;
}

export function createAgentRegistry(): AgentRegistry {
  const agentsById = new Map<string, AgentDefinition>();
  const agentsByKey = new Map<string, string>();

  function scopedKey(key: string, organizationId?: string | null): string {
    return `${organizationId ?? 'global'}::${key}`;
  }

  return {
    register(input: RegisterAgentInput): AgentDefinition {
      const sk = scopedKey(input.key, input.organizationId ?? null);
      if (agentsByKey.has(sk)) {
        throw AgentError.duplicateKey(input.key);
      }

      const agent: AgentDefinition = {
        id: generateId(),
        key: input.key,
        name: input.name,
        description: input.description,
        capabilities: input.capabilities,
        permission: input.permission,
        promptKey: input.promptKey,
        model: input.model,
        allowedTools: input.allowedTools ?? [],
        maxTokens: input.maxTokens,
        temperature: input.temperature,
        organizationId: input.organizationId ?? null,
        status: 'registered',
        version: input.version ?? '1.0.0',
        registeredAt: Date.now(),
      };

      agentsById.set(agent.id, agent);
      agentsByKey.set(sk, agent.id);

      return { ...agent };
    },

    get(key: string, organizationId?: string | null): AgentDefinition {
      const sk = scopedKey(key, organizationId ?? null);
      let id = agentsByKey.get(sk);

      if (!id && organizationId) {
        id = agentsByKey.get(scopedKey(key, null));
      }

      if (!id) throw AgentError.agentNotFound(key);

      const agent = agentsById.get(id);
      if (!agent) throw AgentError.agentNotFound(key);

      return { ...agent };
    },

    getById(agentId: string): AgentDefinition {
      const agent = agentsById.get(agentId);
      if (!agent) throw AgentError.agentNotFound(agentId);
      return { ...agent };
    },

    find(filter: AgentFilter): AgentDefinition[] {
      return Array.from(agentsById.values())
        .filter((a) => {
          if (filter.organizationId !== undefined && a.organizationId !== filter.organizationId) return false;
          if (filter.status && a.status !== filter.status) return false;
          if (filter.capability && !a.capabilities.includes(filter.capability)) return false;
          if (filter.search) {
            const lower = filter.search.toLowerCase();
            if (!a.name.toLowerCase().includes(lower) && !a.key.toLowerCase().includes(lower)) return false;
          }
          return true;
        })
        .map((a) => ({ ...a }));
    },

    updateStatus(agentId: string, status: AgentDefinition['status']): AgentDefinition {
      const agent = agentsById.get(agentId);
      if (!agent) throw AgentError.agentNotFound(agentId);
      agent.status = status;
      return { ...agent };
    },

    exists(key: string, organizationId?: string | null): boolean {
      return agentsByKey.has(scopedKey(key, organizationId ?? null));
    },

    seed(agent: AgentDefinition): void {
      agentsById.set(agent.id, { ...agent });
      agentsByKey.set(scopedKey(agent.key, agent.organizationId), agent.id);
    },
  };
}
