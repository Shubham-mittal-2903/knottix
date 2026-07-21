'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { connectGitHubWithToken, disconnectGitHub } from '@/lib/github/credentials';
import { isGitHubApiError } from '@/lib/github/errors';
import { createAuditLog } from '@/lib/db/queries/audit';

export interface GitHubConnectState {
  error: string;
  success?: boolean;
}

export async function connectGitHubAccount(_prev: GitHubConnectState, formData: FormData): Promise<GitHubConnectState> {
  const user = await requirePermission('integrations:manage');
  const token = String(formData.get('token') ?? '').trim();
  if (!token) return { error: 'Enter a GitHub personal access token.' };

  try {
    await connectGitHubWithToken(user.organizationId, token, user.id);
    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.id,
      action: 'SETTINGS_CHANGE',
      entityType: 'integration',
      entityId: 'GITHUB',
      entityName: 'GitHub',
      after: { status: 'CONNECTED' },
    });
  } catch (error) {
    if (isGitHubApiError(error)) {
      return {
        error: error.status === 401 ? 'That token was rejected by GitHub. Check it and try again.' : error.message,
      };
    }
    return { error: 'Could not connect to GitHub. Try again.' };
  }

  revalidatePath('/settings/integrations/github');
  revalidatePath('/settings/integrations');
  return { error: '', success: true };
}

export async function disconnectGitHubAccount(): Promise<void> {
  const user = await requirePermission('integrations:manage');
  await disconnectGitHub(user.organizationId, user.id);
  await createAuditLog({
    organizationId: user.organizationId,
    actorId: user.id,
    action: 'SETTINGS_CHANGE',
    entityType: 'integration',
    entityId: 'GITHUB',
    entityName: 'GitHub',
    after: { status: 'DISCONNECTED' },
  });
  revalidatePath('/settings/integrations/github');
  revalidatePath('/settings/integrations');
}
