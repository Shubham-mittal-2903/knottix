import { db } from '@/lib/db/prisma';

export async function listNotificationsForUser(userId: string, limit = 30) {
  return db.notification.findMany({
    where: { userId },
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      actionUrl: true,
      read: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, read: false } });
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  await db.notification.updateMany({
    where: { id, userId },
    data: { read: true, readAt: new Date() },
  });
}
