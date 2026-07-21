import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { MCPPromptDescriptor, MCPResourceDescriptor, MCPServerRecord, MCPToolDescriptor } from './types';

const CONNECT_TIMEOUT_MS = 10_000;
const REQUEST_TIMEOUT_MS = 15_000;

export interface ConnectedMCPClient {
  client: Client;
  transport: Transport;
}

/** Builds the real transport for a configured server — stdio spawns the actual executable
 *  (`command`/`args`, exactly as configured, never a shell-interpolated string); SSE/HTTP connect
 *  to the actual configured URL, with a bearer token header when the server has one on file. */
function buildTransport(server: MCPServerRecord, authToken: string | null): Transport {
  if (server.transport === 'STDIO') {
    if (!server.command) throw new Error(`MCP server "${server.name}" has no command configured for stdio transport.`);
    return new StdioClientTransport({ command: server.command, args: server.args });
  }

  if (!server.url) throw new Error(`MCP server "${server.name}" has no URL configured for ${server.transport} transport.`);
  const url = new URL(server.url);
  const requestInit: RequestInit | undefined = authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : undefined;

  return server.transport === 'SSE'
    ? new SSEClientTransport(url, requestInit ? { requestInit } : undefined)
    : new StreamableHTTPClientTransport(url, requestInit ? { requestInit } : undefined);
}

/** Real MCP handshake — `Client.connect()` performs the actual `initialize` request/response with
 *  the server, negotiating protocol version and capabilities. Never fabricated: if the server
 *  doesn't respond, this throws, and the caller (`manager.ts`) is responsible for marking the
 *  server's real status accordingly. */
export async function connectMCPClient(server: MCPServerRecord, authToken: string | null): Promise<ConnectedMCPClient> {
  const transport = buildTransport(server, authToken);
  const client = new Client({ name: 'knottix', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport, { timeout: CONNECT_TIMEOUT_MS });
  return { client, transport };
}

/** Fetches whatever the server actually declared support for at `initialize` time — a server with
 *  no `tools` capability is never asked `listTools`, and a server that returns an error for a
 *  capability it DID declare degrades to an empty list for that capability rather than failing the
 *  whole connection. Every descriptor is mapped directly from the server's own response. */
export async function fetchServerCapabilities(client: Client): Promise<{
  tools: MCPToolDescriptor[];
  resources: MCPResourceDescriptor[];
  prompts: MCPPromptDescriptor[];
}> {
  const capabilities = client.getServerCapabilities();

  const [tools, resources, prompts] = await Promise.all([
    capabilities?.tools
      ? client
          .listTools(undefined, { timeout: REQUEST_TIMEOUT_MS })
          .then((r) => r.tools)
          .catch(() => [])
      : Promise.resolve([]),
    capabilities?.resources
      ? client
          .listResources(undefined, { timeout: REQUEST_TIMEOUT_MS })
          .then((r) => r.resources)
          .catch(() => [])
      : Promise.resolve([]),
    capabilities?.prompts
      ? client
          .listPrompts(undefined, { timeout: REQUEST_TIMEOUT_MS })
          .then((r) => r.prompts)
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  return {
    tools: tools.map((t) => ({ name: t.name, description: t.description ?? null, inputSchema: (t.inputSchema ?? {}) as Record<string, unknown> })),
    resources: resources.map((r) => ({ uri: r.uri, name: r.name, description: r.description ?? null, mimeType: r.mimeType ?? null })),
    prompts: prompts.map((p) => ({
      name: p.name,
      description: p.description ?? null,
      arguments: (p.arguments ?? []).map((a) => ({ name: a.name, description: a.description ?? null, required: a.required ?? false })),
    })),
  };
}

export { REQUEST_TIMEOUT_MS };
