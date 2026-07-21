import type { IntelligenceContext } from '@/lib/intelligence/types';
import type {
  AgentAccessContext,
  AgentDefinition,
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentFilter,
  RegisterAgentInput,
} from '../types';
import type { AgentRegistry } from '../registry/agent-registry';
import type { AgentLifecycleManager } from '../lifecycle/agent-lifecycle';
import type { AgentExecutionPipeline } from '../execution/agent-pipeline';
import type { AgentEventEmitter } from '../events/agent-events';
import { logger } from '@/lib/logger';

export interface AgentEngine {
  register(input: RegisterAgentInput): AgentDefinition;
  get(key: string, organizationId?: string | null): AgentDefinition;
  find(filter: AgentFilter): AgentDefinition[];
  initialize(agentId: string): AgentDefinition;
  stop(agentId: string): AgentDefinition;
  execute(
    request: AgentExecutionRequest,
    accessContext: AgentAccessContext,
    intelligenceContext: IntelligenceContext,
  ): Promise<AgentExecutionResult>;
}

export function createAgentEngine(deps: {
  registry: AgentRegistry;
  lifecycle: AgentLifecycleManager;
  pipeline: AgentExecutionPipeline;
  events: AgentEventEmitter;
}): AgentEngine {
  return {
    register(input: RegisterAgentInput): AgentDefinition {
      const agent = deps.registry.register(input);
      void deps.events.emitRegistered(agent);
      logger.info('agent.engine', `Agent registered: ${agent.key}`);
      return agent;
    },

    get(key: string, organizationId?: string | null): AgentDefinition {
      return deps.registry.get(key, organizationId);
    },

    find(filter: AgentFilter): AgentDefinition[] {
      return deps.registry.find(filter);
    },

    initialize(agentId: string): AgentDefinition {
      deps.lifecycle.transition(agentId, 'initializing');
      const agent = deps.lifecycle.transition(agentId, 'ready');
      void deps.events.emitLifecycleChanged(agent.key, 'initializing', 'ready');
      return agent;
    },

    stop(agentId: string): AgentDefinition {
      const agent = deps.lifecycle.transition(agentId, 'stopped');
      void deps.events.emitLifecycleChanged(agent.key, 'ready', 'stopped');
      return agent;
    },

    async execute(
      request: AgentExecutionRequest,
      accessContext: AgentAccessContext,
      intelligenceContext: IntelligenceContext,
    ): Promise<AgentExecutionResult> {
      return deps.pipeline.execute(request, accessContext, intelligenceContext);
    },
  };
}
