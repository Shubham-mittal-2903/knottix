import { logger } from '@/lib/logger';

export function fireAndForget(action: string, fn: () => Promise<void>): void {
  fn().catch((error) => {
    logger.error('db.persist', `Fire-and-forget persistence failed: ${action}`, {
      error: error instanceof Error ? error.message : String(error),
    });
  });
}
