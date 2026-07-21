import type {
  CreateMemoryInput,
  MemoryEntry,
  MemoryFilter,
  MemoryPage,
  MemoryRevision,
  MemorySnapshot,
  MemoryStats,
  UpdateMemoryInput,
} from '../types';
import type { MemoryStore, RevisionStore, SnapshotStore, StatsStore } from './types';
import { MemoryError } from '../errors';

let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `mem_${Date.now()}_${idCounter}`;
}

export function createInMemoryStore(): MemoryStore & RevisionStore & SnapshotStore & StatsStore {
  const entries = new Map<string, MemoryEntry>();
  const revisions = new Map<string, MemoryRevision[]>();
  const snapshots = new Map<string, MemorySnapshot>();

  function matchesFilter(entry: MemoryEntry, filter: MemoryFilter): boolean {
    if (filter.namespace && entry.namespace !== filter.namespace) return false;
    if (filter.scopeId && entry.scopeId !== filter.scopeId) return false;
    if (filter.organizationId && entry.organizationId !== filter.organizationId) return false;
    if (filter.workspaceId && entry.workspaceId !== filter.workspaceId) return false;
    if (filter.sourceType && entry.sourceType !== filter.sourceType) return false;
    if (filter.memoryType && entry.memoryType !== filter.memoryType) return false;
    if (filter.categoryId && entry.categoryId !== filter.categoryId) return false;
    if (filter.status && entry.status !== filter.status) return false;
    if (filter.createdBy && entry.createdBy !== filter.createdBy) return false;
    if (filter.createdAfter && entry.createdAt < filter.createdAfter) return false;
    if (filter.createdBefore && entry.createdAt > filter.createdBefore) return false;
    if (filter.tags && filter.tags.length > 0) {
      if (!filter.tags.some((t) => entry.tags.includes(t))) return false;
    }
    if (filter.search) {
      const lower = filter.search.toLowerCase();
      if (
        !entry.title.toLowerCase().includes(lower) &&
        !entry.content.toLowerCase().includes(lower)
      ) {
        return false;
      }
    }
    return true;
  }

  return {
    // MemoryStore
    async create(input: CreateMemoryInput): Promise<MemoryEntry> {
      const now = Date.now();
      const entry: MemoryEntry = {
        id: generateId(),
        namespace: input.namespace,
        scopeId: input.scopeId,
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        title: input.title,
        content: input.content,
        summary: input.summary ?? null,
        sourceType: input.sourceType,
        memoryType: input.memoryType,
        sourceId: input.sourceId ?? null,
        tags: input.tags ?? [],
        categoryId: input.categoryId ?? null,
        metadata: input.metadata ?? {},
        references: input.references ?? [],
        status: 'active',
        version: 1,
        createdBy: input.createdBy ?? null,
        updatedBy: input.createdBy ?? null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedBy: null,
      };
      entries.set(entry.id, entry);

      const revision: MemoryRevision = {
        id: generateId(),
        entryId: entry.id,
        version: 1,
        title: entry.title,
        content: entry.content,
        summary: entry.summary,
        metadata: entry.metadata,
        tags: [...entry.tags],
        changedBy: entry.createdBy,
        changedAt: now,
        changeReason: 'Created',
      };
      revisions.set(entry.id, [revision]);

      return { ...entry };
    },

    async getById(entryId: string): Promise<MemoryEntry | null> {
      const entry = entries.get(entryId);
      return entry ? { ...entry } : null;
    },

    async update(entryId: string, input: UpdateMemoryInput, expectedVersion: number): Promise<MemoryEntry> {
      const entry = entries.get(entryId);
      if (!entry) throw MemoryError.entryNotFound(entryId);
      if (entry.version !== expectedVersion) {
        throw MemoryError.revisionConflict(entryId, expectedVersion, entry.version);
      }

      const now = Date.now();
      const newVersion = entry.version + 1;

      if (input.title !== undefined) entry.title = input.title;
      if (input.content !== undefined) entry.content = input.content;
      if (input.summary !== undefined) entry.summary = input.summary;
      if (input.memoryType !== undefined) entry.memoryType = input.memoryType;
      if (input.tags !== undefined) entry.tags = input.tags;
      if (input.categoryId !== undefined) entry.categoryId = input.categoryId;
      if (input.metadata !== undefined) entry.metadata = input.metadata;
      if (input.references !== undefined) entry.references = input.references;
      entry.updatedBy = input.updatedBy ?? null;
      entry.updatedAt = now;
      entry.version = newVersion;

      const revision: MemoryRevision = {
        id: generateId(),
        entryId,
        version: newVersion,
        title: entry.title,
        content: entry.content,
        summary: entry.summary,
        metadata: entry.metadata,
        tags: [...entry.tags],
        changedBy: input.updatedBy ?? null,
        changedAt: now,
        changeReason: input.changeReason ?? null,
      };
      const entryRevisions = revisions.get(entryId) ?? [];
      entryRevisions.push(revision);
      revisions.set(entryId, entryRevisions);

      return { ...entry };
    },

    async softDelete(entryId: string, deletedBy: string | null): Promise<void> {
      const entry = entries.get(entryId);
      if (!entry) throw MemoryError.entryNotFound(entryId);
      entry.status = 'deleted';
      entry.deletedAt = Date.now();
      entry.deletedBy = deletedBy;
    },

    async restore(entryId: string): Promise<MemoryEntry> {
      const entry = entries.get(entryId);
      if (!entry) throw MemoryError.entryNotFound(entryId);
      if (entry.status !== 'deleted') {
        throw MemoryError.restoreFailed(entryId, 'Entry is not deleted');
      }
      entry.status = 'active';
      entry.deletedAt = null;
      entry.deletedBy = null;
      return { ...entry };
    },

    async hardDelete(entryId: string): Promise<void> {
      entries.delete(entryId);
      revisions.delete(entryId);
    },

    async query(filter: MemoryFilter, page: number, pageSize: number): Promise<MemoryPage> {
      const defaultFilter: MemoryFilter = { status: 'active', ...filter };
      const matched = Array.from(entries.values())
        .filter((e) => matchesFilter(e, defaultFilter))
        .sort((a, b) => b.createdAt - a.createdAt);

      const total = matched.length;
      const offset = (page - 1) * pageSize;
      const paged = matched.slice(offset, offset + pageSize);

      return {
        entries: paged.map((e) => ({ ...e })),
        total,
        page,
        pageSize,
        hasMore: offset + pageSize < total,
      };
    },

    async count(filter: MemoryFilter): Promise<number> {
      const defaultFilter: MemoryFilter = { status: 'active', ...filter };
      return Array.from(entries.values()).filter((e) => matchesFilter(e, defaultFilter)).length;
    },

    async exists(entryId: string): Promise<boolean> {
      return entries.has(entryId);
    },

    // RevisionStore
    async createRevision(revision: Omit<MemoryRevision, 'id'>): Promise<MemoryRevision> {
      const full: MemoryRevision = { id: generateId(), ...revision };
      const list = revisions.get(revision.entryId) ?? [];
      list.push(full);
      revisions.set(revision.entryId, list);
      return full;
    },

    async getRevisionsByEntryId(entryId: string): Promise<MemoryRevision[]> {
      return (revisions.get(entryId) ?? []).map((r) => ({ ...r }));
    },

    async getRevisionByVersion(entryId: string, version: number): Promise<MemoryRevision | null> {
      const list = revisions.get(entryId) ?? [];
      const found = list.find((r) => r.version === version);
      return found ? { ...found } : null;
    },

    async getLatestRevision(entryId: string): Promise<MemoryRevision | null> {
      const list = revisions.get(entryId) ?? [];
      if (list.length === 0) return null;
      return { ...list[list.length - 1] };
    },

    // SnapshotStore
    async createSnapshot(snapshot: Omit<MemorySnapshot, 'id'>): Promise<MemorySnapshot> {
      const full: MemorySnapshot = { id: generateId(), ...snapshot };
      snapshots.set(full.id, full);
      return { ...full };
    },

    async getSnapshotById(snapshotId: string): Promise<MemorySnapshot | null> {
      const s = snapshots.get(snapshotId);
      return s ? { ...s } : null;
    },

    async listSnapshotsByScope(namespace: string, scopeId: string): Promise<MemorySnapshot[]> {
      return Array.from(snapshots.values())
        .filter((s) => s.namespace === namespace && s.scopeId === scopeId)
        .map((s) => ({ ...s }));
    },

    async deleteSnapshot(snapshotId: string): Promise<void> {
      snapshots.delete(snapshotId);
    },

    // StatsStore
    async getStats(organizationId: string, workspaceId?: string): Promise<MemoryStats> {
      const all = Array.from(entries.values()).filter((e) => {
        if (e.organizationId !== organizationId) return false;
        if (workspaceId && e.workspaceId !== workspaceId) return false;
        return true;
      });

      const byNamespace: Record<string, number> = {};
      const bySourceType: Record<string, number> = {};
      const byMemoryType: Record<string, number> = {};
      let active = 0;
      let archived = 0;
      let deleted = 0;
      let totalRevs = 0;

      for (const e of all) {
        byNamespace[e.namespace] = (byNamespace[e.namespace] ?? 0) + 1;
        bySourceType[e.sourceType] = (bySourceType[e.sourceType] ?? 0) + 1;
        byMemoryType[e.memoryType] = (byMemoryType[e.memoryType] ?? 0) + 1;
        if (e.status === 'active') active++;
        else if (e.status === 'archived') archived++;
        else if (e.status === 'deleted') deleted++;
        totalRevs += (revisions.get(e.id) ?? []).length;
      }

      return {
        totalEntries: all.length,
        activeEntries: active,
        archivedEntries: archived,
        deletedEntries: deleted,
        totalRevisions: totalRevs,
        entriesByNamespace: byNamespace,
        entriesBySourceType: bySourceType,
        entriesByMemoryType: byMemoryType,
      };
    },
  };
}
