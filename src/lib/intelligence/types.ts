import type { AppContext, OrganizationContext, RequestContext, SessionContext, WorkspaceContext } from '@/lib/kernel/types';
import type { MemoryAccessContext } from '@/lib/memory';
import type { ExecutionContext as AIExecutionContext } from '@/lib/ai';
import type { ToolAccessContext, ToolExecutionContext } from '@/lib/tools';

export type ConversationStatus = 'active' | 'archived';

export interface ConversationRef {
  id: string;
  status: ConversationStatus;
}

export interface IntelligenceContext {
  requestId: string;
  app: AppContext;
  organization: OrganizationContext;
  workspace: WorkspaceContext | null;
  session: SessionContext;
  memory: MemoryAccessContext;
  ai: AIExecutionContext;
  conversation: ConversationRef | null;
  module: string;
  startedAt: number;
  metadata?: Record<string, unknown>;
}

export interface BuildContextInput {
  request: RequestContext;
  module: string;
  conversationId?: string;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

export type { ToolAccessContext, ToolExecutionContext };
