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

export interface MemoryStore {
  create(input: CreateMemoryInput): Promise<MemoryEntry>;
  getById(entryId: string): Promise<MemoryEntry | null>;
  update(entryId: string, input: UpdateMemoryInput, expectedVersion: number): Promise<MemoryEntry>;
  softDelete(entryId: string, deletedBy: string | null): Promise<void>;
  restore(entryId: string): Promise<MemoryEntry>;
  hardDelete(entryId: string): Promise<void>;
  query(filter: MemoryFilter, page: number, pageSize: number): Promise<MemoryPage>;
  count(filter: MemoryFilter): Promise<number>;
  exists(entryId: string): Promise<boolean>;
}

export interface RevisionStore {
  createRevision(revision: Omit<MemoryRevision, 'id'>): Promise<MemoryRevision>;
  getRevisionsByEntryId(entryId: string): Promise<MemoryRevision[]>;
  getRevisionByVersion(entryId: string, version: number): Promise<MemoryRevision | null>;
  getLatestRevision(entryId: string): Promise<MemoryRevision | null>;
}

export interface SnapshotStore {
  createSnapshot(snapshot: Omit<MemorySnapshot, 'id'>): Promise<MemorySnapshot>;
  getSnapshotById(snapshotId: string): Promise<MemorySnapshot | null>;
  listSnapshotsByScope(namespace: string, scopeId: string): Promise<MemorySnapshot[]>;
  deleteSnapshot(snapshotId: string): Promise<void>;
}

export interface StatsStore {
  getStats(organizationId: string, workspaceId?: string): Promise<MemoryStats>;
}
