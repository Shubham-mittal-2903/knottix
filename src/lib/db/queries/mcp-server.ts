import { db } from '@/lib/db/prisma';
import { AppError } from '@/lib/errors';
import type { Prisma } from '@/generated/prisma/client';
import { encryptSecret, decryptSecret, type EncryptedPayload } from '@/lib/crypto/encryption';
import type {
  CreateMCPServerInput,
  MCPCallLogEntry,
  MCPCallType,
  MCPServerRecord,
  UpdateMCPServerInput,
} from '@/lib/mcp/types';

interface MCPServerRow {
  id: string;
  organizationId: string;
  name: string;
  transport: MCPServerRecord['transport'];
  command: string | null;
  args: Prisma.JsonValue;
  url: string | null;
  authToken: Prisma.JsonValue;
  isActive: boolean;
  status: MCPServerRecord['status'];
  serverVersion: string | null;
  lastConnectedAt: Date | null;
  lastError: string | null;
  consecutiveFailures: number;
  latencyMs: number | null;
  toolCount: number;
  resourceCount: number;
  promptCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

function toDomain(row: MCPServerRow): MCPServerRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    transport: row.transport,
    command: row.command,
    args: Array.isArray(row.args) ? (row.args as string[]) : [],
    url: row.url,
    hasAuthToken: row.authToken !== null,
    isActive: row.isActive,
    status: row.status,
    serverVersion: row.serverVersion,
    lastConnectedAt: row.lastConnectedAt?.getTime() ?? null,
    lastError: row.lastError,
    consecutiveFailures: row.consecutiveFailures,
    latencyMs: row.latencyMs,
    toolCount: row.toolCount,
    resourceCount: row.resourceCount,
    promptCount: row.promptCount,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    createdBy: row.createdBy,
  };
}

export async function createMCPServer(input: CreateMCPServerInput): Promise<MCPServerRecord> {
  const row = await db.mCPServer.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      transport: input.transport,
      command: input.command ?? null,
      args: (input.args ?? []) as unknown as Prisma.InputJsonValue,
      url: input.url ?? null,
      authToken: input.authToken ? (encryptSecret(input.authToken) as unknown as Prisma.InputJsonValue) : undefined,
      createdBy: input.createdBy,
    },
  });
  return toDomain(row);
}

export async function findMCPServerById(id: string): Promise<MCPServerRecord | null> {
  const row = await db.mCPServer.findUnique({ where: { id } });
  return row ? toDomain(row) : null;
}

export async function requireMCPServer(id: string): Promise<MCPServerRecord> {
  const server = await findMCPServerById(id);
  if (!server) throw AppError.notFound('MCP server', id);
  return server;
}

/** Only ever called by the MCP Client Manager right before opening a connection — the decrypted
 *  token never leaves that call site. */
export async function getMCPServerAuthToken(id: string): Promise<string | null> {
  const row = await db.mCPServer.findUnique({ where: { id }, select: { authToken: true } });
  if (!row?.authToken) return null;
  return decryptSecret(row.authToken as unknown as EncryptedPayload);
}

export async function listMCPServersForOrganization(organizationId: string): Promise<MCPServerRecord[]> {
  const rows = await db.mCPServer.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
  return rows.map(toDomain);
}

export async function updateMCPServer(id: string, input: UpdateMCPServerInput): Promise<MCPServerRecord> {
  const row = await db.mCPServer.update({
    where: { id },
    data: {
      isActive: input.isActive,
      status: input.status,
      serverVersion: input.serverVersion,
      lastConnectedAt: input.lastConnectedAt,
      lastError: input.lastError,
      consecutiveFailures: input.consecutiveFailures,
      latencyMs: input.latencyMs,
      toolCount: input.toolCount,
      resourceCount: input.resourceCount,
      promptCount: input.promptCount,
    },
  });
  return toDomain(row);
}

export async function deleteMCPServer(id: string): Promise<void> {
  await db.mCPServer.delete({ where: { id } });
}

export async function recordMCPCall(input: {
  serverId: string;
  type: MCPCallType;
  name: string;
  success: boolean;
  durationMs: number;
  error?: string | null;
  requestedBy?: string | null;
}): Promise<void> {
  await db.mCPCallLog.create({
    data: {
      serverId: input.serverId,
      type: input.type,
      name: input.name,
      success: input.success,
      durationMs: input.durationMs,
      error: input.error ?? null,
      requestedBy: input.requestedBy ?? null,
    },
  });
}

export async function listRecentMCPCalls(organizationId: string, limit = 50): Promise<MCPCallLogEntry[]> {
  const rows = await db.mCPCallLog.findMany({
    where: { server: { organizationId } },
    include: { server: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.map((row) => ({
    id: row.id,
    serverId: row.serverId,
    serverName: row.server.name,
    type: row.type,
    name: row.name,
    success: row.success,
    durationMs: row.durationMs,
    error: row.error,
    requestedBy: row.requestedBy,
    createdAt: row.createdAt.getTime(),
  }));
}
