import { db } from '@/lib/db/prisma';

export async function countActiveProjectsForOrganization(organizationId: string): Promise<number> {
  return db.project.count({
    where: {
      workspace: { organizationId },
      deletedAt: null,
      status: { in: ['ACTIVE', 'IN_REVIEW'] },
    },
  });
}

export async function listProjectsForOrganization(organizationId: string, limit = 50) {
  return db.project.findMany({
    where: { workspace: { organizationId }, deletedAt: null },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      workspaceId: true,
      workspace: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
}

export async function listProjectsForWorkspace(workspaceId: string, limit = 50) {
  return db.project.findMany({
    where: { workspaceId, deletedAt: null },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      status: true,
      priority: true,
      startDate: true,
      dueDate: true,
      completedAt: true,
      clientId: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
}

export async function findProjectById(id: string, workspaceId: string) {
  return db.project.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      status: true,
      priority: true,
      startDate: true,
      dueDate: true,
      completedAt: true,
      budget: true,
      currency: true,
      clientId: true,
    },
  });
}
