import { isDemoMode } from '@/lib/demo';
import { AppError } from '@/lib/errors';

/**
 * Context Collection queries real Prisma-backed sources (Projects, Tasks, Meetings, Files,
 * Memory, GitHub, Task Sessions, Workflow History) directly — there is no honest way to "demo"
 * discovering real organizational context without a real database, and building a second,
 * fixture-backed context simulation would be exactly the kind of duplicate system this mission's
 * own constraints (and DEC-041's identical call for Task Sessions) forbid. Declined outright in
 * Demo Mode, not faked.
 */
export function assertContextEngineAvailable(): void {
  if (isDemoMode()) {
    throw AppError.validation('The Context Engine requires a real database and is not available in Demo Mode.');
  }
}
