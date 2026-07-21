import { db } from '@/lib/db/prisma';
import { AppError } from '@/lib/errors';

export async function findTeamById(id: string) {
  return db.team.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      departmentId: true,
      name: true,
      slug: true,
      description: true,
      leadId: true,
      createdAt: true,
      department: { select: { id: true, name: true, organizationId: true } },
    },
  });
}

export async function requireTeam(id: string, organizationId: string) {
  const team = await findTeamById(id);
  if (!team) throw AppError.notFound('Team', id);
  if (team.department.organizationId !== organizationId) throw AppError.forbidden('Team does not belong to this organization');
  return team;
}

export async function listTeamsForDepartment(departmentId: string) {
  return db.team.findMany({
    where: { departmentId, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      leadId: true,
      _count: { select: { teamMembers: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function listTeamMemberships(memberId: string) {
  return db.teamMember.findMany({
    where: { memberId },
    select: {
      id: true,
      isLead: true,
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
          department: { select: { id: true, name: true } },
        },
      },
    },
  });
}
