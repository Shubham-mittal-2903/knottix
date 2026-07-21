import { db } from '@/lib/db/prisma';

export async function countUpcomingMeetingsForOrganization(organizationId: string): Promise<number> {
  return db.meeting.count({
    where: {
      workspace: { organizationId },
      deletedAt: null,
      startTime: { gte: new Date() },
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
    },
  });
}

export async function listMeetingsForOrganization(organizationId: string, limit = 50) {
  return db.meeting.findMany({
    where: { workspace: { organizationId }, deletedAt: null },
    select: {
      id: true,
      title: true,
      status: true,
      startTime: true,
      endTime: true,
      summary: true,
      workspaceId: true,
      workspace: { select: { name: true } },
    },
    orderBy: { startTime: 'desc' },
    take: limit,
  });
}

export async function listMeetingsForMember(memberId: string, limit = 30) {
  return db.meeting.findMany({
    where: {
      deletedAt: null,
      project: { projectMembers: { some: { memberId } } },
    },
    select: {
      id: true,
      title: true,
      status: true,
      startTime: true,
      endTime: true,
      summary: true,
    },
    orderBy: { startTime: 'desc' },
    take: limit,
  });
}

export async function listMeetingsForWorkspace(workspaceId: string, limit = 50) {
  return db.meeting.findMany({
    where: { workspaceId, deletedAt: null },
    select: {
      id: true,
      title: true,
      status: true,
      startTime: true,
      endTime: true,
      summary: true,
      projectId: true,
      clientId: true,
    },
    orderBy: { startTime: 'desc' },
    take: limit,
  });
}
