import { createKernel } from '@/lib/kernel';
import type { KernelInterface } from '@/lib/kernel/types';
import { createPersistedFeatureFlags } from '@/lib/kernel/persistence/feature-flag-persistence';
import type { PersistedFeatureFlagManager } from '@/lib/kernel/persistence/feature-flag-persistence';
import {
  createAIRuntime,
  PROVIDER_CONFIGS,
} from '@/lib/ai';
import type { AIRuntime } from '@/lib/ai';
import { createAnthropicProvider } from '@/lib/ai/providers/anthropic';
import { createOpenAIProvider } from '@/lib/ai/providers/openai';
import {
  createMemoryAccessLayer,
  createMemoryCache,
  createMemoryEngine,
  createMemoryEventEmitter,
  createMemoryIndex,
  createNamespaceResolver,
  createVersionManager,
} from '@/lib/memory';
import type { MemoryEngine } from '@/lib/memory';
import { createPrismaMemoryStore } from '@/lib/memory/stores/prisma-memory-store';
import { createIntelligenceModule, INTELLIGENCE_PLATFORM_TOKEN } from '@/lib/intelligence';
import type { IntelligencePlatform } from '@/lib/intelligence';
import { createPromptRegistry } from '@/lib/prompt';
import { createPersistedPromptRegistry } from '@/lib/prompt/persistence/prompt-persistence';
import type { PersistedPromptRegistry } from '@/lib/prompt/persistence/prompt-persistence';
import { createToolRegistry } from '@/lib/tools';
import { createPersistedToolRegistry } from '@/lib/tools/persistence/tool-persistence';
import type { PersistedToolRegistry } from '@/lib/tools/persistence/tool-persistence';
import { createAgentRegistry } from '@/lib/agents';
import { createPersistedAgentRegistry } from '@/lib/agents/persistence/agent-persistence';
import type { PersistedAgentRegistry } from '@/lib/agents/persistence/agent-persistence';
import { createWorkflowHistoryStore, createWorkflowRegistry } from '@/lib/workflows';
import {
  createPersistedWorkflowHistoryStore,
  createPersistedWorkflowRegistry,
} from '@/lib/workflows/persistence/workflow-persistence';
import type {
  PersistedWorkflowHistoryStore,
  PersistedWorkflowRegistry,
} from '@/lib/workflows/persistence/workflow-persistence';
import { registerAllAIEmployees } from '@/lib/agents/employees/register-all';
import { registerCommandCenterPrompt } from '@/lib/command-center/prompt';
import { registerDesktopRuntimeTools } from '@/lib/desktop-runtime/register';
import { registerCoreWorkflowStepHandlers } from '@/lib/workflows/step-handlers';
import { registerGoalEnginePrompt } from '@/lib/goal-engine';
import { createSkillAccessLayer, createSkillDiscovery, createSkillEngine, createSkillRegistry } from '@/lib/skills';
import type { SkillEngine } from '@/lib/skills';
import { createPersistedSkillRegistry } from '@/lib/skills/persistence/skill-persistence';
import type { PersistedSkillRegistry } from '@/lib/skills/persistence/skill-persistence';
import { registerCoreSkills } from '@/lib/skills/catalog/register-all';
import { applyProviderConfigOverride, createProviderConfigRepository } from '@/lib/ai/persistence/provider-config-repository';
import { db } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { isDemoMode } from '@/lib/demo';
import { discoverAndConnectServers } from '@/lib/mcp/manager';
import { registerMCPToolsAndSkills } from '@/lib/mcp/skills';
import { registerMCPCoreTools } from '@/lib/mcp/tools';

const CLAUDE_SONNET_MODEL = 'claude-sonnet-4-20250514';
export const CLAUDE_HAIKU_MODEL = 'claude-haiku-4-5-20251001';

export interface KnottixSystem {
  kernel: KernelInterface;
  aiRuntime: AIRuntime;
  memoryEngine: MemoryEngine;
  intelligence: IntelligencePlatform;
  featureFlags: PersistedFeatureFlagManager;
  promptRegistry: PersistedPromptRegistry;
  toolRegistry: PersistedToolRegistry;
  agentRegistry: PersistedAgentRegistry;
  workflowRegistry: PersistedWorkflowRegistry;
  workflowHistoryStore: PersistedWorkflowHistoryStore;
  skillRegistry: PersistedSkillRegistry;
  skillEngine: SkillEngine;
}

function buildMemoryEngine(kernel: KernelInterface): MemoryEngine {
  const store = createPrismaMemoryStore(db);
  return createMemoryEngine({
    store,
    revisionStore: store,
    snapshotStore: store,
    statsStore: store,
    accessLayer: createMemoryAccessLayer(),
    cache: createMemoryCache(),
    index: createMemoryIndex(),
    events: createMemoryEventEmitter(kernel.events),
    namespaceResolver: createNamespaceResolver(),
    versionManager: createVersionManager(store),
  });
}

function buildAIRuntime(): AIRuntime {
  const runtime = createAIRuntime();

  runtime.registerProvider('anthropic', createAnthropicProvider, PROVIDER_CONFIGS.anthropic);
  runtime.registerProvider('openai', createOpenAIProvider, PROVIDER_CONFIGS.openai);

  runtime.registerModel({
    id: CLAUDE_SONNET_MODEL,
    providerId: 'anthropic',
    name: 'Claude Sonnet 4',
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    capabilities: { streaming: true, toolCalling: true, vision: true, reasoning: true, structuredOutput: true },
    pricing: { inputPerMillionTokens: 3, outputPerMillionTokens: 15, currency: 'USD' },
    status: 'available',
  });

  runtime.registerModel({
    id: CLAUDE_HAIKU_MODEL,
    providerId: 'anthropic',
    name: 'Claude Haiku 4.5',
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    capabilities: { streaming: true, toolCalling: true, vision: true, reasoning: false, structuredOutput: true },
    pricing: { inputPerMillionTokens: 0.8, outputPerMillionTokens: 4, currency: 'USD' },
    status: 'available',
  });

  return runtime;
}

async function buildSystem(): Promise<KnottixSystem> {
  const kernel = createKernel({ name: 'Knottix', version: '1.0.0', environment: process.env.NODE_ENV ?? 'development' });

  const aiRuntime = buildAIRuntime();
  const memoryEngine = buildMemoryEngine(kernel);

  const promptRegistry = createPersistedPromptRegistry(createPromptRegistry(), db);
  const toolRegistry = createPersistedToolRegistry(createToolRegistry(), db);
  const agentRegistry = createPersistedAgentRegistry(createAgentRegistry(), db);
  const workflowRegistry = createPersistedWorkflowRegistry(createWorkflowRegistry(), db);
  const workflowHistoryStore = createPersistedWorkflowHistoryStore(createWorkflowHistoryStore(), db);
  const skillRegistry = createPersistedSkillRegistry(createSkillRegistry(), db);
  const skillEngine = createSkillEngine({
    registry: skillRegistry,
    discovery: createSkillDiscovery(skillRegistry),
    accessLayer: createSkillAccessLayer(),
  });

  const intelligenceModule = createIntelligenceModule({
    aiRuntime,
    memoryEngine,
    promptRegistry,
    toolRegistry,
    agentRegistry,
    workflowRegistry,
    workflowHistoryStore,
  });

  kernel.modules.add(intelligenceModule);
  await kernel.boot();

  const intelligence = kernel.container.resolve(INTELLIGENCE_PLATFORM_TOKEN);
  const featureFlags = createPersistedFeatureFlags(kernel.features, db, 'system');

  logger.info('system.bootstrap', 'Knottix system booted');

  return {
    kernel,
    aiRuntime,
    memoryEngine,
    intelligence,
    featureFlags,
    promptRegistry,
    toolRegistry,
    agentRegistry,
    workflowRegistry,
    workflowHistoryStore,
    skillRegistry,
    skillEngine,
  };
}

let systemPromise: Promise<KnottixSystem> | null = null;

export function getSystem(): Promise<KnottixSystem> {
  if (!systemPromise) {
    systemPromise = buildSystem().catch((error) => {
      systemPromise = null;
      throw error;
    });
  }
  return systemPromise;
}

const readyOrganizations = new Set<string>();

export async function ensureOrganizationReady(system: KnottixSystem, organizationId: string): Promise<void> {
  if (readyOrganizations.has(organizationId)) return;

  const [promptCount, toolCount, agentCount, workflowCount, skillCount] = await Promise.all([
    system.promptRegistry.hydrate(),
    system.toolRegistry.hydrate(organizationId),
    system.agentRegistry.hydrate(organizationId),
    system.workflowRegistry.hydrate(organizationId),
    system.skillRegistry.hydrate(organizationId),
  ]);

  const flags = createPersistedFeatureFlags(system.kernel.features, db, organizationId);
  await flags.hydrate(organizationId);

  const providerConfigRepo = createProviderConfigRepository(db);
  const anthropicOverride = await providerConfigRepo.loadOverride(organizationId, 'anthropic');
  if (anthropicOverride) {
    const merged = applyProviderConfigOverride(PROVIDER_CONFIGS.anthropic, anthropicOverride);
    system.aiRuntime.registerProvider('anthropic', createAnthropicProvider, merged);
    logger.info('system.bootstrap', `Applied organization-specific Anthropic provider config: ${organizationId}`);
  }

  registerAllAIEmployees(system.intelligence, { memoryEngine: system.memoryEngine, organizationId });
  registerCommandCenterPrompt(system.intelligence);
  registerDesktopRuntimeTools(system.intelligence);
  registerCoreWorkflowStepHandlers(system.intelligence, system.aiRuntime);
  registerGoalEnginePrompt(system.intelligence);
  registerCoreSkills(system.skillEngine);
  registerMCPCoreTools(system.intelligence);

  readyOrganizations.add(organizationId);
  logger.info('system.bootstrap', `Organization ready: ${organizationId}`, {
    promptCount,
    toolCount,
    agentCount,
    workflowCount,
    skillCount,
  });

  // Fire-and-forget: connecting to this organization's configured MCP servers (real network I/O,
  // possibly slow or failing) must never block the request that triggered org readiness. Demo Mode
  // has no database rows and no real connections to make (mirrors DEC-041/042's own guard).
  if (!isDemoMode()) {
    void discoverAndConnectServers(organizationId)
      .then((serverInfos) => {
        for (const info of serverInfos) {
          if (info.tools.length > 0) registerMCPToolsAndSkills(system.intelligence, system.skillEngine, info);
        }
        logger.info('system.bootstrap', `MCP servers discovered for organization: ${organizationId}`, {
          serverCount: serverInfos.length,
          connected: serverInfos.filter((i) => i.server.status === 'CONNECTED').length,
        });
      })
      .catch((error) => {
        logger.warn('system.bootstrap', `MCP server discovery failed for organization: ${organizationId}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }
}
