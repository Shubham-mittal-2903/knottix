import type { Prisma } from '@/generated/prisma/client';
import { encryptSecret, decryptSecret, maskSecret, type EncryptedPayload } from '@/lib/crypto/encryption';
import { findIntegrationByProvider, upsertIntegrationCredentials, markIntegrationDisconnected } from '@/lib/db/queries/integration';
import { createGitHubClient, type GitHubClient } from './client';

const PROVIDER = 'GITHUB' as const;

/**
 * OAuth-ready shape: `type` and `refreshToken`/`scope` already model a future OAuth grant, but
 * only the `pat` flow (a user-supplied Personal Access Token) is actually implemented today —
 * a real OAuth App requires a public callback URL this environment doesn't have. See DEC-034.
 */
export interface GitHubCredentials {
  type: 'pat' | 'oauth';
  accessToken: EncryptedPayload;
  refreshToken?: EncryptedPayload;
  scope?: string[];
  connectedLogin: string;
  connectedAt: string;
  connectedBy: string;
}

export interface GitHubConnectionStatus {
  connected: boolean;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING';
  connectedLogin: string | null;
  maskedToken: string | null;
  lastSyncAt: Date | null;
  syncError: string | null;
}

export async function connectGitHubWithToken(
  organizationId: string,
  token: string,
  connectedBy: string,
): Promise<GitHubConnectionStatus> {
  const client = createGitHubClient(token);
  const identity = await client.verifyToken();

  const credentials: GitHubCredentials = {
    type: 'pat',
    accessToken: encryptSecret(token),
    connectedLogin: identity.login,
    connectedAt: new Date().toISOString(),
    connectedBy,
  };

  await upsertIntegrationCredentials({
    organizationId,
    provider: PROVIDER,
    name: `GitHub — ${identity.login}`,
    status: 'CONNECTED',
    credentials: credentials as unknown as Prisma.InputJsonValue,
    scopes: [],
    updatedBy: connectedBy,
  });

  return {
    connected: true,
    status: 'CONNECTED',
    connectedLogin: identity.login,
    maskedToken: maskSecret(token),
    lastSyncAt: new Date(),
    syncError: null,
  };
}

export async function disconnectGitHub(organizationId: string, updatedBy: string): Promise<void> {
  await markIntegrationDisconnected(organizationId, PROVIDER, updatedBy);
}

export async function getGitHubConnectionStatus(organizationId: string): Promise<GitHubConnectionStatus> {
  const row = await findIntegrationByProvider(organizationId, PROVIDER);
  if (!row || !row.credentials) {
    return {
      connected: false,
      status: row?.status ?? 'DISCONNECTED',
      connectedLogin: null,
      maskedToken: null,
      lastSyncAt: row?.lastSyncAt ?? null,
      syncError: row?.syncError ?? null,
    };
  }

  const credentials = row.credentials as unknown as GitHubCredentials;
  let maskedToken: string | null = null;
  try {
    maskedToken = maskSecret(decryptSecret(credentials.accessToken));
  } catch {
    maskedToken = null;
  }

  return {
    connected: row.status === 'CONNECTED',
    status: row.status,
    connectedLogin: credentials.connectedLogin,
    maskedToken,
    lastSyncAt: row.lastSyncAt,
    syncError: row.syncError,
  };
}

export async function getGitHubClientForOrganization(organizationId: string): Promise<GitHubClient | null> {
  const row = await findIntegrationByProvider(organizationId, PROVIDER);
  if (!row || row.status !== 'CONNECTED' || !row.credentials) return null;

  const credentials = row.credentials as unknown as GitHubCredentials;
  try {
    const token = decryptSecret(credentials.accessToken);
    return createGitHubClient(token);
  } catch {
    return null;
  }
}
