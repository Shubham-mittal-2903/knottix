import type {
  CreateMemoryInput,
  MemoryAccessContext,
  MemoryEntry,
  MemoryFilter,
  MemoryHealthStatus,
  MemoryNamespace,
  MemoryPage,
  MemoryRevision,
  MemorySnapshot,
  MemoryStats,
  UpdateMemoryInput,
} from '../types';
import type { MemoryStore, RevisionStore, SnapshotStore, StatsStore } from '../stores/types';
import type { MemoryAccessLayer } from '../permissions/access';
import type { MemoryCache } from '../cache/memory-cache';
import type { MemoryIndex } from '../indexing/memory-index';
import type { MemoryEventEmitter } from '../events/memory-events';
import type { NamespaceResolver } from '../resolver/namespace-resolver';
import type { VersionManager } from '../versioning/version-manager';
import type { VersionDiff } from '../versioning/version-manager';
import { MemoryError } from '../errors';
import { logger } from '@/lib/logger';

export interface MemoryEngine {
  create(ctx: MemoryAccessContext, input: CreateMemoryInput): Promise<MemoryEntry>;
  getById(ctx: MemoryAccessContext, entryId: string): Promise<MemoryEntry>;
  update(ctx: MemoryAccessContext, entryId: string, input: UpdateMemoryInput): Promise<MemoryEntry>;
  delete(ctx: MemoryAccessContext, entryId: string): Promise<void>;
  restore(ctx: MemoryAccessContext, entryId: string): Promise<MemoryEntry>;
  hardDelete(ctx: MemoryAccessContext, entryId: string): Promise<void>;
  archive(ctx: MemoryAccessContext, entryId: string): Promise<void>;
  query(ctx: MemoryAccessContext, filter: MemoryFilter, page?: number, pageSize?: number): Promise<MemoryPage>;
  count(ctx: MemoryAccessContext, filter: MemoryFilter): Promise<number>;

  getHistory(ctx: MemoryAccessContext, entryId: string): Promise<MemoryRevision[]>;
  getVersion(ctx: MemoryAccessContext, entryId: string, version: number): Promise<MemoryRevision>;
  compareVersions(ctx: MemoryAccessContext, entryId: string, versionA: number, versionB: number): Promise<VersionDiff>;

  createSnapshot(ctx: MemoryAccessContext, namespace: MemoryNamespace, scopeId: string, label: string): Promise<MemorySnapshot>;
  getSnapshot(ctx: MemoryAccessContext, snapshotId: string): Promise<MemorySnapshot>;
  listSnapshots(ctx: MemoryAccessContext, namespace: MemoryNamespace, scopeId: string): Promise<MemorySnapshot[]>;
  deleteSnapshot(ctx: MemoryAccessContext, snapshotId: string): Promise<void>;

  getStats(ctx: MemoryAccessContext, workspaceId?: string): Promise<MemoryStats>;
  getHealth(): MemoryHealthStatus;
}

export function createMemoryEngine(deps: {
  store: MemoryStore;
  revisionStore: RevisionStore;
  snapshotStore: SnapshotStore;
  statsStore: StatsStore;
  accessLayer: MemoryAccessLayer;
  cache: MemoryCache;
  index: MemoryIndex;
  events: MemoryEventEmitter;
  namespaceResolver: NamespaceResolver;
  versionManager: VersionManager;
}): MemoryEngine {
  let lastWriteAt: number | null = null;
  let lastReadAt: number | null = null;

  function validateInput(input: CreateMemoryInput): void {
    if (!input.title || input.title.trim().length === 0) {
      throw MemoryError.validationFailed('Title is required');
    }
    if (!input.content || input.content.trim().length === 0) {
      throw MemoryError.validationFailed('Content is required');
    }
    if (!input.organizationId) {
      throw MemoryError.validationFailed('Organization ID is required');
    }
    if (!input.workspaceId) {
      throw MemoryError.validationFailed('Workspace ID is required');
    }
    deps.namespaceResolver.validate(input.namespace);
  }

  async function resolveEntry(entryId: string): Promise<MemoryEntry> {
    const cached = deps.cache.get(entryId);
    if (cached) return cached;

    const entry = await deps.store.getById(entryId);
    if (!entry) throw MemoryError.entryNotFound(entryId);

    deps.cache.set(entry);
    return entry;
  }

  return {
    async create(ctx: MemoryAccessContext, input: CreateMemoryInput): Promise<MemoryEntry> {
      validateInput(input);
      deps.accessLayer.assertOrganizationScope(ctx, input.organizationId);
      deps.accessLayer.assertWrite(ctx, input.namespace);

      const entry = await deps.store.create(input);

      deps.cache.set(entry);
      deps.index.add(entry);
      lastWriteAt = Date.now();

      await deps.events.emitCreated(entry);
      logger.info('memory.engine', `Memory created: ${entry.id} in ${entry.namespace}:${entry.scopeId}`);

      return entry;
    },

    async getById(ctx: MemoryAccessContext, entryId: string): Promise<MemoryEntry> {
      const entry = await resolveEntry(entryId);
      deps.accessLayer.assertRead(ctx, entry);
      lastReadAt = Date.now();
      return entry;
    },

    async update(ctx: MemoryAccessContext, entryId: string, input: UpdateMemoryInput): Promise<MemoryEntry> {
      const existing = await resolveEntry(entryId);
      deps.accessLayer.assertRead(ctx, existing);
      deps.accessLayer.assertWrite(ctx, existing.namespace);

      const previousVersion = existing.version;
      const updated = await deps.store.update(entryId, input, previousVersion);

      deps.cache.set(updated);
      deps.index.remove(entryId);
      deps.index.add(updated);
      lastWriteAt = Date.now();

      const revision = await deps.revisionStore.getLatestRevision(entryId);
      if (revision) {
        await deps.events.emitUpdated(updated, revision, previousVersion);
      }
      logger.info('memory.engine', `Memory updated: ${entryId} (v${updated.version})`);

      return updated;
    },

    async delete(ctx: MemoryAccessContext, entryId: string): Promise<void> {
      const entry = await resolveEntry(entryId);
      deps.accessLayer.assertDelete(ctx, entry);

      await deps.store.softDelete(entryId, ctx.userId);

      deps.cache.invalidate(entryId);
      deps.index.remove(entryId);
      lastWriteAt = Date.now();

      await deps.events.emitDeleted(entryId, entry.namespace, entry.scopeId, ctx.userId);
      logger.info('memory.engine', `Memory deleted: ${entryId}`);
    },

    async restore(ctx: MemoryAccessContext, entryId: string): Promise<MemoryEntry> {
      const entry = await deps.store.getById(entryId);
      if (!entry) throw MemoryError.entryNotFound(entryId);
      deps.accessLayer.assertOrganizationScope(ctx, entry.organizationId);
      deps.accessLayer.assertWrite(ctx, entry.namespace);

      const restored = await deps.store.restore(entryId);

      deps.cache.set(restored);
      deps.index.add(restored);
      lastWriteAt = Date.now();

      await deps.events.emitRestored(restored);
      logger.info('memory.engine', `Memory restored: ${entryId}`);

      return restored;
    },

    async hardDelete(ctx: MemoryAccessContext, entryId: string): Promise<void> {
      const entry = await deps.store.getById(entryId);
      if (!entry) throw MemoryError.entryNotFound(entryId);
      deps.accessLayer.assertDelete(ctx, entry);

      if (!ctx.isFounder) {
        throw MemoryError.accessDenied(entryId, 'Only founders can permanently delete memory entries');
      }

      await deps.store.hardDelete(entryId);
      deps.cache.invalidate(entryId);
      deps.index.remove(entryId);
      lastWriteAt = Date.now();

      await deps.events.emitHardDeleted(entryId);
      logger.info('memory.engine', `Memory hard-deleted: ${entryId}`);
    },

    async archive(ctx: MemoryAccessContext, entryId: string): Promise<void> {
      const entry = await resolveEntry(entryId);
      deps.accessLayer.assertWrite(ctx, entry.namespace);

      await deps.store.softDelete(entryId, null);

      deps.cache.invalidate(entryId);
      deps.index.remove(entryId);
      lastWriteAt = Date.now();

      await deps.events.emitArchived(entryId, entry.namespace);
      logger.info('memory.engine', `Memory archived: ${entryId}`);
    },

    async query(ctx: MemoryAccessContext, filter: MemoryFilter, page = 1, pageSize = 20): Promise<MemoryPage> {
      deps.accessLayer.assertOrganizationScope(ctx, ctx.organizationId);

      const scopedFilter: MemoryFilter = {
        ...filter,
        organizationId: ctx.organizationId,
      };

      if (ctx.workspaceId) {
        scopedFilter.workspaceId = ctx.workspaceId;
      }

      lastReadAt = Date.now();
      return deps.store.query(scopedFilter, page, pageSize);
    },

    async count(ctx: MemoryAccessContext, filter: MemoryFilter): Promise<number> {
      deps.accessLayer.assertOrganizationScope(ctx, ctx.organizationId);

      const scopedFilter: MemoryFilter = {
        ...filter,
        organizationId: ctx.organizationId,
      };

      return deps.store.count(scopedFilter);
    },

    async getHistory(ctx: MemoryAccessContext, entryId: string): Promise<MemoryRevision[]> {
      const entry = await resolveEntry(entryId);
      deps.accessLayer.assertRead(ctx, entry);
      return deps.versionManager.getHistory(entryId);
    },

    async getVersion(ctx: MemoryAccessContext, entryId: string, version: number): Promise<MemoryRevision> {
      const entry = await resolveEntry(entryId);
      deps.accessLayer.assertRead(ctx, entry);
      return deps.versionManager.getVersion(entryId, version);
    },

    async compareVersions(ctx: MemoryAccessContext, entryId: string, versionA: number, versionB: number): Promise<VersionDiff> {
      const entry = await resolveEntry(entryId);
      deps.accessLayer.assertRead(ctx, entry);
      return deps.versionManager.compareVersions(entryId, versionA, versionB);
    },

    async createSnapshot(ctx: MemoryAccessContext, namespace: MemoryNamespace, scopeId: string, label: string): Promise<MemorySnapshot> {
      deps.namespaceResolver.validate(namespace);
      deps.accessLayer.assertWrite(ctx, namespace);

      const entries = await deps.store.query(
        { namespace, scopeId, organizationId: ctx.organizationId, status: 'active' },
        1,
        10000,
      );

      const snapshot = await deps.snapshotStore.createSnapshot({
        namespace,
        scopeId,
        label,
        entryCount: entries.total,
        createdBy: ctx.userId,
        createdAt: Date.now(),
        entryIds: entries.entries.map((e) => e.id),
      });

      await deps.events.emitSnapshotCreated(snapshot);
      logger.info('memory.engine', `Snapshot created: ${snapshot.id} (${entries.total} entries)`);

      return snapshot;
    },

    async getSnapshot(ctx: MemoryAccessContext, snapshotId: string): Promise<MemorySnapshot> {
      const snapshot = await deps.snapshotStore.getSnapshotById(snapshotId);
      if (!snapshot) throw MemoryError.snapshotNotFound(snapshotId);
      return snapshot;
    },

    async listSnapshots(ctx: MemoryAccessContext, namespace: MemoryNamespace, scopeId: string): Promise<MemorySnapshot[]> {
      deps.namespaceResolver.validate(namespace);
      return deps.snapshotStore.listSnapshotsByScope(namespace, scopeId);
    },

    async deleteSnapshot(ctx: MemoryAccessContext, snapshotId: string): Promise<void> {
      const snapshot = await deps.snapshotStore.getSnapshotById(snapshotId);
      if (!snapshot) throw MemoryError.snapshotNotFound(snapshotId);

      await deps.snapshotStore.deleteSnapshot(snapshotId);
      await deps.events.emitSnapshotDeleted(snapshotId);
      logger.info('memory.engine', `Snapshot deleted: ${snapshotId}`);
    },

    async getStats(ctx: MemoryAccessContext, workspaceId?: string): Promise<MemoryStats> {
      deps.accessLayer.assertOrganizationScope(ctx, ctx.organizationId);
      return deps.statsStore.getStats(ctx.organizationId, workspaceId);
    },

    getHealth(): MemoryHealthStatus {
      return {
        storeAvailable: true,
        cacheAvailable: true,
        totalEntries: deps.cache.size(),
        lastWriteAt,
        lastReadAt,
      };
    },
  };
}
