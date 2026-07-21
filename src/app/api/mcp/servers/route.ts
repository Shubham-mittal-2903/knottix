import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { assertMCPAvailable } from '@/lib/mcp/demo-guard';
import { registerMCPServer, connectMCPServer, listServerInfos } from '@/lib/mcp/manager';
import { registerMCPToolsAndSkills } from '@/lib/mcp/skills';
import { getSystem } from '@/lib/system/bootstrap';
import { createAuditLog } from '@/lib/db/queries/audit';
import { AppError, isAppError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ServerActionResponse } from '@/types';
import type { MCPServerInfo } from '@/lib/mcp/types';

const requestSchema = z
  .object({
    name: z.string().min(1).max(100),
    transport: z.enum(['STDIO', 'SSE', 'HTTP']),
    command: z.string().max(500).optional(),
    args: z.array(z.string().max(200)).max(50).optional(),
    url: z.string().url().max(1000).optional(),
    authToken: z.string().max(4000).optional(),
  })
  .refine((v) => (v.transport === 'STDIO' ? Boolean(v.command) : Boolean(v.url)), {
    message: 'STDIO servers require a command; SSE/HTTP servers require a url.',
  });

/**
 * "Discover configured MCP servers" (GET) and "Create an MCP Client Manager" (POST) — the Server
 * Registry the `/mcp` Mission Control page reads/writes. Requires `integrations:manage` to create
 * (mirrors the GitHub integration's own `connectGitHubAccount` gate); listing only requires
 * `integrations:read`, the same permission every other MCP route reuses (DEC-0XX).
 */
export async function GET(): Promise<NextResponse<ServerActionResponse<MCPServerInfo[]>>> {
  try {
    assertMCPAvailable();
    const user = await requirePermission('integrations:read');
    const servers = await listServerInfos(user.organizationId);
    return NextResponse.json({ success: true, data: servers });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.mcp.servers', toErrorMessage(error));
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 });
  }
}

/** Registers a new server, connects immediately (real handshake — never left in a fake
 *  "configured" limbo state), and — if it connected successfully — registers its tools/skills into
 *  this organization's `SkillEngine` right away, exactly like `bootstrap.ts`'s own
 *  `ensureOrganizationReady()` discovery pass, so a founder never has to restart/refresh to use a
 *  server they just added. */
export async function POST(req: Request): Promise<NextResponse<ServerActionResponse<MCPServerInfo>>> {
  try {
    assertMCPAvailable();
    const user = await requirePermission('integrations:manage');

    const body = requestSchema.safeParse(await req.json());
    if (!body.success) throw AppError.validation('Invalid request body', { issues: body.error.issues });

    const record = await registerMCPServer({
      organizationId: user.organizationId,
      name: body.data.name,
      transport: body.data.transport,
      command: body.data.command,
      args: body.data.args,
      url: body.data.url,
      authToken: body.data.authToken,
      createdBy: user.id,
    });

    const info = await connectMCPServer(record.id);
    if (info.tools.length > 0) {
      const system = await getSystem();
      registerMCPToolsAndSkills(system.intelligence, system.skillEngine, info);
    }

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.id,
      action: 'SETTINGS_CHANGE',
      entityType: 'mcp-server',
      entityId: record.id,
      entityName: record.name,
      after: { status: info.server.status, transport: record.transport },
    });

    return NextResponse.json({ success: true, data: info });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    logger.error('api.mcp.servers', toErrorMessage(error));
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 });
  }
}
