import type { TokenUsage } from '../types';

export interface TokenTracker {
  record(requestId: string, model: string, usage: TokenUsage): void;
  getRequestUsage(requestId: string): TokenUsage | undefined;
  getTotalUsage(): TokenUsage;
  getUsageByModel(): Map<string, TokenUsage>;
  reset(): void;
}

export function createTokenTracker(): TokenTracker {
  const records = new Map<string, { model: string; usage: TokenUsage }>();

  function addUsage(target: TokenUsage, source: TokenUsage): TokenUsage {
    return {
      promptTokens: target.promptTokens + source.promptTokens,
      completionTokens: target.completionTokens + source.completionTokens,
      totalTokens: target.totalTokens + source.totalTokens,
    };
  }

  function zeroUsage(): TokenUsage {
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }

  return {
    record(requestId: string, model: string, usage: TokenUsage): void {
      records.set(requestId, { model, usage });
    },

    getRequestUsage(requestId: string): TokenUsage | undefined {
      return records.get(requestId)?.usage;
    },

    getTotalUsage(): TokenUsage {
      let total = zeroUsage();
      for (const { usage } of records.values()) {
        total = addUsage(total, usage);
      }
      return total;
    },

    getUsageByModel(): Map<string, TokenUsage> {
      const byModel = new Map<string, TokenUsage>();
      for (const { model, usage } of records.values()) {
        const existing = byModel.get(model) ?? zeroUsage();
        byModel.set(model, addUsage(existing, usage));
      }
      return byModel;
    },

    reset(): void {
      records.clear();
    },
  };
}
