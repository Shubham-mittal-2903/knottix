import { db } from '@/lib/db/prisma';
import { AppError } from '@/lib/errors';

export async function findDepartmentById(id: string) {
  return db.department.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      organizationId: true,
      name: true,
      slug: true,
      description: true,
      headId: true,
      parentId: true,
      createdAt: true,
    },
  });
}

export async function requireDepartment(id: string, organizationId: string) {
  const dept = await findDepartmentById(id);
  if (!dept) throw AppError.notFound('Department', id);
  if (dept.organizationId !== organizationId) throw AppError.forbidden('Department does not belong to this organization');
  return dept;
}

export async function listDepartmentsForOrganization(organizationId: string) {
  return db.department.findMany({
    where: { organizationId, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      headId: true,
      parentId: true,
      _count: { select: { members: true, teams: true } },
    },
    orderBy: { name: 'asc' },
  });
}
