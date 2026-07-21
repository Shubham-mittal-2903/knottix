'use server';

import { signOut } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth/session';
import { createAuditLog } from '@/lib/db/queries/audit';
import { getRequestContext } from '@/lib/request';

export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    const ctx = await getRequestContext();
    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.id,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: user.id,
      entityName: user.email,
      ipAddress: ctx.ipAddress ?? undefined,
      userAgent: ctx.userAgent ?? undefined,
    });
  }
  await signOut({ redirectTo: '/login' });
}
