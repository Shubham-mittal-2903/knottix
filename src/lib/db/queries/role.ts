import { db } from '@/lib/db/prisma';
import { AppError } from '@/lib/errors';

export async function findRoleById(id: string) {
  return db.role.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      name: true,
      slug: true,
      description: true,
      systemRole: true,
      isFounder: true,
      isDefault: true,
      level: true,
    },
  });
}

export async function requireRole(id: string) {
  const role = await findRoleById(id);
  if (!role) throw AppError.notFound('Role', id);
  return role;
}

export async function listRolesForOrganization(organizationId: string) {
  return db.role.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      systemRole: true,
      isFounder: true,
      isDefault: true,
      level: true,
      _count: { select: { members: true, rolePermissions: true } },
    },
    orderBy: { level: 'desc' },
  });
}

export async function findDefaultRole(organizationId: string) {
  return db.role.findFirst({
    where: { organizationId, isDefault: true },
    select: { id: true, name: true, slug: true },
  });
}

export async function resolvePermissionsForRole(roleId: string): Promise<string[]> {
  const rolePerms = await db.rolePermission.findMany({
    where: { roleId },
    select: { permission: { select: { key: true } } },
  });
  return rolePerms.map((rp: { permission: { key: string } }) => rp.permission.key);
}
