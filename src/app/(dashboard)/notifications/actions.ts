'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/session';
import { markNotificationRead } from '@/lib/db/queries/notification';

export async function markNotificationReadAction(id: string): Promise<void> {
  const user = await requireAuth();
  await markNotificationRead(id, user.id);
  revalidatePath('/notifications');
}
