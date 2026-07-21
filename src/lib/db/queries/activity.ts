import { db } from '@/lib/db/prisma';

export async function listActivityForOrganization(organizationId: string, limit = 40) {
  return db.activity.findMany({
    where: { organizationId },
    select: {
      id: true,
      type: true,
      entityType: true,
      entityId: true,
      entityName: true,
      description: true,
      actorId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
