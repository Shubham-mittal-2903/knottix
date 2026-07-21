import { auth } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { isDemoMode, DEMO_SESSION_USER } from '@/lib/demo';
import type { SessionUser } from '@/types';

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth().catch(() => null);
  if (!session?.user) return isDemoMode() ? DEMO_SESSION_USER : null;

  const u = session.user;
  return {
    id: u.id,
    email: u.email ?? '',
    name: u.name ?? '',
    avatarUrl: u.image ?? null,
    memberId: u.memberId,
    organizationId: u.organizationId,
    organizationSlug: u.organizationSlug,
    workspaceId: u.workspaceId,
    roleId: u.roleId,
    systemRole: u.systemRole,
    isFounder: u.isFounder,
    permissions: u.permissions,
  };
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw AppError.unauthorized();
  return user;
}

export async function requirePermission(permission: string): Promise<SessionUser> {
  const user = await requireAuth();
  if (!user.isFounder && !user.permissions.includes(permission)) {
    throw AppError.forbidden(`Missing permission: ${permission}`);
  }
  return user;
}

export async function requireAnyPermission(permissions: string[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!user.isFounder && !permissions.some((p) => user.permissions.includes(p))) {
    throw AppError.forbidden(`Missing permissions: ${permissions.join(', ')}`);
  }
  return user;
}

export async function requireAllPermissions(permissions: string[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!user.isFounder && !permissions.every((p) => user.permissions.includes(p))) {
    throw AppError.forbidden(`Missing permissions: ${permissions.join(', ')}`);
  }
  return user;
}

export async function requireOrganizationAccess(organizationId: string): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.organizationId !== organizationId) {
    throw AppError.forbidden('No access to this organization');
  }
  return user;
}

export async function requireWorkspaceAccess(workspaceId: string): Promise<SessionUser> {
  const user = await requireAuth();
  if (!user.isFounder && user.workspaceId !== workspaceId) {
    throw AppError.forbidden('No access to this workspace');
  }
  return user;
}
