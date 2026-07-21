import type { ModelDefinition, TokenUsage } from '../types';
import type { ModelRegistryInterface } from '../models/types';

export interface CostTracker {
  calculate(model: string, usage: TokenUsage): number;
  record(requestId: string, model: string, usage: TokenUsage): void;
  getTotalCost(): number;
  getCostByModel(): Map<string, number>;
  getCostByProvider(): Map<string, number>;
  reset(): void;
}

export function createCostTracker(modelRegistry: ModelRegistryInterface): CostTracker {
  const records: Array<{ requestId: string; model: string; providerId: string; cost: number }> = [];

  function computeCost(modelDef: ModelDefinition, usage: TokenUsage): number {
    const inputCost = (usage.promptTokens / 1_000_000) * modelDef.pricing.inputPerMillionTokens;
    const outputCost = (usage.completionTokens / 1_000_000) * modelDef.pricing.outputPerMillionTokens;
    return inputCost + outputCost;
  }

  return {
    calculate(model: string, usage: TokenUsage): number {
      const modelDef = modelRegistry.get(model);
      if (!modelDef) return 0;
      return computeCost(modelDef, usage);
    },

    record(requestId: string, model: string, usage: TokenUsage): void {
      const modelDef = modelRegistry.get(model);
      if (!modelDef) return;
      records.push({
        requestId,
        model,
        providerId: modelDef.providerId,
        cost: computeCost(modelDef, usage),
      });
    },

    getTotalCost(): number {
      return records.reduce((sum, r) => sum + r.cost, 0);
    },

    getCostByModel(): Map<string, number> {
      const byModel = new Map<string, number>();
      for (const r of records) {
        byModel.set(r.model, (byModel.get(r.model) ?? 0) + r.cost);
      }
      return byModel;
    },

    getCostByProvider(): Map<string, number> {
      const byProvider = new Map<string, number>();
      for (const r of records) {
        byProvider.set(r.providerId, (byProvider.get(r.providerId) ?? 0) + r.cost);
      }
      return byProvider;
    },

    reset(): void {
      records.length = 0;
    },
  };
}
