import type {
  RegisterToolInput,
  ToolAccessContext,
  ToolDefinition,
  ToolDescriptor,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolFilter,
} from '../types';
import type { ToolRegistry } from '../registry/tool-registry';
import type { ToolDiscovery } from '../discovery/tool-discovery';
import type { ToolAccessLayer } from '../permissions/tool-access';
import type { ToolValidator } from '../validation/tool-validator';
import type { ToolExecutor } from '../execution/tool-executor';
import type { ToolEventEmitter } from '../events/tool-events';
import { ToolError } from '../errors';
import { logger } from '@/lib/logger';

export interface ToolEngine {
  register(input: RegisterToolInput): ToolDefinition;
  unregister(name: string): void;
  deactivate(name: string): void;
  activate(name: string): void;
  get(name: string): ToolDefinition;
  discover(filter?: ToolFilter): ToolDefinition[];
  listDescriptors(filter?: ToolFilter): ToolDescriptor[];
  toDescriptor(tool: ToolDefinition): ToolDescriptor;
  execute<TOutput = unknown>(
    name: string,
    input: Record<string, unknown>,
    accessContext: ToolAccessContext,
    executionContext: ToolExecutionContext,
    timeoutMs?: number,
  ): Promise<ToolExecutionResult<TOutput>>;
}

export function createToolEngine(deps: {
  registry: ToolRegistry;
  discovery: ToolDiscovery;
  accessLayer: ToolAccessLayer;
  validator: ToolValidator;
  executor: ToolExecutor;
  events: ToolEventEmitter;
}): ToolEngine {
  return {
    register(input: RegisterToolInput): ToolDefinition {
      const errors = deps.validator.validateDefinition(input.parameters ?? []);
      if (errors.length > 0) {
        throw ToolError.validationFailed(input.name, errors);
      }

      const tool = deps.registry.register(input);
      void deps.events.emitRegistered(tool);
      logger.info('tool.engine', `Tool registered: ${tool.name}`);
      return tool;
    },

    unregister(name: string): void {
      deps.registry.unregister(name);
    },

    deactivate(name: string): void {
      deps.registry.deactivate(name);
      void deps.events.emitDeactivated(name);
    },

    activate(name: string): void {
      deps.registry.activate(name);
    },

    get(name: string): ToolDefinition {
      return deps.registry.get(name);
    },

    discover(filter?: ToolFilter): ToolDefinition[] {
      return deps.discovery.discover(filter);
    },

    listDescriptors(filter?: ToolFilter): ToolDescriptor[] {
      return deps.discovery.listDescriptors(filter);
    },

    toDescriptor(tool: ToolDefinition): ToolDescriptor {
      return deps.discovery.toDescriptor(tool);
    },

    async execute<TOutput = unknown>(
      name: string,
      input: Record<string, unknown>,
      accessContext: ToolAccessContext,
      executionContext: ToolExecutionContext,
      timeoutMs?: number,
    ): Promise<ToolExecutionResult<TOutput>> {
      const tool = deps.registry.get(name);
      const result = await deps.executor.execute<TOutput>(tool, input, accessContext, executionContext, timeoutMs);

      if (result.success) {
        await deps.events.emitExecuted(name, result, accessContext.organizationId, accessContext.userId);
      } else {
        await deps.events.emitExecutionFailed(
          name,
          result.error ?? 'Unknown error',
          accessContext.organizationId,
          accessContext.userId,
        );
      }

      return result;
    },
  };
}
