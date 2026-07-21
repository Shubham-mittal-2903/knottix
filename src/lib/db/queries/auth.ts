import { db } from '@/lib/db/prisma';

export async function findUserByEmail(email: string) {
  return db.user.findUnique({
    where: { email, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      avatarUrl: true,
      status: true,
      emailVerifiedAt: true,
    },
  });
}

export async function resolveMemberSession(userId: string) {
  const member = await db.member.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      deletedAt: null,
      organization: { status: 'ACTIVE', deletedAt: null },
    },
    select: {
      id: true,
      organizationId: true,
      organization: { select: { slug: true } },
      roleId: true,
      role: {
        select: {
          systemRole: true,
          isFounder: true,
          rolePermissions: {
            select: {
              permission: { select: { key: true } },
            },
          },
        },
      },
      workspaces: {
        where: { status: 'ACTIVE', deletedAt: null },
        select: { id: true },
        take: 1,
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!member) return null;

  return {
    memberId: member.id,
    organizationId: member.organizationId,
    organizationSlug: member.organization.slug,
    workspaceId: member.workspaces[0]?.id ?? null,
    roleId: member.roleId,
    systemRole: member.role.systemRole,
    isFounder: member.role.isFounder,
    permissions: member.role.rolePermissions.map(
      (rp: { permission: { key: string } }) => rp.permission.key,
    ),
  };
}

export async function updateLastLogin(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date(), lastActiveAt: new Date() },
  });
}
