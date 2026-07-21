export type AIRole = 'system' | 'user' | 'assistant';

export interface AIMessage {
  role: AIRole;
  content: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIRequest {
  requestId: string;
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
  stream?: boolean;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

export interface AIResponse {
  requestId: string;
  model: string;
  providerId: string;
  content: string;
  finishReason: AIFinishReason;
  usage: TokenUsage;
  latencyMs: number;
  metadata?: Record<string, unknown>;
}

export type AIFinishReason = 'stop' | 'length' | 'content_filter' | 'error' | 'cancelled';

export type AIStreamChunkType = 'content_delta' | 'usage' | 'done' | 'error';

export interface AIStreamChunk {
  type: AIStreamChunkType;
  content?: string;
  usage?: TokenUsage;
  finishReason?: AIFinishReason;
  error?: string;
}

export interface ModelCapabilities {
  streaming: boolean;
  toolCalling: boolean;
  vision: boolean;
  reasoning: boolean;
  structuredOutput: boolean;
}

export interface ModelPricing {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
  currency: string;
}

export type ModelStatus = 'available' | 'deprecated' | 'unavailable';

export interface ModelDefinition {
  id: string;
  providerId: string;
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: ModelCapabilities;
  pricing: ModelPricing;
  status: ModelStatus;
}

export type ProviderStatus = 'healthy' | 'degraded' | 'unavailable';

export interface ProviderHealth {
  status: ProviderStatus;
  lastCheck: number;
  lastSuccessfulRequest: number | null;
  consecutiveFailures: number;
  averageLatencyMs: number | null;
}

export interface ProviderConfig {
  id: string;
  name: string;
  apiKeyEnvVar: string;
  baseUrl?: string;
  maxRetries?: number;
  timeoutMs?: number;
  rateLimitRpm?: number;
}

export interface AIRuntimeConfig {
  defaultProvider: string;
  defaultModel: string;
  defaultTimeoutMs: number;
  defaultMaxRetries: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
}

export interface UsageRecord {
  requestId: string;
  providerId: string;
  model: string;
  usage: TokenUsage;
  costUsd: number;
  latencyMs: number;
  timestamp: number;
  organizationId: string;
  userId: string;
  module: string;
  success: boolean;
}

export interface ExecutionContext {
  requestId: string;
  organizationId: string;
  userId: string;
  module: string;
  startTime: number;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

export type PipelineMiddleware = (
  request: AIRequest,
  context: ExecutionContext,
  next: () => Promise<AIResponse>,
) => Promise<AIResponse>;

export type StreamPipelineMiddleware = (
  request: AIRequest,
  context: ExecutionContext,
  next: () => AsyncIterable<AIStreamChunk>,
) => AsyncIterable<AIStreamChunk>;
