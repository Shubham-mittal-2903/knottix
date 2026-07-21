export type {
  ToolCategory,
  ToolParameterType,
  ToolParameterDefinition,
  ToolMetadata,
  ToolExecutionContext,
  ToolHandler,
  ToolDefinition,
  RegisterToolInput,
  ToolExecutionResult,
  ToolAccessContext,
  ToolSchemaProperty,
  ToolInputSchema,
  ToolDescriptor,
  ToolFilter,
  ToolInputValidationResult,
} from './types';

export { ToolError, isToolError } from './errors';
export type { ToolErrorCode } from './errors';

export type { ToolRegistry } from './registry/tool-registry';
export { createToolRegistry } from './registry/tool-registry';

export type { ToolAccessLayer } from './permissions/tool-access';
export { createToolAccessLayer } from './permissions/tool-access';

export type { ToolValidator } from './validation/tool-validator';
export { createToolValidator } from './validation/tool-validator';

export type { ToolDiscovery } from './discovery/tool-discovery';
export { createToolDiscovery } from './discovery/tool-discovery';

export type { ToolExecutor } from './execution/tool-executor';
export { createToolExecutor } from './execution/tool-executor';

export type {
  ToolEventEmitter,
  ToolRegisteredPayload,
  ToolExecutedPayload,
  ToolExecutionFailedPayload,
  ToolDeactivatedPayload,
} from './events/tool-events';
export { TOOL_EVENTS, createToolEventEmitter } from './events/tool-events';

export type { ToolEngine } from './engine/tool-engine';
export { createToolEngine } from './engine/tool-engine';
