import { db } from '@/lib/db/prisma';

export async function countOpenTasksForOrganization(organizationId: string): Promise<number> {
  return db.task.count({
    where: {
      project: { workspace: { organizationId } },
      deletedAt: null,
      status: { notIn: ['DONE', 'CANCELLED'] },
    },
  });
}

export async function listTasksForOrganization(organizationId: string, limit = 50) {
  return db.task.findMany({
    where: { project: { workspace: { organizationId } }, deletedAt: null },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      projectId: true,
      project: { select: { title: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
}

export async function listTasksAssignedToMember(memberId: string, limit = 50) {
  return db.task.findMany({
    where: { assignments: { some: { memberId } }, deletedAt: null },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      projectId: true,
      project: { select: { title: true } },
    },
    orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
    take: limit,
  });
}

export async function listTasksForWorkspace(workspaceId: string, limit = 50) {
  return db.task.findMany({
    where: { project: { workspaceId, deletedAt: null }, deletedAt: null },
    select: {
      id: true,
      projectId: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      completedAt: true,
      estimatedHours: true,
      actualHours: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
}

export async function listTasksForProject(projectId: string, limit = 100) {
  return db.task.findMany({
    where: { projectId, deletedAt: null },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      completedAt: true,
    },
    orderBy: { position: 'asc' },
    take: limit,
  });
}
