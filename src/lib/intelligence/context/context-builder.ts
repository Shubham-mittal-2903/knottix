import type { ExecutionContext as AIExecutionContext } from '@/lib/ai';
import type { MemoryAccessContext } from '@/lib/memory';
import type { ToolAccessContext, ToolExecutionContext } from '@/lib/tools';
import type { BuildContextInput, IntelligenceContext } from '../types';

let requestCounter = 0;
function generateRequestId(): string {
  requestCounter += 1;
  return `ix_${Date.now()}_${requestCounter}`;
}

export interface ContextBuilder {
  build(input: BuildContextInput): IntelligenceContext;
  toMemoryAccessContext(context: IntelligenceContext): MemoryAccessContext;
  toToolAccessContext(context: IntelligenceContext): ToolAccessContext;
  toToolExecutionContext(context: IntelligenceContext): ToolExecutionContext;
  toAIExecutionContext(context: IntelligenceContext): AIExecutionContext;
}

export function createContextBuilder(): ContextBuilder {
  return {
    build(input: BuildContextInput): IntelligenceContext {
      const requestId = generateRequestId();
      const { request } = input;
      const now = Date.now();

      const aiContext: AIExecutionContext = {
        requestId,
        organizationId: request.organization.id,
        userId: request.session.userId,
        module: input.module,
        startTime: now,
        signal: input.signal,
        metadata: input.metadata,
      };

      return {
        requestId,
        app: request.app,
        organization: request.organization,
        workspace: request.workspace,
        session: request.session,
        memory: {
          userId: request.session.userId,
          memberId: request.session.memberId,
          organizationId: request.organization.id,
          workspaceId: request.workspace?.id ?? null,
          roleId: request.session.roleId,
          isFounder: request.session.isFounder,
          permissions: request.session.permissions,
        },
        ai: aiContext,
        conversation: input.conversationId ? { id: input.conversationId, status: 'active' } : null,
        module: input.module,
        startedAt: now,
        metadata: input.metadata,
      };
    },

    toMemoryAccessContext(context: IntelligenceContext): MemoryAccessContext {
      return { ...context.memory };
    },

    toToolAccessContext(context: IntelligenceContext): ToolAccessContext {
      return {
        userId: context.session.userId,
        organizationId: context.organization.id,
        workspaceId: context.workspace?.id ?? null,
        isFounder: context.session.isFounder,
        permissions: context.session.permissions,
      };
    },

    toToolExecutionContext(context: IntelligenceContext): ToolExecutionContext {
      return {
        requestId: context.requestId,
        organizationId: context.organization.id,
        workspaceId: context.workspace?.id ?? null,
        userId: context.session.userId,
        module: context.module,
        signal: context.ai.signal,
        metadata: context.metadata,
      };
    },

    toAIExecutionContext(context: IntelligenceContext): AIExecutionContext {
      return { ...context.ai };
    },
  };
}
