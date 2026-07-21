import type { AIRuntime } from '@/lib/ai';
import type { PromptEngine } from '@/lib/prompt';
import type { IntelligenceContext } from '@/lib/intelligence/types';
import type { AgentAccessContext, AgentExecutionRequest, AgentExecutionResult } from '../types';
import type { AgentRegistry } from '../registry/agent-registry';
import type { AgentLifecycleManager } from '../lifecycle/agent-lifecycle';
import type { AgentAccessLayer } from '../permissions/agent-access';
import type { AgentContextBuilder } from '../context/agent-context-builder';
import type { AgentEventEmitter } from '../events/agent-events';
import { logger } from '@/lib/logger';

export interface AgentExecutionPipeline {
  execute(
    request: AgentExecutionRequest,
    accessContext: AgentAccessContext,
    intelligenceContext: IntelligenceContext,
  ): Promise<AgentExecutionResult>;
}

export function createAgentExecutionPipeline(deps: {
  registry: AgentRegistry;
  lifecycle: AgentLifecycleManager;
  accessLayer: AgentAccessLayer;
  contextBuilder: AgentContextBuilder;
  promptEngine: PromptEngine;
  aiRuntime: AIRuntime;
  events: AgentEventEmitter;
}): AgentExecutionPipeline {
  return {
    async execute(
      request: AgentExecutionRequest,
      accessContext: AgentAccessContext,
      intelligenceContext: IntelligenceContext,
    ): Promise<AgentExecutionResult> {
      const startedAt = Date.now();
      const agent = deps.registry.get(request.agentKey, request.organizationId);

      deps.accessLayer.assertInvoke(accessContext, agent);

      if (agent.status === 'registered') {
        deps.lifecycle.transition(agent.id, 'initializing');
        deps.lifecycle.transition(agent.id, 'ready');
      }

      deps.lifecycle.transition(agent.id, 'running');

      await deps.events.emitExecutionStarted(
        agent.key,
        intelligenceContext.requestId,
        request.organizationId,
        accessContext.userId,
      );

      try {
        const agentContext = await deps.contextBuilder.build(intelligenceContext, agent);

        const rendered = deps.promptEngine.render({
          key: agent.promptKey,
          variables: request.variables ?? {},
          organizationId: request.organizationId,
          contextBlocks: agentContext.contextBlocks,
        });

        const response = await deps.aiRuntime.complete({
          model: agent.model,
          messages: [
            { role: 'system', content: rendered.content },
            { role: 'user', content: request.input },
          ],
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
          organizationId: request.organizationId,
          userId: accessContext.userId,
          module: 'agents',
          metadata: { agentKey: agent.key },
        });

        deps.lifecycle.transition(agent.id, 'ready');

        const result: AgentExecutionResult = {
          agentKey: agent.key,
          requestId: intelligenceContext.requestId,
          content: response.content,
          toolCalls: [],
          usage: response.usage,
          latencyMs: Date.now() - startedAt,
          status: 'completed',
        };

        await deps.events.emitExecutionCompleted(agent.key, result, request.organizationId, accessContext.userId);
        logger.info('agent.pipeline', `Agent executed: ${agent.key} (${result.latencyMs}ms)`);

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        deps.lifecycle.transition(agent.id, 'error');

        await deps.events.emitExecutionFailed(agent.key, message, request.organizationId, accessContext.userId);
        logger.error('agent.pipeline', `Agent execution failed: ${agent.key}`, { error: message });

        const result: AgentExecutionResult = {
          agentKey: agent.key,
          requestId: intelligenceContext.requestId,
          content: '',
          toolCalls: [],
          usage: null,
          latencyMs: Date.now() - startedAt,
          status: 'failed',
          error: message,
        };

        return result;
      }
    },
  };
}
