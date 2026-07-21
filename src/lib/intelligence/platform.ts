import type { EventBus, KernelInterface, ModuleDefinition, ServiceToken } from '@/lib/kernel/types';
import { createToken } from '@/lib/kernel';
import type { AIRuntime } from '@/lib/ai';
import type { MemoryEngine } from '@/lib/memory';
import type { PromptEngine, PromptRegistry } from '@/lib/prompt';
import {
  createContextInjector,
  createPromptEngine,
  createPromptRegistry,
  createPromptRenderer,
  createPromptValidator,
} from '@/lib/prompt';
import type { ToolEngine, ToolRegistry } from '@/lib/tools';
import {
  createToolAccessLayer,
  createToolDiscovery,
  createToolEngine,
  createToolEventEmitter,
  createToolExecutor,
  createToolRegistry,
  createToolValidator,
} from '@/lib/tools';
import type { AgentEngine, AgentRegistry } from '@/lib/agents';
import {
  createAgentAccessLayer,
  createAgentContextBuilder,
  createAgentEngine,
  createAgentEventEmitter,
  createAgentExecutionPipeline,
  createAgentLifecycleManager,
  createAgentRegistry,
} from '@/lib/agents';
import type { WorkflowEngine, WorkflowHistoryStore, WorkflowRegistry } from '@/lib/workflows';
import {
  createWorkflowEngine,
  createWorkflowEventEmitter,
  createWorkflowExecutor,
  createWorkflowHistoryStore,
  createWorkflowRegistry,
  createWorkflowStateManager,
} from '@/lib/workflows';
import type { ContextBuilder } from './context/context-builder';
import { createContextBuilder } from './context/context-builder';
import { logger } from '@/lib/logger';

export interface IntelligencePlatform {
  readonly prompts: PromptEngine;
  readonly tools: ToolEngine;
  readonly agents: AgentEngine;
  readonly workflows: WorkflowEngine;
  readonly context: ContextBuilder;
}

export const INTELLIGENCE_PLATFORM_TOKEN: ServiceToken<IntelligencePlatform> = createToken('intelligence-platform');

export interface IntelligencePlatformDeps {
  aiRuntime: AIRuntime;
  memoryEngine: MemoryEngine;
  eventBus: EventBus;
  /** Overrides let the composition root inject Prisma-backed registries; default to in-memory. */
  promptRegistry?: PromptRegistry;
  toolRegistry?: ToolRegistry;
  agentRegistry?: AgentRegistry;
  workflowRegistry?: WorkflowRegistry;
  workflowHistoryStore?: WorkflowHistoryStore;
}

export function createIntelligencePlatform(deps: IntelligencePlatformDeps): IntelligencePlatform {
  const promptRegistry = deps.promptRegistry ?? createPromptRegistry();
  const promptValidator = createPromptValidator();
  const promptRenderer = createPromptRenderer();
  const contextInjector = createContextInjector();
  const prompts = createPromptEngine({
    registry: promptRegistry,
    validator: promptValidator,
    renderer: promptRenderer,
    contextInjector,
  });

  const toolRegistry = deps.toolRegistry ?? createToolRegistry();
  const toolDiscovery = createToolDiscovery(toolRegistry);
  const toolAccessLayer = createToolAccessLayer();
  const toolValidator = createToolValidator();
  const toolExecutor = createToolExecutor({ accessLayer: toolAccessLayer, validator: toolValidator });
  const toolEvents = createToolEventEmitter(deps.eventBus);
  const tools = createToolEngine({
    registry: toolRegistry,
    discovery: toolDiscovery,
    accessLayer: toolAccessLayer,
    validator: toolValidator,
    executor: toolExecutor,
    events: toolEvents,
  });

  const context = createContextBuilder();

  const agentRegistry = deps.agentRegistry ?? createAgentRegistry();
  const agentLifecycle = createAgentLifecycleManager(agentRegistry);
  const agentAccessLayer = createAgentAccessLayer();
  const agentContextBuilder = createAgentContextBuilder({
    toolEngine: tools,
    memoryEngine: deps.memoryEngine,
    contextBuilder: context,
  });
  const agentEvents = createAgentEventEmitter(deps.eventBus);
  const agentPipeline = createAgentExecutionPipeline({
    registry: agentRegistry,
    lifecycle: agentLifecycle,
    accessLayer: agentAccessLayer,
    contextBuilder: agentContextBuilder,
    promptEngine: prompts,
    aiRuntime: deps.aiRuntime,
    events: agentEvents,
  });
  const agents = createAgentEngine({
    registry: agentRegistry,
    lifecycle: agentLifecycle,
    pipeline: agentPipeline,
    events: agentEvents,
  });

  const workflowRegistry = deps.workflowRegistry ?? createWorkflowRegistry();
  const workflowStateManager = createWorkflowStateManager();
  const workflowHistoryStore = deps.workflowHistoryStore ?? createWorkflowHistoryStore();
  const workflowEvents = createWorkflowEventEmitter(deps.eventBus);
  const workflowExecutor = createWorkflowExecutor({
    registry: workflowRegistry,
    stateManager: workflowStateManager,
    historyStore: workflowHistoryStore,
    events: workflowEvents,
  });
  const workflows = createWorkflowEngine({
    registry: workflowRegistry,
    stateManager: workflowStateManager,
    historyStore: workflowHistoryStore,
    executor: workflowExecutor,
  });

  logger.info('intelligence.platform', 'Intelligence Platform initialized');

  return { prompts, tools, agents, workflows, context };
}

export function createIntelligenceModule(
  deps: Omit<IntelligencePlatformDeps, 'eventBus'>,
): ModuleDefinition {
  return {
    id: 'intelligence-platform',
    name: 'Intelligence Platform',
    version: '1.0.0',
    dependencies: [],
    register(kernel: KernelInterface): void {
      const platform = createIntelligencePlatform({
        ...deps,
        eventBus: kernel.events,
      });
      kernel.container.register(INTELLIGENCE_PLATFORM_TOKEN, () => platform, 'singleton');
      logger.info('intelligence.module', 'Intelligence Platform registered with Kernel');
    },
  };
}
