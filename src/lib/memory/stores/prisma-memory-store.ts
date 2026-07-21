import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import type {
  CreateMemoryInput,
  MemoryEntry,
  MemoryFilter,
  MemoryNamespace,
  MemoryPage,
  MemoryReference,
  MemoryRevision,
  MemorySnapshot,
  MemoryStats,
  MemoryStatus,
  UpdateMemoryInput,
} from '../types';
import type { MemoryStore, RevisionStore, SnapshotStore, StatsStore } from './types';
import { MemoryError } from '../errors';

type AIMemoryRow = {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  namespace: string;
  scopeId: string;
  title: string;
  type: string;
  sourceType: string;
  sourceId: string | null;
  content: string;
  summary: string | null;
  tags: string[];
  categoryId: string | null;
  references: Prisma.JsonValue;
  version: number;
  status: string;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
};

function statusToDb(status: MemoryStatus): 'ACTIVE' | 'ARCHIVED' | 'DELETED' {
  return status.toUpperCase() as 'ACTIVE' | 'ARCHIVED' | 'DELETED';
}

function statusFromDb(status: string): MemoryStatus {
  return status.toLowerCase() as MemoryStatus;
}

function toEntry(row: AIMemoryRow): MemoryEntry {
  return {
    id: row.id,
    namespace: row.namespace as MemoryNamespace,
    scopeId: row.scopeId,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId ?? '',
    title: row.title,
    content: row.content,
    summary: row.summary,
    sourceType: row.sourceType as MemoryEntry['sourceType'],
    memoryType: row.type as MemoryEntry['memoryType'],
    sourceId: row.sourceId,
    tags: row.tags,
    categoryId: row.categoryId,
    metadata: (row.metadata as MemoryEntry['metadata']) ?? {},
    references: (row.references as MemoryReference[] | null) ?? [],
    status: statusFromDb(row.status),
    version: row.version,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    deletedAt: row.deletedAt?.getTime() ?? null,
    deletedBy: row.deletedBy,
  };
}

function buildWhere(filter: MemoryFilter): Prisma.AIMemoryWhereInput {
  const where: Prisma.AIMemoryWhereInput = {};

  if (filter.namespace) where.namespace = filter.namespace;
  if (filter.scopeId) where.scopeId = filter.scopeId;
  if (filter.organizationId) where.organizationId = filter.organizationId;
  if (filter.workspaceId) where.workspaceId = filter.workspaceId;
  if (filter.sourceType) where.sourceType = filter.sourceType;
  if (filter.memoryType) where.type = filter.memoryType;
  if (filter.categoryId) where.categoryId = filter.categoryId;
  if (filter.status) where.status = statusToDb(filter.status);
  if (filter.createdBy) where.createdBy = filter.createdBy;
  if (filter.tags && filter.tags.length > 0) where.tags = { hasSome: filter.tags };

  if (filter.createdAfter || filter.createdBefore) {
    where.createdAt = {
      ...(filter.createdAfter ? { gte: new Date(filter.createdAfter) } : {}),
      ...(filter.createdBefore ? { lte: new Date(filter.createdBefore) } : {}),
    };
  }

  if (filter.search) {
    where.OR = [
      { title: { contains: filter.search, mode: 'insensitive' } },
      { content: { contains: filter.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

export function createPrismaMemoryStore(db: PrismaClient): MemoryStore & RevisionStore & SnapshotStore & StatsStore {
  return {
    // MemoryStore
    async create(input: CreateMemoryInput): Promise<MemoryEntry> {
      const row = await db.aIMemory.create({
        data: {
          organizationId: input.organizationId,
          workspaceId: input.workspaceId,
          namespace: input.namespace,
          scopeId: input.scopeId,
          title: input.title,
          content: input.content,
          summary: input.summary,
          type: input.memoryType,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          tags: input.tags ?? [],
          categoryId: input.categoryId,
          metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
          references: (input.references ?? []) as unknown as Prisma.InputJsonValue,
          status: 'ACTIVE',
          version: 1,
          createdBy: input.createdBy,
          updatedBy: input.createdBy,
        },
      });

      await db.aIMemoryRevision.create({
        data: {
          entryId: row.id,
          version: 1,
          title: row.title,
          content: row.content,
          summary: row.summary,
          metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
          tags: input.tags ?? [],
          changedBy: input.createdBy ?? null,
          changeReason: 'Created',
        },
      });

      return toEntry(row as AIMemoryRow);
    },

    async getById(entryId: string): Promise<MemoryEntry | null> {
      const row = await db.aIMemory.findUnique({ where: { id: entryId } });
      return row ? toEntry(row as AIMemoryRow) : null;
    },

    async update(entryId: string, input: UpdateMemoryInput, expectedVersion: number): Promise<MemoryEntry> {
      const existing = await db.aIMemory.findUnique({ where: { id: entryId } });
      if (!existing) throw MemoryError.entryNotFound(entryId);
      if (existing.version !== expectedVersion) {
        throw MemoryError.revisionConflict(entryId, expectedVersion, existing.version);
      }

      const newVersion = existing.version + 1;

      const row = await db.aIMemory.update({
        where: { id: entryId },
        data: {
          title: input.title,
          content: input.content,
          summary: input.summary,
          type: input.memoryType,
          tags: input.tags,
          categoryId: input.categoryId,
          metadata: input.metadata !== undefined ? (input.metadata as Prisma.InputJsonValue) : undefined,
          references: input.references !== undefined ? (input.references as unknown as Prisma.InputJsonValue) : undefined,
          updatedBy: input.updatedBy ?? null,
          version: newVersion,
        },
      });

      await db.aIMemoryRevision.create({
        data: {
          entryId,
          version: newVersion,
          title: row.title,
          content: row.content,
          summary: row.summary,
          metadata: (row.metadata as Prisma.InputJsonValue) ?? {},
          tags: row.tags,
          changedBy: input.updatedBy ?? null,
          changeReason: input.changeReason ?? null,
        },
      });

      return toEntry(row as AIMemoryRow);
    },

    async softDelete(entryId: string, deletedBy: string | null): Promise<void> {
      const existing = await db.aIMemory.findUnique({ where: { id: entryId } });
      if (!existing) throw MemoryError.entryNotFound(entryId);

      await db.aIMemory.update({
        where: { id: entryId },
        data: { status: 'DELETED', deletedAt: new Date(), deletedBy },
      });
    },

    async restore(entryId: string): Promise<MemoryEntry> {
      const existing = await db.aIMemory.findUnique({ where: { id: entryId } });
      if (!existing) throw MemoryError.entryNotFound(entryId);
      if (existing.status !== 'DELETED') {
        throw MemoryError.restoreFailed(entryId, 'Entry is not deleted');
      }

      const row = await db.aIMemory.update({
        where: { id: entryId },
        data: { status: 'ACTIVE', deletedAt: null, deletedBy: null },
      });

      return toEntry(row as AIMemoryRow);
    },

    async hardDelete(entryId: string): Promise<void> {
      await db.aIMemory.delete({ where: { id: entryId } }).catch(() => undefined);
    },

    async query(filter: MemoryFilter, page: number, pageSize: number): Promise<MemoryPage> {
      const where = buildWhere({ status: 'active', ...filter });

      const [total, rows] = await Promise.all([
        db.aIMemory.count({ where }),
        db.aIMemory.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      return {
        entries: rows.map((r) => toEntry(r as AIMemoryRow)),
        total,
        page,
        pageSize,
        hasMore: (page - 1) * pageSize + rows.length < total,
      };
    },

    async count(filter: MemoryFilter): Promise<number> {
      const where = buildWhere({ status: 'active', ...filter });
      return db.aIMemory.count({ where });
    },

    async exists(entryId: string): Promise<boolean> {
      const row = await db.aIMemory.findUnique({ where: { id: entryId }, select: { id: true } });
      return row !== null;
    },

    // RevisionStore
    async createRevision(revision: Omit<MemoryRevision, 'id'>): Promise<MemoryRevision> {
      const row = await db.aIMemoryRevision.create({
        data: {
          entryId: revision.entryId,
          version: revision.version,
          title: revision.title,
          content: revision.content,
          summary: revision.summary,
          metadata: (revision.metadata ?? {}) as Prisma.InputJsonValue,
          tags: revision.tags,
          changedBy: revision.changedBy,
          changeReason: revision.changeReason,
        },
      });

      return {
        id: row.id,
        entryId: row.entryId,
        version: row.version,
        title: row.title,
        content: row.content,
        summary: row.summary,
        metadata: (row.metadata as MemoryRevision['metadata']) ?? {},
        tags: row.tags,
        changedBy: row.changedBy,
        changedAt: row.changedAt.getTime(),
        changeReason: row.changeReason,
      };
    },

    async getRevisionsByEntryId(entryId: string): Promise<MemoryRevision[]> {
      const rows = await db.aIMemoryRevision.findMany({ where: { entryId }, orderBy: { version: 'asc' } });
      return rows.map((row) => ({
        id: row.id,
        entryId: row.entryId,
        version: row.version,
        title: row.title,
        content: row.content,
        summary: row.summary,
        metadata: (row.metadata as MemoryRevision['metadata']) ?? {},
        tags: row.tags,
        changedBy: row.changedBy,
        changedAt: row.changedAt.getTime(),
        changeReason: row.changeReason,
      }));
    },

    async getRevisionByVersion(entryId: string, version: number): Promise<MemoryRevision | null> {
      const row = await db.aIMemoryRevision.findUnique({ where: { entryId_version: { entryId, version } } });
      if (!row) return null;
      return {
        id: row.id,
        entryId: row.entryId,
        version: row.version,
        title: row.title,
        content: row.content,
        summary: row.summary,
        metadata: (row.metadata as MemoryRevision['metadata']) ?? {},
        tags: row.tags,
        changedBy: row.changedBy,
        changedAt: row.changedAt.getTime(),
        changeReason: row.changeReason,
      };
    },

    async getLatestRevision(entryId: string): Promise<MemoryRevision | null> {
      const row = await db.aIMemoryRevision.findFirst({ where: { entryId }, orderBy: { version: 'desc' } });
      if (!row) return null;
      return {
        id: row.id,
        entryId: row.entryId,
        version: row.version,
        title: row.title,
        content: row.content,
        summary: row.summary,
        metadata: (row.metadata as MemoryRevision['metadata']) ?? {},
        tags: row.tags,
        changedBy: row.changedBy,
        changedAt: row.changedAt.getTime(),
        changeReason: row.changeReason,
      };
    },

    // SnapshotStore
    async createSnapshot(snapshot: Omit<MemorySnapshot, 'id'>): Promise<MemorySnapshot> {
      const row = await db.aIMemorySnapshot.create({
        data: {
          namespace: snapshot.namespace,
          scopeId: snapshot.scopeId,
          label: snapshot.label,
          entryCount: snapshot.entryCount,
          entryIds: snapshot.entryIds,
          createdBy: snapshot.createdBy,
        },
      });

      return {
        id: row.id,
        namespace: row.namespace as MemoryNamespace,
        scopeId: row.scopeId,
        label: row.label,
        entryCount: row.entryCount,
        createdBy: row.createdBy,
        createdAt: row.createdAt.getTime(),
        entryIds: row.entryIds,
      };
    },

    async getSnapshotById(snapshotId: string): Promise<MemorySnapshot | null> {
      const row = await db.aIMemorySnapshot.findUnique({ where: { id: snapshotId } });
      if (!row) return null;
      return {
        id: row.id,
        namespace: row.namespace as MemoryNamespace,
        scopeId: row.scopeId,
        label: row.label,
        entryCount: row.entryCount,
        createdBy: row.createdBy,
        createdAt: row.createdAt.getTime(),
        entryIds: row.entryIds,
      };
    },

    async listSnapshotsByScope(namespace: string, scopeId: string): Promise<MemorySnapshot[]> {
      const rows = await db.aIMemorySnapshot.findMany({
        where: { namespace, scopeId },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map((row) => ({
        id: row.id,
        namespace: row.namespace as MemoryNamespace,
        scopeId: row.scopeId,
        label: row.label,
        entryCount: row.entryCount,
        createdBy: row.createdBy,
        createdAt: row.createdAt.getTime(),
        entryIds: row.entryIds,
      }));
    },

    async deleteSnapshot(snapshotId: string): Promise<void> {
      await db.aIMemorySnapshot.delete({ where: { id: snapshotId } }).catch(() => undefined);
    },

    // StatsStore
    async getStats(organizationId: string, workspaceId?: string): Promise<MemoryStats> {
      const where: Prisma.AIMemoryWhereInput = { organizationId, ...(workspaceId ? { workspaceId } : {}) };

      const [total, active, archived, deleted, rows, totalRevisions] = await Promise.all([
        db.aIMemory.count({ where }),
        db.aIMemory.count({ where: { ...where, status: 'ACTIVE' } }),
        db.aIMemory.count({ where: { ...where, status: 'ARCHIVED' } }),
        db.aIMemory.count({ where: { ...where, status: 'DELETED' } }),
        db.aIMemory.findMany({ where, select: { namespace: true, sourceType: true, type: true } }),
        db.aIMemoryRevision.count({ where: { entry: { organizationId, ...(workspaceId ? { workspaceId } : {}) } } }),
      ]);

      const entriesByNamespace: Record<string, number> = {};
      const entriesBySourceType: Record<string, number> = {};
      const entriesByMemoryType: Record<string, number> = {};

      for (const r of rows) {
        entriesByNamespace[r.namespace] = (entriesByNamespace[r.namespace] ?? 0) + 1;
        entriesBySourceType[r.sourceType] = (entriesBySourceType[r.sourceType] ?? 0) + 1;
        entriesByMemoryType[r.type] = (entriesByMemoryType[r.type] ?? 0) + 1;
      }

      return {
        totalEntries: total,
        activeEntries: active,
        archivedEntries: archived,
        deletedEntries: deleted,
        totalRevisions,
        entriesByNamespace,
        entriesBySourceType,
        entriesByMemoryType,
      };
    },
  };
}
