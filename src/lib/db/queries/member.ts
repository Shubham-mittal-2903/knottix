import { db } from '@/lib/db/prisma';
import { AppError } from '@/lib/errors';

export async function findMemberById(id: string) {
  return db.member.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      roleId: true,
      departmentId: true,
      title: true,
      status: true,
      joinedAt: true,
      user: {
        select: { id: true, email: true, name: true, avatarUrl: true, status: true },
      },
      role: {
        select: { id: true, name: true, slug: true, systemRole: true, isFounder: true, level: true },
      },
    },
  });
}

export async function requireMember(id: string) {
  const member = await findMemberById(id);
  if (!member) throw AppError.notFound('Member', id);
  if (member.status !== 'ACTIVE') throw AppError.forbidden('Member is not active');
  return member;
}

export async function findMemberByUserAndOrg(userId: string, organizationId: string) {
  return db.member.findUnique({
    where: {
      userId_organizationId: { userId, organizationId },
      deletedAt: null,
    },
    select: {
      id: true,
      roleId: true,
      departmentId: true,
      title: true,
      status: true,
      role: {
        select: { id: true, name: true, systemRole: true, isFounder: true, level: true },
      },
    },
  });
}

export async function listMembersForOrganization(
  organizationId: string,
  options?: { status?: string; limit?: number; offset?: number },
) {
  const where = {
    organizationId,
    deletedAt: null,
    ...(options?.status ? { status: options.status as 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'REMOVED' } : {}),
  };

  const [items, total] = await Promise.all([
    db.member.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        joinedAt: true,
        user: { select: { id: true, email: true, name: true, avatarUrl: true } },
        role: { select: { id: true, name: true, systemRole: true, isFounder: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }),
    db.member.count({ where }),
  ]);

  return { items, total };
}
