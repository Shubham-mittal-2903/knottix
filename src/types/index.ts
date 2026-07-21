export type SystemRole =
  | 'FOUNDER'
  | 'ADMINISTRATOR'
  | 'CREATIVE_HEAD'
  | 'DESIGNER'
  | 'DEVELOPER'
  | 'INTERN'
  | 'GUEST';

export type Module =
  | 'command'
  | 'workspace'
  | 'projects'
  | 'tasks'
  | 'meetings'
  | 'calendar'
  | 'clients'
  | 'creative'
  | 'finance'
  | 'team'
  | 'memory'
  | 'agents'
  | 'goals'
  | 'skills'
  | 'task-sessions'
  | 'context'
  | 'mcp'
  | 'notifications'
  | 'activity'
  | 'audit'
  | 'organizations'
  | 'workspaces'
  | 'approvals'
  | 'settings'
  | 'integrations';

export type PermissionScope =
  | 'ORGANIZATION'
  | 'WORKSPACE'
  | 'DEPARTMENT'
  | 'TEAM'
  | 'RESOURCE';

export interface ServerActionResponse<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  memberId: string;
  organizationId: string;
  organizationSlug: string;
  workspaceId: string | null;
  roleId: string;
  systemRole: SystemRole | null;
  isFounder: boolean;
  permissions: string[];
}
