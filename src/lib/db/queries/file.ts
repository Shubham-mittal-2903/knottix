import { db } from '@/lib/db/prisma';

export async function listFilesForWorkspace(workspaceId: string, limit = 30) {
  return db.file.findMany({
    where: { project: { workspaceId }, deletedAt: null },
    select: {
      id: true,
      filename: true,
      originalName: true,
      mimeType: true,
      size: true,
      url: true,
      version: true,
      projectId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function listFilesForProject(projectId: string, limit = 30) {
  return db.file.findMany({
    where: { projectId, deletedAt: null },
    select: {
      id: true,
      filename: true,
      originalName: true,
      mimeType: true,
      size: true,
      url: true,
      version: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function listFilesForMember(memberId: string, limit = 30) {
  return db.file.findMany({
    where: { memberId, deletedAt: null },
    select: {
      id: true,
      filename: true,
      originalName: true,
      mimeType: true,
      size: true,
      url: true,
      projectId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
