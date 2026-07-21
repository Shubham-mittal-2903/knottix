import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/session';
import { assertMCPAvailable } from '@/lib/mcp/demo-guard';
import { requireMCPServer } from '@/lib/db/queries/mcp-server';
import { removeMCPServer } from '@/lib/mcp/manager';
import { createAuditLog } from '@/lib/db/queries/audit';
import { AppError, isAppError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ServerActionResponse } from '@/types';

/** Disconnects and permanently removes one MCP server. `requireMCPServer` looks up by id alone
 *  (it's a process-wide query, same as `requireTaskSession`/`requireWorkflowExecution`), so this
 *  route re-checks `organizationId` itself — the same cross-tenant guard every other
 *  by-id resource route in this codebase applies before acting on a record found only by UUID. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ serverId: string }> },
): Promise<NextResponse<ServerActionResponse<{ removed: true }>>> {
  try {
    assertMCPAvailable();
    const user = await requirePermission('integrations:manage');
    const { serverId } = await params;

    const server = await requireMCPServer(serverId);
    if (server.organizationId !== user.organizationId) throw AppError.forbidden();

    await removeMCPServer(serverId);

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.id,
      action: 'SETTINGS_CHANGE',
      entityType: 'mcp-server',
      entityId: serverId,
      entityName: server.name,
      after: { status: 'REMOVED' },
    });

    return NextResponse.json({ success: true, data: { removed: true } });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.mcp.servers.delete', toErrorMessage(error));
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 });
  }
}
