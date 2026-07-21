import { db } from '@/lib/db/prisma';

export async function listClientsForWorkspace(workspaceId: string, limit = 30) {
  return db.client.findMany({
    where: { workspaceId, deletedAt: null },
    select: {
      id: true,
      name: true,
      industry: true,
      website: true,
      contactName: true,
      contactEmail: true,
      status: true,
      notes: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
}
