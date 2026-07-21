export type {
  MemoryNamespace,
  MemorySourceType,
  MemoryType,
  MemoryStatus,
  RelationshipType,
  MemoryId,
  MemoryMetadata,
  MemoryReference,
  MemoryEntry,
  MemoryRevision,
  MemorySnapshot,
  MemoryFilter,
  MemoryPage,
  CreateMemoryInput,
  UpdateMemoryInput,
  MemoryAccessContext,
  MemoryStats,
  MemoryHealthStatus,
} from './types';

export { MemoryError, isMemoryError } from './errors';
export type { MemoryErrorCode } from './errors';

export type { MemoryStore, RevisionStore, SnapshotStore, StatsStore } from './stores/types';
export { createInMemoryStore } from './stores/in-memory-store';

export type { MemoryAccessLayer } from './permissions/access';
export { createMemoryAccessLayer } from './permissions/access';

export type { MemoryCache } from './cache/memory-cache';
export { createMemoryCache } from './cache/memory-cache';

export type { NamespaceResolver } from './resolver/namespace-resolver';
export { createNamespaceResolver } from './resolver/namespace-resolver';

export type { MemoryIndex } from './indexing/memory-index';
export { createMemoryIndex } from './indexing/memory-index';

export type {
  MemoryEventEmitter,
  MemoryCreatedPayload,
  MemoryUpdatedPayload,
  MemoryDeletedPayload,
  MemoryRestoredPayload,
  MemoryHardDeletedPayload,
  MemoryArchivedPayload,
  SnapshotCreatedPayload,
  SnapshotDeletedPayload,
} from './events/memory-events';
export { MEMORY_EVENTS, createMemoryEventEmitter } from './events/memory-events';

export type { MemoryQueryContext } from './context/memory-context';
export { buildScopedFilter, contextFromEntry } from './context/memory-context';

export type { VersionManager, VersionDiff } from './versioning/version-manager';
export { createVersionManager } from './versioning/version-manager';

export type { MemoryEngine } from './engine/memory-engine';
export { createMemoryEngine } from './engine/memory-engine';
