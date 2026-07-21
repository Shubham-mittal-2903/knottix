export function hasPermission(
  permissions: string[],
  isFounder: boolean,
  required: string,
): boolean {
  if (isFounder) return true;
  return permissions.includes(required);
}

export function hasAnyPermission(
  permissions: string[],
  isFounder: boolean,
  required: string[],
): boolean {
  if (isFounder) return true;
  return required.some((p) => permissions.includes(p));
}

export function hasAllPermissions(
  permissions: string[],
  isFounder: boolean,
  required: string[],
): boolean {
  if (isFounder) return true;
  return required.every((p) => permissions.includes(p));
}

const MODULE_ROUTE_MAP: Record<string, string> = {
  command: 'command:read',
  projects: 'projects:read',
  tasks: 'projects:read',
  meetings: 'projects:read',
  clients: 'clients:read',
  creative: 'creative:read',
  finance: 'finance:read',
  team: 'team:read',
  memory: 'memory:read',
  agents: 'agents:read',
  audit: 'audit:read',
  settings: 'settings:read',
};

export function getRequiredPermissionForPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  const module = segments[0];
  if (!module) return null;
  return MODULE_ROUTE_MAP[module] ?? null;
}
