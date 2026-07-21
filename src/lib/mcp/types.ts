export type MCPTransportType = 'STDIO' | 'SSE' | 'HTTP';
export type MCPServerStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
export type MCPCallType = 'TOOL' | 'RESOURCE' | 'PROMPT';

/** Real MCP tool/resource/prompt descriptors — always populated directly from a connected
 *  server's own `listTools`/`listResources`/`listPrompts` response, never hand-authored. */
export interface MCPToolDescriptor {
  name: string;
  description: string | null;
  inputSchema: Record<string, unknown>;
}

export interface MCPResourceDescriptor {
  uri: string;
  name: string;
  description: string | null;
  mimeType: string | null;
}

export interface MCPPromptDescriptor {
  name: string;
  description: string | null;
  arguments: { name: string; description: string | null; required: boolean }[];
}

export interface MCPServerRecord {
  id: string;
  organizationId: string;
  name: string;
  transport: MCPTransportType;
  command: string | null;
  args: string[];
  url: string | null;
  /** Never the actual secret — just whether one is configured, for the MCP page's display. */
  hasAuthToken: boolean;
  isActive: boolean;
  status: MCPServerStatus;
  serverVersion: string | null;
  lastConnectedAt: number | null;
  lastError: string | null;
  consecutiveFailures: number;
  latencyMs: number | null;
  toolCount: number;
  resourceCount: number;
  promptCount: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string | null;
}

/** The Server Registry entry the MCP page and Skill/Context Engine integrations read — DB record
 *  plus whatever the live connection (if any) actually reports right now. */
export interface MCPServerInfo {
  server: MCPServerRecord;
  tools: MCPToolDescriptor[];
  resources: MCPResourceDescriptor[];
  prompts: MCPPromptDescriptor[];
}

export interface MCPCallLogEntry {
  id: string;
  serverId: string;
  serverName: string;
  type: MCPCallType;
  name: string;
  success: boolean;
  durationMs: number;
  error: string | null;
  requestedBy: string | null;
  createdAt: number;
}

export interface CreateMCPServerInput {
  organizationId: string;
  name: string;
  transport: MCPTransportType;
  command?: string;
  args?: string[];
  url?: string;
  /** Plaintext — encrypted once, at write time, via `src/lib/crypto/encryption.ts`; never stored raw. */
  authToken?: string;
  createdBy: string;
}

export interface UpdateMCPServerInput {
  isActive?: boolean;
  status?: MCPServerStatus;
  serverVersion?: string | null;
  lastConnectedAt?: Date | null;
  lastError?: string | null;
  consecutiveFailures?: number;
  latencyMs?: number | null;
  toolCount?: number;
  resourceCount?: number;
  promptCount?: number;
}
