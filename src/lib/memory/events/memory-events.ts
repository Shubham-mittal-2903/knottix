import type { EventBus } from '@/lib/kernel/types';
import type { MemoryEntry, MemoryNamespace, MemoryRevision, MemorySnapshot } from '../types';
import { logger } from '@/lib/logger';

export const MEMORY_EVENTS = {
  CREATED: 'memory.created',
  UPDATED: 'memory.updated',
  DELETED: 'memory.deleted',
  RESTORED: 'memory.restored',
  HARD_DELETED: 'memory.hardDeleted',
  ARCHIVED: 'memory.archived',
  SNAPSHOT_CREATED: 'memory.snapshot.created',
  SNAPSHOT_DELETED: 'memory.snapshot.deleted',
} as const;

export interface MemoryCreatedPayload {
  entry: MemoryEntry;
}

export interface MemoryUpdatedPayload {
  entry: MemoryEntry;
  revision: MemoryRevision;
  previousVersion: number;
}

export interface MemoryDeletedPayload {
  entryId: string;
  namespace: MemoryNamespace;
  scopeId: string;
  deletedBy: string | null;
}

export interface MemoryRestoredPayload {
  entry: MemoryEntry;
}

export interface MemoryHardDeletedPayload {
  entryId: string;
}

export interface MemoryArchivedPayload {
  entryId: string;
  namespace: MemoryNamespace;
}

export interface SnapshotCreatedPayload {
  snapshot: MemorySnapshot;
}

export interface SnapshotDeletedPayload {
  snapshotId: string;
}

export interface MemoryEventEmitter {
  emitCreated(entry: MemoryEntry): Promise<void>;
  emitUpdated(entry: MemoryEntry, revision: MemoryRevision, previousVersion: number): Promise<void>;
  emitDeleted(entryId: string, namespace: MemoryNamespace, scopeId: string, deletedBy: string | null): Promise<void>;
  emitRestored(entry: MemoryEntry): Promise<void>;
  emitHardDeleted(entryId: string): Promise<void>;
  emitArchived(entryId: string, namespace: MemoryNamespace): Promise<void>;
  emitSnapshotCreated(snapshot: MemorySnapshot): Promise<void>;
  emitSnapshotDeleted(snapshotId: string): Promise<void>;
}

export function createMemoryEventEmitter(eventBus: EventBus): MemoryEventEmitter {
  const SOURCE = 'memory-engine';

  async function emit(type: string, payload: unknown): Promise<void> {
    try {
      await eventBus.emit(type, payload, SOURCE);
    } catch (err) {
      logger.error('memory.events', `Failed to emit event: ${type}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    async emitCreated(entry: MemoryEntry): Promise<void> {
      await emit(MEMORY_EVENTS.CREATED, { entry } satisfies MemoryCreatedPayload);
    },

    async emitUpdated(entry: MemoryEntry, revision: MemoryRevision, previousVersion: number): Promise<void> {
      await emit(MEMORY_EVENTS.UPDATED, { entry, revision, previousVersion } satisfies MemoryUpdatedPayload);
    },

    async emitDeleted(entryId: string, namespace: MemoryNamespace, scopeId: string, deletedBy: string | null): Promise<void> {
      await emit(MEMORY_EVENTS.DELETED, { entryId, namespace, scopeId, deletedBy } satisfies MemoryDeletedPayload);
    },

    async emitRestored(entry: MemoryEntry): Promise<void> {
      await emit(MEMORY_EVENTS.RESTORED, { entry } satisfies MemoryRestoredPayload);
    },

    async emitHardDeleted(entryId: string): Promise<void> {
      await emit(MEMORY_EVENTS.HARD_DELETED, { entryId } satisfies MemoryHardDeletedPayload);
    },

    async emitArchived(entryId: string, namespace: MemoryNamespace): Promise<void> {
      await emit(MEMORY_EVENTS.ARCHIVED, { entryId, namespace } satisfies MemoryArchivedPayload);
    },

    async emitSnapshotCreated(snapshot: MemorySnapshot): Promise<void> {
      await emit(MEMORY_EVENTS.SNAPSHOT_CREATED, { snapshot } satisfies SnapshotCreatedPayload);
    },

    async emitSnapshotDeleted(snapshotId: string): Promise<void> {
      await emit(MEMORY_EVENTS.SNAPSHOT_DELETED, { snapshotId } satisfies SnapshotDeletedPayload);
    },
  };
}
