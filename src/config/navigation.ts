import {
  Activity,
  Bot,
  Building2,
  Calendar,
  CalendarDays,
  CheckSquare,
  FolderKanban,
  LayoutGrid,
  ListChecks,
  Network,
  Plug,
  Radar,
  Rocket,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { Module } from '@/types';

export type NavSection = 'Overview' | 'Work' | 'Intelligence' | 'Organization' | 'System';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  module: Module;
  requiredPermission: string | null;
  section: NavSection;
}

/** Founder Experience — Mission Control */
export const founderNavigation: NavItem[] = [
  { label: 'Mission Control', href: '/command', icon: LayoutGrid, module: 'command', requiredPermission: 'command:read', section: 'Overview' },
  { label: 'Projects', href: '/projects', icon: FolderKanban, module: 'projects', requiredPermission: 'projects:read', section: 'Work' },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare, module: 'tasks', requiredPermission: 'projects:read', section: 'Work' },
  { label: 'Meetings', href: '/meetings', icon: Calendar, module: 'meetings', requiredPermission: 'projects:read', section: 'Work' },
  { label: 'Knowledge', href: '/memory', icon: Sparkles, module: 'memory', requiredPermission: 'memory:read', section: 'Intelligence' },
  { label: 'AI', href: '/agents', icon: Bot, module: 'agents', requiredPermission: 'agents:read', section: 'Intelligence' },
  { label: 'Goals', href: '/goals', icon: Rocket, module: 'goals', requiredPermission: 'workflows:read', section: 'Intelligence' },
  { label: 'Skills', href: '/skills', icon: Wrench, module: 'skills', requiredPermission: 'workflows:read', section: 'Intelligence' },
  { label: 'Task Sessions', href: '/task-sessions', icon: ListChecks, module: 'task-sessions', requiredPermission: 'workflows:read', section: 'Intelligence' },
  { label: 'Context Inspector', href: '/context', icon: Radar, module: 'context', requiredPermission: 'workflows:read', section: 'Intelligence' },
  { label: 'MCP', href: '/mcp', icon: Network, module: 'mcp', requiredPermission: 'integrations:read', section: 'Intelligence' },
  { label: 'Organizations', href: '/organizations', icon: Building2, module: 'organizations', requiredPermission: null, section: 'Organization' },
  { label: 'Workspaces', href: '/workspaces', icon: Building2, module: 'workspaces', requiredPermission: null, section: 'Organization' },
  { label: 'Team', href: '/team', icon: Users, module: 'team', requiredPermission: 'team:read', section: 'Organization' },
  { label: 'Activity', href: '/activity', icon: Activity, module: 'activity', requiredPermission: null, section: 'System' },
  { label: 'Audit', href: '/audit', icon: ScrollText, module: 'audit', requiredPermission: 'audit:read', section: 'System' },
  { label: 'Integrations', href: '/settings/integrations', icon: Plug, module: 'integrations', requiredPermission: 'integrations:read', section: 'System' },
  { label: 'Settings', href: '/settings', icon: Settings, module: 'settings', requiredPermission: 'settings:read', section: 'System' },
];

/** Employee Experience — Workspace */
export const employeeNavigation: NavItem[] = [
  { label: 'My Work', href: '/workspace', icon: LayoutGrid, module: 'workspace', requiredPermission: null, section: 'Overview' },
  { label: 'Projects', href: '/projects', icon: FolderKanban, module: 'projects', requiredPermission: 'projects:read', section: 'Work' },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare, module: 'tasks', requiredPermission: 'projects:read', section: 'Work' },
  { label: 'Meetings', href: '/meetings', icon: Calendar, module: 'meetings', requiredPermission: 'projects:read', section: 'Work' },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays, module: 'calendar', requiredPermission: null, section: 'Work' },
  { label: 'Knowledge', href: '/memory', icon: Sparkles, module: 'memory', requiredPermission: 'memory:read', section: 'Intelligence' },
  { label: 'AI', href: '/agents', icon: Bot, module: 'agents', requiredPermission: 'agents:read', section: 'Intelligence' },
  { label: 'Goals', href: '/goals', icon: Rocket, module: 'goals', requiredPermission: 'workflows:read', section: 'Intelligence' },
  { label: 'Skills', href: '/skills', icon: Wrench, module: 'skills', requiredPermission: 'workflows:read', section: 'Intelligence' },
  { label: 'Task Sessions', href: '/task-sessions', icon: ListChecks, module: 'task-sessions', requiredPermission: 'workflows:read', section: 'Intelligence' },
  { label: 'Context Inspector', href: '/context', icon: Radar, module: 'context', requiredPermission: 'workflows:read', section: 'Intelligence' },
  { label: 'MCP', href: '/mcp', icon: Network, module: 'mcp', requiredPermission: 'integrations:read', section: 'Intelligence' },
  { label: 'Integrations', href: '/settings/integrations', icon: Plug, module: 'integrations', requiredPermission: 'integrations:read', section: 'System' },
  { label: 'Settings', href: '/settings', icon: Settings, module: 'settings', requiredPermission: 'settings:read', section: 'System' },
];

export function getNavForUser(userPermissions: string[], isFounder: boolean): NavItem[] {
  const source = isFounder ? founderNavigation : employeeNavigation;
  if (isFounder) return source;
  return source.filter((item) => item.requiredPermission === null || userPermissions.includes(item.requiredPermission));
}

export const founderOnlyModules: Module[] = ['organizations', 'workspaces', 'audit'];

export interface CommandAction {
  id: string;
  label: string;
  group: 'Navigate' | 'Create';
  href?: string;
  icon: LucideIcon;
  keywords?: string[];
  founderOnly?: boolean;
}

export const staticCommands: CommandAction[] = [
  { id: 'nav-mission-control', label: 'Open Mission Control', group: 'Navigate', href: '/command', icon: LayoutGrid, founderOnly: true },
  { id: 'nav-my-work', label: 'Open My Work', group: 'Navigate', href: '/workspace', icon: LayoutGrid },
  { id: 'nav-projects', label: 'Open Projects', group: 'Navigate', href: '/projects', icon: FolderKanban, keywords: ['project'] },
  { id: 'nav-tasks', label: 'Open Tasks', group: 'Navigate', href: '/tasks', icon: CheckSquare, keywords: ['task', 'todo'] },
  { id: 'nav-meetings', label: 'Open Meetings', group: 'Navigate', href: '/meetings', icon: Calendar, keywords: ['meeting', 'calendar'] },
  { id: 'nav-calendar', label: 'Open Calendar', group: 'Navigate', href: '/calendar', icon: CalendarDays },
  { id: 'nav-knowledge', label: 'Open Knowledge', group: 'Navigate', href: '/memory', icon: Sparkles, keywords: ['memory', 'knowledge', 'search'] },
  { id: 'nav-ai', label: 'Open AI', group: 'Navigate', href: '/agents', icon: Bot, keywords: ['ai', 'assistant', 'agent'] },
  { id: 'nav-goals', label: 'Open Goals', group: 'Navigate', href: '/goals', icon: Rocket, keywords: ['goal', 'goals', 'execute', 'automate'] },
  { id: 'nav-skills', label: 'Open Skills', group: 'Navigate', href: '/skills', icon: Wrench, keywords: ['skill', 'skills', 'capability', 'capabilities'] },
  { id: 'nav-task-sessions', label: 'Open Task Sessions', group: 'Navigate', href: '/task-sessions', icon: ListChecks, keywords: ['task session', 'sessions', 'active work', 'long-running'] },
  { id: 'nav-context', label: 'Open Context Inspector', group: 'Navigate', href: '/context', icon: Radar, keywords: ['context', 'inspector', 'what do you know'] },
  { id: 'nav-mcp', label: 'Open MCP', group: 'Navigate', href: '/mcp', icon: Network, keywords: ['mcp', 'model context protocol', 'external tools', 'servers'] },
  { id: 'nav-activity', label: 'Open Activity', group: 'Navigate', href: '/activity', icon: Activity },
  { id: 'nav-audit', label: 'Open Audit Log', group: 'Navigate', href: '/audit', icon: ShieldCheck, founderOnly: true },
  { id: 'nav-integrations', label: 'Open Integrations', group: 'Navigate', href: '/settings/integrations', icon: Plug, keywords: ['github', 'integration', 'repository'] },
  { id: 'nav-settings', label: 'Open Settings', group: 'Navigate', href: '/settings', icon: Settings },
  { id: 'create-project', label: 'Create Project', group: 'Create', href: '/projects?new=1', icon: FolderKanban },
  { id: 'create-task', label: 'Create Task', group: 'Create', href: '/tasks?new=1', icon: CheckSquare },
];
