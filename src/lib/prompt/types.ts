export type PromptCategory = 'system' | 'agent' | 'tool' | 'workflow' | 'general';

export type PromptVariableType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface PromptVariableDefinition {
  name: string;
  type: PromptVariableType;
  description?: string;
  required: boolean;
  defaultValue?: unknown;
}

export interface PromptTemplate {
  id: string;
  key: string;
  name: string;
  description: string;
  category: PromptCategory;
  template: string;
  variables: PromptVariableDefinition[];
  version: number;
  organizationId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

export interface PromptTemplateRevision {
  id: string;
  templateId: string;
  version: number;
  template: string;
  variables: PromptVariableDefinition[];
  changedBy: string | null;
  changedAt: number;
  changeReason: string | null;
}

export interface CreatePromptTemplateInput {
  key: string;
  name: string;
  description: string;
  category: PromptCategory;
  template: string;
  variables?: PromptVariableDefinition[];
  organizationId?: string | null;
  createdBy?: string;
}

export interface UpdatePromptTemplateInput {
  name?: string;
  description?: string;
  template?: string;
  variables?: PromptVariableDefinition[];
  isActive?: boolean;
  updatedBy?: string;
  changeReason?: string;
}

export interface PromptContextEntry {
  sourceType: string;
  date: string;
  content: string;
}

export interface PromptContextBlock {
  label: string;
  entries: PromptContextEntry[];
}

export interface RenderPromptInput {
  key: string;
  variables: Record<string, unknown>;
  organizationId?: string | null;
  contextBlocks?: PromptContextBlock[];
  maxContextTokens?: number;
}

export interface RenderedPrompt {
  templateId: string;
  templateKey: string;
  version: number;
  content: string;
  variablesUsed: string[];
  contextInjected: boolean;
}

export interface PromptValidationResult {
  valid: boolean;
  missingVariables: string[];
  unknownVariables: string[];
  errors: string[];
}

export interface PromptFilter {
  category?: PromptCategory;
  organizationId?: string | null;
  isActive?: boolean;
  search?: string;
}
