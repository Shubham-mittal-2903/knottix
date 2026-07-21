import type { RegisterToolInput, ToolExecutionContext } from '@/lib/tools';
import { listClientsForWorkspace } from '@/lib/db/queries/client';
import { listFilesForWorkspace } from '@/lib/db/queries/file';

function requireWorkspace(context: ToolExecutionContext): string {
  if (!context.workspaceId) {
    throw new Error('This tool requires an active workspace');
  }
  return context.workspaceId;
}

/**
 * Tools shared across multiple AI Employees, registered once. Reuses the same Tool Engine
 * instance the Founder Executive Assistant's tools already register against — any agent can
 * list a tool by name in `allowedTools` regardless of who registered it first.
 */
export function createSharedEmployeeTools(): RegisterToolInput[] {
  return [
    {
      name: 'list_clients',
      description: 'List client accounts in the current workspace with industry, status, and contact details.',
      category: 'data',
      permission: 'clients:read',
      parameters: [],
      version: '1.0.0',
      handler: async (_input, context: ToolExecutionContext) => {
        const workspaceId = requireWorkspace(context);
        const clients = await listClientsForWorkspace(workspaceId, 30);
        return clients.map((c) => ({
          name: c.name,
          industry: c.industry,
          status: c.status,
          contactName: c.contactName,
          contactEmail: c.contactEmail,
        }));
      },
    },
    {
      name: 'list_recent_files',
      description: 'List recently uploaded files across projects in the current workspace.',
      category: 'data',
      permission: 'projects:read',
      parameters: [],
      version: '1.0.0',
      handler: async (_input, context: ToolExecutionContext) => {
        const workspaceId = requireWorkspace(context);
        const files = await listFilesForWorkspace(workspaceId, 20);
        return files.map((f) => ({
          filename: f.originalName,
          mimeType: f.mimeType,
          version: f.version,
          projectId: f.projectId,
        }));
      },
    },
  ];
}
