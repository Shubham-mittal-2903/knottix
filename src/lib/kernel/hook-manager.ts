import type { HookContext, HookHandler, HookManager, HookPhase } from './types';
import { logger } from '@/lib/logger';

function makeKey(operation: string, phase: HookPhase): string {
  return `${operation}:${phase}`;
}

export function createHookManager(): HookManager {
  const hooks = new Map<string, Set<HookHandler>>();

  return {
    register<T>(operation: string, phase: HookPhase, handler: HookHandler<T>): () => void {
      const key = makeKey(operation, phase);
      let set = hooks.get(key);
      if (!set) {
        set = new Set();
        hooks.set(key, set);
      }
      set.add(handler as HookHandler);

      return () => {
        set!.delete(handler as HookHandler);
        if (set!.size === 0) {
          hooks.delete(key);
        }
      };
    },

    async execute<T>(
      operation: string,
      phase: HookPhase,
      data: T,
      metadata: Record<string, unknown> = {},
    ): Promise<HookContext<T>> {
      let aborted = false;
      const context: HookContext<T> = {
        operation,
        phase,
        data,
        metadata,
        abort: () => {
          aborted = true;
        },
        get aborted() {
          return aborted;
        },
      };

      const key = makeKey(operation, phase);
      const set = hooks.get(key);
      if (!set || set.size === 0) return context;

      for (const handler of set) {
        if (aborted) break;
        try {
          const result = (handler as HookHandler<T>)(context);
          if (result instanceof Promise) {
            await result;
          }
        } catch (err) {
          logger.error('kernel.hooks', `Hook error for "${key}"`, { error: err });
        }
      }

      return context;
    },
  };
}
