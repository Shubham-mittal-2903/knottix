import { db } from '@/lib/db/prisma';
import { AppError } from '@/lib/errors';

export async function findWorkspaceById(id: string) {
  return db.workspace.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      organizationId: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      status: true,
      createdAt: true,
    },
  });
}

export async function requireWorkspace(id: string, organizationId: string) {
  const ws = await findWorkspaceById(id);
  if (!ws) throw AppError.notFound('Workspace', id);
  if (ws.organizationId !== organizationId) throw AppError.forbidden('Workspace does not belong to this organization');
  if (ws.status !== 'ACTIVE') throw AppError.forbidden('Workspace is not active');
  return ws;
}

export async function listWorkspacesForMember(memberId: string, organizationId: string) {
  return db.workspace.findMany({
    where: {
      organizationId,
      status: 'ACTIVE',
      deletedAt: null,
      members: { some: { id: memberId } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function listWorkspacesForOrganization(organizationId: string) {
  return db.workspace.findMany({
    where: { organizationId, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      status: true,
      createdAt: true,
      _count: { select: { projects: true, clients: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function findDefaultWorkspace(organizationId: string) {
  return db.workspace.findFirst({
    where: { organizationId, status: 'ACTIVE', deletedAt: null },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: 'asc' },
  });
}
