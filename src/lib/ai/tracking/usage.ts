import type { UsageRecord, TokenUsage } from '../types';
import { logger } from '@/lib/logger';

export interface UsageTracker {
  record(entry: UsageRecord): void;
  getRecords(): UsageRecord[];
  getRecordsByOrganization(organizationId: string): UsageRecord[];
  getRecordsByUser(userId: string): UsageRecord[];
  getRecordsByModule(module: string): UsageRecord[];
  getSummary(): UsageSummary;
  reset(): void;
}

export interface UsageSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: TokenUsage;
  totalCostUsd: number;
  averageLatencyMs: number;
}

export function createUsageTracker(): UsageTracker {
  const records: UsageRecord[] = [];

  function zeroUsage(): TokenUsage {
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }

  return {
    record(entry: UsageRecord): void {
      records.push(entry);
      logger.info('ai.usage', `AI request: ${entry.model}`, {
        requestId: entry.requestId,
        providerId: entry.providerId,
        model: entry.model,
        tokens: entry.usage.totalTokens,
        costUsd: entry.costUsd,
        latencyMs: entry.latencyMs,
        module: entry.module,
        success: entry.success,
      });
    },

    getRecords(): UsageRecord[] {
      return [...records];
    },

    getRecordsByOrganization(organizationId: string): UsageRecord[] {
      return records.filter((r) => r.organizationId === organizationId);
    },

    getRecordsByUser(userId: string): UsageRecord[] {
      return records.filter((r) => r.userId === userId);
    },

    getRecordsByModule(module: string): UsageRecord[] {
      return records.filter((r) => r.module === module);
    },

    getSummary(): UsageSummary {
      let totalTokens = zeroUsage();
      let totalCost = 0;
      let totalLatency = 0;
      let successCount = 0;

      for (const r of records) {
        totalTokens = {
          promptTokens: totalTokens.promptTokens + r.usage.promptTokens,
          completionTokens: totalTokens.completionTokens + r.usage.completionTokens,
          totalTokens: totalTokens.totalTokens + r.usage.totalTokens,
        };
        totalCost += r.costUsd;
        totalLatency += r.latencyMs;
        if (r.success) successCount++;
      }

      return {
        totalRequests: records.length,
        successfulRequests: successCount,
        failedRequests: records.length - successCount,
        totalTokens,
        totalCostUsd: totalCost,
        averageLatencyMs: records.length > 0 ? totalLatency / records.length : 0,
      };
    },

    reset(): void {
      records.length = 0;
    },
  };
}
