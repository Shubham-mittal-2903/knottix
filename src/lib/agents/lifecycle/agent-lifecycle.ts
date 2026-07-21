import type { AgentDefinition, AgentLifecycleStatus } from '../types';
import type { AgentRegistry } from '../registry/agent-registry';
import { AgentError } from '../errors';

const VALID_TRANSITIONS: Record<AgentLifecycleStatus, AgentLifecycleStatus[]> = {
  registered: ['initializing', 'error'],
  initializing: ['ready', 'error'],
  ready: ['running', 'stopped', 'error'],
  running: ['ready', 'error', 'stopped'],
  stopped: ['initializing'],
  error: ['initializing', 'stopped'],
};

export interface AgentLifecycleManager {
  transition(agentId: string, to: AgentLifecycleStatus): AgentDefinition;
  canTransition(from: AgentLifecycleStatus, to: AgentLifecycleStatus): boolean;
}

export function createAgentLifecycleManager(registry: AgentRegistry): AgentLifecycleManager {
  return {
    canTransition(from: AgentLifecycleStatus, to: AgentLifecycleStatus): boolean {
      return VALID_TRANSITIONS[from]?.includes(to) ?? false;
    },

    transition(agentId: string, to: AgentLifecycleStatus): AgentDefinition {
      const agent = registry.getById(agentId);

      if (!this.canTransition(agent.status, to)) {
        throw AgentError.invalidState(agent.key, agent.status, to);
      }

      return registry.updateStatus(agentId, to);
    },
  };
}
