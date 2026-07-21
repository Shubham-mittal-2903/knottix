import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/session';
import { assertMCPAvailable } from '@/lib/mcp/demo-guard';
import { requireMCPServer } from '@/lib/db/queries/mcp-server';
import { connectMCPServer } from '@/lib/mcp/manager';
import { registerMCPToolsAndSkills } from '@/lib/mcp/skills';
import { getSystem } from '@/lib/system/bootstrap';
import { AppError, isAppError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ServerActionResponse } from '@/types';
import type { MCPServerInfo } from '@/lib/mcp/types';

/** Forces a fresh reconnect for one server — backs the "Refresh MCP servers" per-row action on
 *  the `/mcp` page. Re-registers tools/skills for real on every successful reconnect (idempotent —
 *  duplicates are swallowed, see `registerMCPToolsAndSkills`'s own doc comment). */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ serverId: string }> },
): Promise<NextResponse<ServerActionResponse<MCPServerInfo>>> {
  try {
    assertMCPAvailable();
    const user = await requirePermission('integrations:update');
    const { serverId } = await params;

    const server = await requireMCPServer(serverId);
    if (server.organizationId !== user.organizationId) throw AppError.forbidden();

    const info = await connectMCPServer(serverId);
    if (info.tools.length > 0) {
      const system = await getSystem();
      registerMCPToolsAndSkills(system.intelligence, system.skillEngine, info);
    }

    return NextResponse.json({ success: true, data: info });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.mcp.servers.refresh', toErrorMessage(error));
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 });
  }
}
