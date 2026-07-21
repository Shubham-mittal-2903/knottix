import { db } from '@/lib/db/prisma';
import type { Prisma } from '@/generated/prisma/client';
import type { AuditAction } from '@/types/database';
import { logger } from '@/lib/logger';

interface CreateAuditLogParams {
  organizationId: string;
  actorId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  entityName?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

export async function listAuditLogsForOrganization(organizationId: string, limit = 50) {
  return db.auditLog.findMany({
    where: { organizationId },
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      entityName: true,
      actorId: true,
      ipAddress: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityName: params.entityName,
        before: params.before ?? undefined,
        after: params.after ?? undefined,
        metadata: params.metadata ?? undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        createdBy: params.actorId,
      },
    });
  } catch (error) {
    logger.error('audit.create', 'Failed to write audit log', {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
