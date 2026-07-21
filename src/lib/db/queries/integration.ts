import { db } from '@/lib/db/prisma';
import { Prisma, type IntegrationProvider, type IntegrationStatus } from '@/generated/prisma/client';

export async function findIntegrationByProvider(organizationId: string, provider: IntegrationProvider) {
  return db.integration.findUnique({
    where: { organizationId_provider: { organizationId, provider } },
    select: {
      id: true,
      provider: true,
      name: true,
      status: true,
      config: true,
      credentials: true,
      scopes: true,
      lastSyncAt: true,
      syncError: true,
      metadata: true,
      updatedAt: true,
    },
  });
}

export async function listIntegrationsForOrganization(organizationId: string) {
  return db.integration.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, provider: true, name: true, status: true, lastSyncAt: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function upsertIntegrationCredentials(params: {
  organizationId: string;
  provider: IntegrationProvider;
  name: string;
  status: IntegrationStatus;
  credentials?: Prisma.InputJsonValue;
  scopes?: string[];
  updatedBy?: string;
}) {
  const { organizationId, provider, name, status, credentials, scopes, updatedBy } = params;
  return db.integration.upsert({
    where: { organizationId_provider: { organizationId, provider } },
    create: {
      organizationId,
      provider,
      name,
      status,
      credentials: credentials ?? undefined,
      scopes: scopes ?? [],
      lastSyncAt: status === 'CONNECTED' ? new Date() : undefined,
      createdBy: updatedBy,
      updatedBy,
    },
    update: {
      name,
      status,
      credentials: credentials ?? undefined,
      scopes: scopes ?? undefined,
      lastSyncAt: status === 'CONNECTED' ? new Date() : undefined,
      syncError: status === 'CONNECTED' ? null : undefined,
      updatedBy,
    },
  });
}

export async function markIntegrationDisconnected(
  organizationId: string,
  provider: IntegrationProvider,
  updatedBy?: string,
) {
  return db.integration.update({
    where: { organizationId_provider: { organizationId, provider } },
    data: { status: 'DISCONNECTED', credentials: Prisma.JsonNull, updatedBy },
  });
}
