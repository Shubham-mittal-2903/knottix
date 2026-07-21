import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  createMCPServer,
  deleteMCPServer,
  getMCPServerAuthToken,
  listMCPServersForOrganization,
  recordMCPCall,
  requireMCPServer,
  updateMCPServer,
} from '@/lib/db/queries/mcp-server';
import { logger } from '@/lib/logger';
import { connectMCPClient, fetchServerCapabilities } from './client';
import type {
  CreateMCPServerInput,
  MCPCallType,
  MCPPromptDescriptor,
  MCPResourceDescriptor,
  MCPServerInfo,
  MCPServerRecord,
  MCPToolDescriptor,
} from './types';

const MAX_CONSECUTIVE_FAILURES = 3;
const CALL_TIMEOUT_MS = 15_000;
const CONNECT_RETRIES = 2;

interface LiveConnection {
  client: Client;
  tools: MCPToolDescriptor[];
  resources: MCPResourceDescriptor[];
  prompts: MCPPromptDescriptor[];
}

/** globalThis-anchored, not a bare module-level `const` — the same fix `goal-engine`'s demo store
 *  and `context-engine`'s skill index already needed (IDEA-043): Next.js dev mode (Turbopack) can
 *  re-instantiate a route's module graph independently per route file, which would otherwise give
 *  different API routes different connection maps for the exact same live MCP session. */
const globalForMCP = globalThis as unknown as { __knottixMCPConnections?: Map<string, LiveConnection> };
const liveConnections = (globalForMCP.__knottixMCPConnections ??= new Map<string, LiveConnection>());

export async function registerMCPServer(input: CreateMCPServerInput): Promise<MCPServerRecord> {
  return createMCPServer(input);
}

export async function removeMCPServer(serverId: string): Promise<void> {
  await disconnectMCPServer(serverId);
  await deleteMCPServer(serverId);
}

async function withRetry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        logger.warn('mcp.manager', `Connection attempt ${attempt}/${retries} failed, retrying`, {
          error: error instanceof Error ? error.message : String(error),
        });
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }
  }
  throw lastError;
}

/** Connects to one configured server for real — real handshake, real capability fetch, real
 *  status persisted to the database either way (CONNECTED with real counts, or ERROR with the
 *  real failure message and an incremented `consecutiveFailures`). Never throws — a connection
 *  failure is a normal, expected outcome this function reports honestly, not an exception the
 *  caller has to guard against. */
export async function connectMCPServer(serverId: string): Promise<MCPServerInfo> {
  const server = await requireMCPServer(serverId);
  const startedAt = Date.now();

  try {
    const authToken = await getMCPServerAuthToken(serverId);
    const { client } = await withRetry(() => connectMCPClient(server, authToken), CONNECT_RETRIES);
    const capabilities = await fetchServerCapabilities(client);
    const latencyMs = Date.now() - startedAt;

    liveConnections.set(serverId, { client, ...capabilities });

    const updated = await updateMCPServer(serverId, {
      status: 'CONNECTED',
      serverVersion: client.getServerVersion()?.version ?? null,
      lastConnectedAt: new Date(),
      lastError: null,
      consecutiveFailures: 0,
      latencyMs,
      toolCount: capabilities.tools.length,
      resourceCount: capabilities.resources.length,
      promptCount: capabilities.prompts.length,
    });

    logger.info('mcp.manager', `Connected to MCP server: ${server.name}`, { latencyMs, tools: capabilities.tools.length });
    return { server: updated, ...capabilities };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const updated = await updateMCPServer(serverId, {
      status: 'ERROR',
      lastError: message,
      consecutiveFailures: server.consecutiveFailures + 1,
    });
    logger.warn('mcp.manager', `Failed to connect to MCP server: ${server.name}`, { error: message });
    return { server: updated, tools: [], resources: [], prompts: [] };
  }
}

export async function disconnectMCPServer(serverId: string): Promise<void> {
  const connection = liveConnections.get(serverId);
  if (connection) {
    await connection.client.close().catch(() => undefined);
    liveConnections.delete(serverId);
  }
  await updateMCPServer(serverId, { status: 'DISCONNECTED' }).catch(() => undefined);
}

/**
 * Discover → connect — the Client Manager's core responsibility, called once per organization
 * readiness pass (mirrors every other subsystem's `ensureOrganizationReady` registration). A
 * server already connected is left alone; one that has failed `MAX_CONSECUTIVE_FAILURES` times in
 * a row is left in its honest `ERROR` state rather than retried automatically on every request —
 * reconnecting it requires an explicit "Refresh MCP servers" (Command Center) or a real recovery.
 * Each server's connection attempt is isolated — one broken server never blocks the others.
 */
export async function discoverAndConnectServers(organizationId: string): Promise<MCPServerInfo[]> {
  const servers = await listMCPServersForOrganization(organizationId);
  const active = servers.filter((s) => s.isActive);

  return Promise.all(
    active.map(async (server) => {
      if (liveConnections.has(server.id)) return getServerInfo(server.id);
      if (server.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && server.status === 'ERROR') {
        return { server, tools: [], resources: [], prompts: [] };
      }
      return connectMCPServer(server.id);
    }),
  );
}

/** Forces a fresh reconnect regardless of failure history — backs the Command Center's "Refresh
 *  MCP servers". */
export async function refreshMCPServers(organizationId: string): Promise<MCPServerInfo[]> {
  const servers = await listMCPServersForOrganization(organizationId);
  const active = servers.filter((s) => s.isActive);
  return Promise.all(active.map((s) => connectMCPServer(s.id)));
}

export async function getServerInfo(serverId: string): Promise<MCPServerInfo> {
  const server = await requireMCPServer(serverId);
  const connection = liveConnections.get(serverId);
  if (!connection) return { server, tools: [], resources: [], prompts: [] };
  return { server, tools: connection.tools, resources: connection.resources, prompts: connection.prompts };
}

export async function listServerInfos(organizationId: string): Promise<MCPServerInfo[]> {
  const servers = await listMCPServersForOrganization(organizationId);
  return Promise.all(servers.map((s) => getServerInfo(s.id)));
}

export function isServerConnected(serverId: string): boolean {
  return liveConnections.has(serverId);
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

/** Every real MCP request goes through here — real work, timed out, and always logged to
 *  `MCPCallLog` (success or failure) via `recordMCPCall()`, satisfying "log every MCP request" /
 *  "prompt usage must be logged" with one shared mechanism. */
async function loggedCall<T>(serverId: string, type: MCPCallType, name: string, requestedBy: string | null, fn: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await withTimeout(fn(), CALL_TIMEOUT_MS, `MCP ${type.toLowerCase()} call "${name}"`);
    await recordMCPCall({ serverId, type, name, success: true, durationMs: Date.now() - startedAt, requestedBy });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordMCPCall({ serverId, type, name, success: false, durationMs: Date.now() - startedAt, error: message, requestedBy });
    throw error;
  }
}

export async function callMCPTool(serverId: string, toolName: string, args: Record<string, unknown>, requestedBy: string | null): Promise<unknown> {
  const connection = liveConnections.get(serverId);
  if (!connection) throw new Error('MCP server is not connected.');
  return loggedCall(serverId, 'TOOL', toolName, requestedBy, () => connection.client.callTool({ name: toolName, arguments: args }));
}

export async function readMCPResource(serverId: string, uri: string, requestedBy: string | null): Promise<unknown> {
  const connection = liveConnections.get(serverId);
  if (!connection) throw new Error('MCP server is not connected.');
  return loggedCall(serverId, 'RESOURCE', uri, requestedBy, () => connection.client.readResource({ uri }));
}

export async function getMCPPrompt(serverId: string, promptName: string, args: Record<string, string>, requestedBy: string | null): Promise<unknown> {
  const connection = liveConnections.get(serverId);
  if (!connection) throw new Error('MCP server is not connected.');
  return loggedCall(serverId, 'PROMPT', promptName, requestedBy, () => connection.client.getPrompt({ name: promptName, arguments: args }));
}
