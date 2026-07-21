import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/session';
import { assertMCPAvailable } from '@/lib/mcp/demo-guard';
import { refreshMCPServers } from '@/lib/mcp/manager';
import { registerMCPToolsAndSkills } from '@/lib/mcp/skills';
import { getSystem } from '@/lib/system/bootstrap';
import { isAppError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ServerActionResponse } from '@/types';
import type { MCPServerInfo } from '@/lib/mcp/types';

/** "Refresh MCP servers" — forces every configured server for this organization to reconnect,
 *  backing both the `/mcp` page's bulk action and the Command Center's `mcp:refresh` step. */
export async function POST(): Promise<NextResponse<ServerActionResponse<MCPServerInfo[]>>> {
  try {
    assertMCPAvailable();
    const user = await requirePermission('integrations:update');

    const servers = await refreshMCPServers(user.organizationId);
    const system = await getSystem();
    for (const info of servers) {
      if (info.tools.length > 0) registerMCPToolsAndSkills(system.intelligence, system.skillEngine, info);
    }

    return NextResponse.json({ success: true, data: servers });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.mcp.servers.refresh-all', toErrorMessage(error));
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 });
  }
}
