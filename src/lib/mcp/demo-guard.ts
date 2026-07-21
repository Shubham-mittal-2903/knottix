import { isDemoMode } from '@/lib/demo';
import { AppError } from '@/lib/errors';

/**
 * MCP servers are real, Founder-configured external processes/endpoints — there is no honest way
 * to "demo" a connection to an external system without a real database (to store server configs)
 * and, for stdio servers, a real local process to spawn. Faking a "connected" server would
 * directly violate "never fake a connected server" — declined outright in Demo Mode, the same
 * DEC-041/DEC-042 precedent every other database-dependent module already follows.
 */
export function assertMCPAvailable(): void {
  if (isDemoMode()) {
    throw AppError.validation('MCP requires a real database and is not available in Demo Mode.');
  }
}
