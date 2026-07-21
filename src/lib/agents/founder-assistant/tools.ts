import type { RegisterToolInput, ToolExecutionContext } from '@/lib/tools';
import type { MemoryEngine } from '@/lib/memory';
import { listProjectsForWorkspace } from '@/lib/db/queries/project';
import { listTasksForWorkspace } from '@/lib/db/queries/task';
import { listMeetingsForWorkspace } from '@/lib/db/queries/meeting';

function requireWorkspace(context: ToolExecutionContext): string {
  if (!context.workspaceId) {
    throw new Error('This tool requires an active workspace');
  }
  return context.workspaceId;
}

export function createFounderAssistantTools(deps: { memoryEngine: MemoryEngine }): RegisterToolInput[] {
  return [
    {
      name: 'read_organization_memory',
      description: "Read the organization's permanent knowledge base for relevant facts, decisions, and context.",
      category: 'data',
      permission: 'memory:read',
      parameters: [
        {
          name: 'query',
          type: 'string',
          description: 'Optional keyword/text search over memory content and titles',
          required: false,
        },
        {
          name: 'limit',
          type: 'number',
          description: 'Maximum number of memory entries to return (default 10)',
          required: false,
        },
      ],
      version: '1.0.0',
      handler: async (input, context: ToolExecutionContext) => {
        const limit = typeof input.limit === 'number' ? input.limit : 10;
        const search = typeof input.query === 'string' ? input.query : undefined;

        const page = await deps.memoryEngine.query(
          {
            userId: context.userId,
            memberId: '',
            organizationId: context.organizationId,
            workspaceId: context.workspaceId,
            roleId: '',
            isFounder: false,
            permissions: [],
          },
          { namespace: 'organization', scopeId: context.organizationId, status: 'active', search },
          1,
          limit,
        );

        return page.entries.map((entry) => ({
          title: entry.title,
          summary: entry.summary ?? entry.content,
          sourceType: entry.sourceType,
          createdAt: entry.createdAt,
        }));
      },
    },
    {
      name: 'list_projects',
      description: 'List active projects in the current workspace with status, priority, and deadlines.',
      category: 'data',
      permission: 'projects:read',
      parameters: [],
      version: '1.0.0',
      handler: async (_input, context: ToolExecutionContext) => {
        const workspaceId = requireWorkspace(context);
        const projects = await listProjectsForWorkspace(workspaceId, 30);
        return projects.map((p) => ({
          title: p.title,
          status: p.status,
          priority: p.priority,
          dueDate: p.dueDate,
        }));
      },
    },
    {
      name: 'list_tasks',
      description: 'List tasks across the current workspace with status, priority, and due dates.',
      category: 'data',
      permission: 'projects:read',
      parameters: [],
      version: '1.0.0',
      handler: async (_input, context: ToolExecutionContext) => {
        const workspaceId = requireWorkspace(context);
        const tasks = await listTasksForWorkspace(workspaceId, 40);
        return tasks.map((t) => ({
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
        }));
      },
    },
    {
      name: 'list_meetings',
      description: 'List recent and upcoming meetings in the current workspace with summaries.',
      category: 'data',
      permission: 'projects:read',
      parameters: [],
      version: '1.0.0',
      handler: async (_input, context: ToolExecutionContext) => {
        const workspaceId = requireWorkspace(context);
        const meetings = await listMeetingsForWorkspace(workspaceId, 20);
        return meetings.map((m) => ({
          title: m.title,
          status: m.status,
          startTime: m.startTime,
          summary: m.summary,
        }));
      },
    },
  ];
}
