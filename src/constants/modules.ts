import type { Module } from '@/types';

export const MODULES: Record<Module, { label: string; description: string }> = {
  command: { label: 'Mission Control', description: 'Executive home and company health' },
  workspace: { label: 'My Work', description: 'Personal workspace home' },
  projects: { label: 'Projects', description: 'Project lifecycle and task management' },
  tasks: { label: 'Tasks', description: 'Work items across every project' },
  meetings: { label: 'Meetings', description: 'Scheduled and past meetings' },
  calendar: { label: 'Calendar', description: 'Upcoming meetings by day' },
  clients: { label: 'Clients', description: 'Client profiles and intelligence' },
  creative: { label: 'Creative', description: 'Design assets and review workflows' },
  finance: { label: 'Finance', description: 'Revenue, expenses, and invoices' },
  team: { label: 'Team', description: 'Members, roles, and permissions' },
  memory: { label: 'Knowledge', description: 'Organizational memory and recall' },
  agents: { label: 'AI', description: 'Founder Executive Assistant' },
  goals: { label: 'Goals', description: 'Autonomous goal planning and execution' },
  skills: { label: 'Skills', description: 'Discoverable capabilities the Goal Engine composes into plans' },
  'task-sessions': { label: 'Task Sessions', description: 'Long-running autonomous work sessions' },
  context: { label: 'Context Inspector', description: 'What Knottix already knows before it plans or executes a goal' },
  mcp: { label: 'MCP', description: 'External MCP servers and the tools, resources, and prompts they provide' },
  notifications: { label: 'Notifications', description: 'Mentions, assignments, and alerts' },
  activity: { label: 'Activity', description: 'Organization-wide activity timeline' },
  audit: { label: 'Audit', description: 'Security and compliance audit log' },
  organizations: { label: 'Organizations', description: 'Tenant organizations' },
  workspaces: { label: 'Workspaces', description: 'Workspaces within the organization' },
  approvals: { label: 'Approvals', description: 'Pending decisions awaiting sign-off' },
  settings: { label: 'Settings', description: 'System configuration and health' },
  integrations: { label: 'Integrations', description: 'Connected external services' },
} as const;

export const ALL_MODULES: Module[] = Object.keys(MODULES) as Module[];
