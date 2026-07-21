import type { ToolAccessContext, ToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types';
import type { ToolAccessLayer } from '../permissions/tool-access';
import type { ToolValidator } from '../validation/tool-validator';
import { ToolError } from '../errors';
import { logger } from '@/lib/logger';

const DEFAULT_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, toolName: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(ToolError.timeout(toolName, timeoutMs));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export interface ToolExecutor {
  execute<TOutput = unknown>(
    tool: ToolDefinition,
    input: Record<string, unknown>,
    accessContext: ToolAccessContext,
    executionContext: ToolExecutionContext,
    timeoutMs?: number,
  ): Promise<ToolExecutionResult<TOutput>>;
}

export function createToolExecutor(deps: {
  accessLayer: ToolAccessLayer;
  validator: ToolValidator;
}): ToolExecutor {
  return {
    async execute<TOutput = unknown>(
      tool: ToolDefinition,
      input: Record<string, unknown>,
      accessContext: ToolAccessContext,
      executionContext: ToolExecutionContext,
      timeoutMs: number = DEFAULT_TIMEOUT_MS,
    ): Promise<ToolExecutionResult<TOutput>> {
      const startedAt = Date.now();

      deps.accessLayer.assertExecute(accessContext, tool);

      const validation = deps.validator.validateInput(tool, input);
      if (!validation.valid) {
        throw ToolError.validationFailed(tool.name, [
          ...validation.errors,
          ...validation.missingParameters.map((p) => `Missing required parameter: ${p}`),
        ]);
      }

      if (executionContext.signal?.aborted) {
        throw ToolError.cancelled(tool.name);
      }

      try {
        const rawOutput = await withTimeout(tool.handler(input, executionContext), timeoutMs, tool.name);
        const output = rawOutput as TOutput;

        const durationMs = Date.now() - startedAt;
        logger.info('tool.executor', `Tool executed: ${tool.name} (${durationMs}ms)`);

        return {
          toolName: tool.name,
          success: true,
          output,
          durationMs,
          executedAt: startedAt,
        };
      } catch (error) {
        const durationMs = Date.now() - startedAt;
        const message = error instanceof Error ? error.message : String(error);

        logger.error('tool.executor', `Tool execution failed: ${tool.name}`, { error: message });

        return {
          toolName: tool.name,
          success: false,
          error: message,
          durationMs,
          executedAt: startedAt,
        };
      }
    },
  };
}
