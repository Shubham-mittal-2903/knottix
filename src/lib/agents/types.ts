import type { TokenUsage } from '@/lib/ai';
import type { PromptContextBlock } from '@/lib/prompt';
import type { ToolDescriptor } from '@/lib/tools';
import type { IntelligenceContext } from '@/lib/intelligence/types';

export type AgentCapability = 'text-generation' | 'tool-use' | 'memory-access' | 'workflow-trigger' | 'streaming';

export type AgentLifecycleStatus = 'registered' | 'initializing' | 'ready' | 'running' | 'stopped' | 'error';

export interface AgentDefinition {
  id: string;
  key: string;
  name: string;
  description: string;
  capabilities: AgentCapability[];
  permission: string;
  promptKey: string;
  model?: string;
  allowedTools: string[];
  maxTokens?: number;
  temperature?: number;
  organizationId: string | null;
  status: AgentLifecycleStatus;
  version: string;
  registeredAt: number;
}

export interface RegisterAgentInput {
  key: string;
  name: string;
  description: string;
  capabilities: AgentCapability[];
  permission: string;
  promptKey: string;
  model?: string;
  allowedTools?: string[];
  maxTokens?: number;
  temperature?: number;
  organizationId?: string | null;
  version?: string;
}

export interface AgentAccessContext {
  userId: string;
  organizationId: string;
  workspaceId: string | null;
  isFounder: boolean;
  permissions: string[];
}

export interface AgentContext {
  intelligence: IntelligenceContext;
  agent: AgentDefinition;
  allowedTools: ToolDescriptor[];
  contextBlocks: PromptContextBlock[];
}

export interface AgentExecutionRequest {
  agentKey: string;
  organizationId: string;
  input: string;
  variables?: Record<string, unknown>;
}

export interface AgentToolCall {
  toolName: string;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
}

export type AgentExecutionStatus = 'completed' | 'failed';

export interface AgentExecutionResult {
  agentKey: string;
  requestId: string;
  content: string;
  toolCalls: AgentToolCall[];
  usage: TokenUsage | null;
  latencyMs: number;
  status: AgentExecutionStatus;
  error?: string;
}

export interface AgentFilter {
  organizationId?: string | null;
  status?: AgentLifecycleStatus;
  capability?: AgentCapability;
  search?: string;
}
