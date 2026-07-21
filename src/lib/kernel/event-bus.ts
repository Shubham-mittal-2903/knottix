import type { EventBus, EventHandler, KernelEvent } from './types';
import { logger } from '@/lib/logger';

export function createEventBus(): EventBus {
  const handlers = new Map<string, Set<EventHandler>>();

  return {
    async emit<TPayload>(type: string, payload: TPayload, source: string): Promise<void> {
      const event: KernelEvent<TPayload> = {
        type,
        payload,
        timestamp: Date.now(),
        source,
      };

      const typeHandlers = handlers.get(type);
      if (!typeHandlers || typeHandlers.size === 0) return;

      const promises: Promise<void>[] = [];
      for (const handler of typeHandlers) {
        try {
          const result = (handler as EventHandler<TPayload>)(event);
          if (result instanceof Promise) {
            promises.push(
              result.catch((err) => {
                logger.error('kernel.event-bus', `Handler error for event "${type}"`, { error: err });
              }),
            );
          }
        } catch (err) {
          logger.error('kernel.event-bus', `Sync handler error for event "${type}"`, { error: err });
        }
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    },

    on<TPayload>(type: string, handler: EventHandler<TPayload>): () => void {
      let typeHandlers = handlers.get(type);
      if (!typeHandlers) {
        typeHandlers = new Set();
        handlers.set(type, typeHandlers);
      }
      typeHandlers.add(handler as EventHandler);

      return () => {
        typeHandlers!.delete(handler as EventHandler);
        if (typeHandlers!.size === 0) {
          handlers.delete(type);
        }
      };
    },

    off(type: string, handler: EventHandler): void {
      const typeHandlers = handlers.get(type);
      if (typeHandlers) {
        typeHandlers.delete(handler);
        if (typeHandlers.size === 0) {
          handlers.delete(type);
        }
      }
    },

    clear(): void {
      handlers.clear();
    },
  };
}
