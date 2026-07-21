import { db } from '@/lib/db/prisma';
import { AppError } from '@/lib/errors';

export async function findOrganizationById(id: string) {
  return db.organization.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      domain: true,
      description: true,
      status: true,
      createdAt: true,
    },
  });
}

export async function findOrganizationBySlug(slug: string) {
  return db.organization.findUnique({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      domain: true,
      description: true,
      status: true,
      createdAt: true,
    },
  });
}

export async function requireOrganization(id: string) {
  const org = await findOrganizationById(id);
  if (!org) throw AppError.notFound('Organization', id);
  if (org.status !== 'ACTIVE') throw AppError.forbidden('Organization is not active');
  return org;
}

export async function listOrganizationsForUser(userId: string) {
  return db.organization.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      members: {
        some: { userId, status: 'ACTIVE', deletedAt: null },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
    },
    orderBy: { name: 'asc' },
  });
}
