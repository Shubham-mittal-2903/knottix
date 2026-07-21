import type { FeatureFlagManager } from './types';
import { logger } from '@/lib/logger';

export function createFeatureFlagManager(): FeatureFlagManager {
  const flags = new Map<string, boolean>();

  return {
    isEnabled(flag: string): boolean {
      return flags.get(flag) ?? false;
    },

    enable(flag: string): void {
      flags.set(flag, true);
      logger.info('kernel.features', `Feature enabled: ${flag}`);
    },

    disable(flag: string): void {
      flags.set(flag, false);
      logger.info('kernel.features', `Feature disabled: ${flag}`);
    },

    set(flag: string, enabled: boolean): void {
      flags.set(flag, enabled);
    },

    list(): Record<string, boolean> {
      const result: Record<string, boolean> = {};
      for (const [key, value] of flags) {
        result[key] = value;
      }
      return result;
    },
  };
}
