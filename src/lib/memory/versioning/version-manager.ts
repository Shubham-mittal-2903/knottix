import type { MemoryRevision } from '../types';
import type { RevisionStore } from '../stores/types';
import { MemoryError } from '../errors';

export interface VersionManager {
  getHistory(entryId: string): Promise<MemoryRevision[]>;
  getVersion(entryId: string, version: number): Promise<MemoryRevision>;
  getLatest(entryId: string): Promise<MemoryRevision | null>;
  compareVersions(entryId: string, versionA: number, versionB: number): Promise<VersionDiff>;
}

export interface VersionDiff {
  entryId: string;
  versionA: number;
  versionB: number;
  titleChanged: boolean;
  contentChanged: boolean;
  summaryChanged: boolean;
  tagsAdded: string[];
  tagsRemoved: string[];
  metadataChanged: boolean;
}

export function createVersionManager(revisionStore: RevisionStore): VersionManager {
  return {
    async getHistory(entryId: string): Promise<MemoryRevision[]> {
      return revisionStore.getRevisionsByEntryId(entryId);
    },

    async getVersion(entryId: string, version: number): Promise<MemoryRevision> {
      const revision = await revisionStore.getRevisionByVersion(entryId, version);
      if (!revision) {
        throw MemoryError.entryNotFound(`${entryId}@v${version}`);
      }
      return revision;
    },

    async getLatest(entryId: string): Promise<MemoryRevision | null> {
      return revisionStore.getLatestRevision(entryId);
    },

    async compareVersions(entryId: string, versionA: number, versionB: number): Promise<VersionDiff> {
      const [a, b] = await Promise.all([
        this.getVersion(entryId, versionA),
        this.getVersion(entryId, versionB),
      ]);

      const tagsA = new Set(a.tags);
      const tagsB = new Set(b.tags);
      const tagsAdded = b.tags.filter((t) => !tagsA.has(t));
      const tagsRemoved = a.tags.filter((t) => !tagsB.has(t));

      return {
        entryId,
        versionA,
        versionB,
        titleChanged: a.title !== b.title,
        contentChanged: a.content !== b.content,
        summaryChanged: a.summary !== b.summary,
        tagsAdded,
        tagsRemoved,
        metadataChanged: JSON.stringify(a.metadata) !== JSON.stringify(b.metadata),
      };
    },
  };
}
