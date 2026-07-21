import { isDemoMode } from '@/lib/demo';
import { AppError } from '@/lib/errors';

/**
 * Task Sessions are, by definition, persisted `TaskSession` database rows that must survive a
 * server restart — there is no honest way to demo "session recovery" without a real database, and
 * building a second, in-memory-only Task Session simulation (mirroring what `goal-engine/engine.ts`
 * does for single goals) would be exactly the "duplicate execution logic" this mission's own
 * constraints forbid. Rather than silently degrade or fake persistence, Demo Mode declines Task
 * Sessions outright with an honest message — see DEC-0XX.
 */
export function assertTaskSessionsAvailable(): void {
  if (isDemoMode()) {
    throw AppError.validation('Task Sessions require a real database and are not available in Demo Mode.');
  }
}
