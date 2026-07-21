import type { EventBus } from '@/lib/kernel/types';
import type { ToolDefinition, ToolExecutionResult } from '../types';
import { logger } from '@/lib/logger';

export const TOOL_EVENTS = {
  REGISTERED: 'tool.registered',
  EXECUTED: 'tool.executed',
  EXECUTION_FAILED: 'tool.execution.failed',
  DEACTIVATED: 'tool.deactivated',
} as const;

export interface ToolRegisteredPayload {
  tool: ToolDefinition;
}

export interface ToolExecutedPayload {
  toolName: string;
  result: ToolExecutionResult;
  organizationId: string;
  userId: string;
}

export interface ToolExecutionFailedPayload {
  toolName: string;
  error: string;
  organizationId: string;
  userId: string;
}

export interface ToolDeactivatedPayload {
  toolName: string;
}

export interface ToolEventEmitter {
  emitRegistered(tool: ToolDefinition): Promise<void>;
  emitExecuted(toolName: string, result: ToolExecutionResult, organizationId: string, userId: string): Promise<void>;
  emitExecutionFailed(toolName: string, error: string, organizationId: string, userId: string): Promise<void>;
  emitDeactivated(toolName: string): Promise<void>;
}

export function createToolEventEmitter(eventBus: EventBus): ToolEventEmitter {
  const SOURCE = 'tool-engine';

  async function emit(type: string, payload: unknown): Promise<void> {
    try {
      await eventBus.emit(type, payload, SOURCE);
    } catch (err) {
      logger.error('tool.events', `Failed to emit event: ${type}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    async emitRegistered(tool: ToolDefinition): Promise<void> {
      await emit(TOOL_EVENTS.REGISTERED, { tool } satisfies ToolRegisteredPayload);
    },

    async emitExecuted(
      toolName: string,
      result: ToolExecutionResult,
      organizationId: string,
      userId: string,
    ): Promise<void> {
      await emit(TOOL_EVENTS.EXECUTED, { toolName, result, organizationId, userId } satisfies ToolExecutedPayload);
    },

    async emitExecutionFailed(
      toolName: string,
      error: string,
      organizationId: string,
      userId: string,
    ): Promise<void> {
      await emit(TOOL_EVENTS.EXECUTION_FAILED, {
        toolName,
        error,
        organizationId,
        userId,
      } satisfies ToolExecutionFailedPayload);
    },

    async emitDeactivated(toolName: string): Promise<void> {
      await emit(TOOL_EVENTS.DEACTIVATED, { toolName } satisfies ToolDeactivatedPayload);
    },
  };
}
