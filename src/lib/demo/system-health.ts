export interface DemoModuleInfo {
  id: string;
  name: string;
  version: string;
  status: 'ready' | 'registered' | 'initializing' | 'error' | 'stopped';
  dependencies: string[];
}

export interface DemoProviderInfo {
  id: string;
  name: string;
  isAvailable: boolean;
  status: 'healthy' | 'degraded' | 'unavailable';
  averageLatencyMs: number | null;
}

export interface DemoUsageSummary {
  totalRequests: number;
  failedRequests: number;
  totalTokens: { totalTokens: number };
  totalCostUsd: number;
}

export interface DemoMemoryHealth {
  storeAvailable: boolean;
  cacheAvailable: boolean;
  totalEntries: number;
  lastWriteAt: number | null;
  lastReadAt: number | null;
}

const MIN = 60 * 1000;

export const DEMO_KERNEL_PHASE = 'ready' as const;

export const DEMO_MODULES: DemoModuleInfo[] = [
  { id: 'intelligence-platform', name: 'Intelligence Platform', version: '1.0.0', status: 'ready', dependencies: [] },
];

export const DEMO_PROVIDERS: DemoProviderInfo[] = [
  { id: 'anthropic', name: 'Anthropic', isAvailable: true, status: 'healthy', averageLatencyMs: 842 },
  { id: 'openai', name: 'OpenAI', isAvailable: false, status: 'unavailable', averageLatencyMs: null },
];

export const DEMO_USAGE: DemoUsageSummary = {
  totalRequests: 312,
  failedRequests: 4,
  totalTokens: { totalTokens: 1_284_600 },
  totalCostUsd: 6.4231,
};

export const DEMO_MEMORY_HEALTH: DemoMemoryHealth = {
  storeAvailable: true,
  cacheAvailable: true,
  totalEntries: 8,
  lastWriteAt: Date.now() - 6 * MIN,
  lastReadAt: Date.now() - 2 * MIN,
};

export const DEMO_FEATURE_FLAGS: Record<string, boolean> = {
  'agents.tool-calling-loop': false,
  'workflows.per-employee': false,
  'billing.usage-alerts': true,
};
