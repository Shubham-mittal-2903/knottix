import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import type { ProviderConfig } from '../types';
import { logger } from '@/lib/logger';

export type SupportedProviderId = 'anthropic' | 'openai';

const PROVIDER_ID_TO_INTEGRATION: Record<SupportedProviderId, 'CLAUDE' | 'OPENAI'> = {
  anthropic: 'CLAUDE',
  openai: 'OPENAI',
};

/**
 * Only non-secret operational settings. API keys are never read from or written to the
 * database — they remain environment-variable-only per `ProviderConfig.apiKeyEnvVar`.
 */
export interface ProviderConfigOverride {
  baseUrl?: string;
  maxRetries?: number;
  timeoutMs?: number;
  rateLimitRpm?: number;
}

export interface ProviderConfigRepository {
  loadOverride(organizationId: string, providerId: SupportedProviderId): Promise<ProviderConfigOverride | null>;
  saveOverride(
    organizationId: string,
    providerId: SupportedProviderId,
    override: ProviderConfigOverride,
    updatedBy?: string,
  ): Promise<void>;
}

export function createProviderConfigRepository(db: PrismaClient): ProviderConfigRepository {
  return {
    async loadOverride(organizationId: string, providerId: SupportedProviderId): Promise<ProviderConfigOverride | null> {
      const provider = PROVIDER_ID_TO_INTEGRATION[providerId];
      const row = await db.integration.findUnique({
        where: { organizationId_provider: { organizationId, provider } },
      });
      if (!row || !row.config) return null;
      return row.config as ProviderConfigOverride;
    },

    async saveOverride(
      organizationId: string,
      providerId: SupportedProviderId,
      override: ProviderConfigOverride,
      updatedBy?: string,
    ): Promise<void> {
      const provider = PROVIDER_ID_TO_INTEGRATION[providerId];
      const config = override as unknown as Prisma.InputJsonValue;

      await db.integration.upsert({
        where: { organizationId_provider: { organizationId, provider } },
        create: { organizationId, provider, name: providerId, status: 'CONNECTED', config, updatedBy },
        update: { config, updatedBy },
      });

      logger.info('ai.provider-config', `Saved provider config override: ${providerId}`);
    },
  };
}

export function applyProviderConfigOverride(base: ProviderConfig, override: ProviderConfigOverride | null): ProviderConfig {
  if (!override) return base;
  return { ...base, ...override };
}
