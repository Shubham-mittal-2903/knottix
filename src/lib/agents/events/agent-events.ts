import type { EventBus } from '@/lib/kernel/types';
import type { AgentDefinition, AgentExecutionResult, AgentLifecycleStatus } from '../types';
import { logger } from '@/lib/logger';

export const AGENT_EVENTS = {
  REGISTERED: 'agent.registered',
  LIFECYCLE_CHANGED: 'agent.lifecycle.changed',
  EXECUTION_STARTED: 'agent.execution.started',
  EXECUTION_COMPLETED: 'agent.execution.completed',
  EXECUTION_FAILED: 'agent.execution.failed',
} as const;

export interface AgentRegisteredPayload {
  agent: AgentDefinition;
}

export interface AgentLifecycleChangedPayload {
  agentKey: string;
  from: AgentLifecycleStatus;
  to: AgentLifecycleStatus;
}

export interface AgentExecutionStartedPayload {
  agentKey: string;
  requestId: string;
  organizationId: string;
  userId: string;
}

export interface AgentExecutionCompletedPayload {
  agentKey: string;
  result: AgentExecutionResult;
  organizationId: string;
  userId: string;
}

export interface AgentExecutionFailedPayload {
  agentKey: string;
  error: string;
  organizationId: string;
  userId: string;
}

export interface AgentEventEmitter {
  emitRegistered(agent: AgentDefinition): Promise<void>;
  emitLifecycleChanged(agentKey: string, from: AgentLifecycleStatus, to: AgentLifecycleStatus): Promise<void>;
  emitExecutionStarted(agentKey: string, requestId: string, organizationId: string, userId: string): Promise<void>;
  emitExecutionCompleted(
    agentKey: string,
    result: AgentExecutionResult,
    organizationId: string,
    userId: string,
  ): Promise<void>;
  emitExecutionFailed(agentKey: string, error: string, organizationId: string, userId: string): Promise<void>;
}

export function createAgentEventEmitter(eventBus: EventBus): AgentEventEmitter {
  const SOURCE = 'agent-framework';

  async function emit(type: string, payload: unknown): Promise<void> {
    try {
      await eventBus.emit(type, payload, SOURCE);
    } catch (err) {
      logger.error('agent.events', `Failed to emit event: ${type}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    async emitRegistered(agent: AgentDefinition): Promise<void> {
      await emit(AGENT_EVENTS.REGISTERED, { agent } satisfies AgentRegisteredPayload);
    },

    async emitLifecycleChanged(agentKey: string, from: AgentLifecycleStatus, to: AgentLifecycleStatus): Promise<void> {
      await emit(AGENT_EVENTS.LIFECYCLE_CHANGED, { agentKey, from, to } satisfies AgentLifecycleChangedPayload);
    },

    async emitExecutionStarted(
      agentKey: string,
      requestId: string,
      organizationId: string,
      userId: string,
    ): Promise<void> {
      await emit(AGENT_EVENTS.EXECUTION_STARTED, {
        agentKey,
        requestId,
        organizationId,
        userId,
      } satisfies AgentExecutionStartedPayload);
    },

    async emitExecutionCompleted(
      agentKey: string,
      result: AgentExecutionResult,
      organizationId: string,
      userId: string,
    ): Promise<void> {
      await emit(AGENT_EVENTS.EXECUTION_COMPLETED, {
        agentKey,
        result,
        organizationId,
        userId,
      } satisfies AgentExecutionCompletedPayload);
    },

    async emitExecutionFailed(
      agentKey: string,
      error: string,
      organizationId: string,
      userId: string,
    ): Promise<void> {
      await emit(AGENT_EVENTS.EXECUTION_FAILED, {
        agentKey,
        error,
        organizationId,
        userId,
      } satisfies AgentExecutionFailedPayload);
    },
  };
}
