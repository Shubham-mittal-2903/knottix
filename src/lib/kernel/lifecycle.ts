import type { KernelInterface, LifecycleHandler, LifecycleManager, LifecyclePhase } from './types';
import { logger } from '@/lib/logger';

const PHASE_ORDER: LifecyclePhase[] = ['boot', 'init', 'ready', 'shutdown'];

export function createLifecycleManager(): LifecycleManager & {
  transition(phase: LifecyclePhase, kernel: KernelInterface): Promise<void>;
} {
  let currentPhase: LifecyclePhase = 'boot';
  const handlers = new Map<LifecyclePhase, LifecycleHandler[]>();

  for (const phase of PHASE_ORDER) {
    handlers.set(phase, []);
  }

  return {
    on(phase: LifecyclePhase, handler: LifecycleHandler): void {
      handlers.get(phase)!.push(handler);
    },

    current(): LifecyclePhase {
      return currentPhase;
    },

    async transition(phase: LifecyclePhase, kernel: KernelInterface): Promise<void> {
      logger.info('kernel.lifecycle', `Transitioning to phase: ${phase}`);
      currentPhase = phase;

      const phaseHandlers = handlers.get(phase) ?? [];
      for (const handler of phaseHandlers) {
        try {
          await handler(kernel);
        } catch (err) {
          logger.error('kernel.lifecycle', `Lifecycle handler error in phase "${phase}"`, { error: err });
          throw err;
        }
      }
    },
  };
}
