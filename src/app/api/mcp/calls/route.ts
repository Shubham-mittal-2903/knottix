import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/session';
import { assertMCPAvailable } from '@/lib/mcp/demo-guard';
import { listRecentMCPCalls } from '@/lib/db/queries/mcp-server';
import { isAppError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ServerActionResponse } from '@/types';
import type { MCPCallLogEntry } from '@/lib/mcp/types';

/** "Recent Calls, Failures" — reads the real `MCPCallLog` rows every tool/resource/prompt call
 *  writes via `manager.ts`'s `loggedCall()`, scoped to this organization's own servers. */
export async function GET(): Promise<NextResponse<ServerActionResponse<MCPCallLogEntry[]>>> {
  try {
    assertMCPAvailable();
    const user = await requirePermission('integrations:read');
    const calls = await listRecentMCPCalls(user.organizationId, 50);
    return NextResponse.json({ success: true, data: calls });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.mcp.calls', toErrorMessage(error));
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 });
  }
}
