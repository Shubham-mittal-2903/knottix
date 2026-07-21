export type ToolCategory =
  | 'data'
  | 'communication'
  | 'analysis'
  | 'automation'
  | 'system'
  | 'integration'
  | 'utility';

export type ToolParameterType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface ToolParameterDefinition {
  name: string;
  type: ToolParameterType;
  description: string;
  required: boolean;
  enum?: string[];
  defaultValue?: unknown;
}

export interface ToolMetadata {
  author?: string;
  tags?: string[];
  isDangerous?: boolean;
  requiresConfirmation?: boolean;
  custom?: Record<string, unknown>;
}

export interface ToolExecutionContext {
  requestId: string;
  organizationId: string;
  workspaceId: string | null;
  userId: string;
  module: string;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

export type ToolHandler = (input: Record<string, unknown>, context: ToolExecutionContext) => Promise<unknown>;

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  parameters: ToolParameterDefinition[];
  permission: string;
  metadata: ToolMetadata;
  handler: ToolHandler;
  version: string;
  isActive: boolean;
  registeredAt: number;
}

export interface RegisterToolInput {
  name: string;
  description: string;
  category: ToolCategory;
  parameters?: ToolParameterDefinition[];
  permission: string;
  metadata?: ToolMetadata;
  handler: ToolHandler;
  version?: string;
}

export interface ToolExecutionResult<TOutput = unknown> {
  toolName: string;
  success: boolean;
  output?: TOutput;
  error?: string;
  durationMs: number;
  executedAt: number;
}

export interface ToolAccessContext {
  userId: string;
  organizationId: string;
  workspaceId: string | null;
  isFounder: boolean;
  permissions: string[];
}

export interface ToolSchemaProperty {
  type: ToolParameterType;
  description?: string;
  enum?: string[];
}

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, ToolSchemaProperty>;
  required: string[];
}

export interface ToolDescriptor {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
}

export interface ToolFilter {
  category?: ToolCategory;
  isActive?: boolean;
  search?: string;
  tag?: string;
}

export interface ToolInputValidationResult {
  valid: boolean;
  missingParameters: string[];
  unknownParameters: string[];
  errors: string[];
}
