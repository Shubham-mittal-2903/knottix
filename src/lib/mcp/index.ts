export type {
  MCPTransportType,
  MCPServerStatus,
  MCPCallType,
  MCPToolDescriptor,
  MCPResourceDescriptor,
  MCPPromptDescriptor,
  MCPServerRecord,
  MCPServerInfo,
  MCPCallLogEntry,
  CreateMCPServerInput,
  UpdateMCPServerInput,
} from './types';

export {
  registerMCPServer,
  removeMCPServer,
  connectMCPServer,
  disconnectMCPServer,
  discoverAndConnectServers,
  refreshMCPServers,
  getServerInfo,
  listServerInfos,
  isServerConnected,
  callMCPTool,
  readMCPResource,
  getMCPPrompt,
} from './manager';

export { assertMCPAvailable } from './demo-guard';
