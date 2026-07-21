import type { AIRuntimeConfig, ProviderConfig } from './types';

export const DEFAULT_RUNTIME_CONFIG: AIRuntimeConfig = {
  defaultProvider: 'anthropic',
  defaultModel: 'claude-sonnet-4-20250514',
  defaultTimeoutMs: 60_000,
  defaultMaxRetries: 2,
  retryBaseDelayMs: 1_000,
  retryMaxDelayMs: 30_000,
};

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    baseUrl: 'https://api.anthropic.com',
    maxRetries: 2,
    timeoutMs: 60_000,
    rateLimitRpm: 60,
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    apiKeyEnvVar: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com',
    maxRetries: 2,
    timeoutMs: 60_000,
    rateLimitRpm: 60,
  },
  google: {
    id: 'google',
    name: 'Google Gemini',
    apiKeyEnvVar: 'GOOGLE_AI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com',
    maxRetries: 2,
    timeoutMs: 60_000,
    rateLimitRpm: 60,
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    apiKeyEnvVar: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api',
    maxRetries: 2,
    timeoutMs: 90_000,
    rateLimitRpm: 30,
  },
};
