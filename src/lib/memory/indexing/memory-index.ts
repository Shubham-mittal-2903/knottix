import type { MemoryEntry, MemoryNamespace, MemorySourceType } from '../types';

export interface MemoryIndex {
  add(entry: MemoryEntry): void;
  remove(entryId: string): void;
  findByTag(tag: string): string[];
  findByNamespace(namespace: MemoryNamespace): string[];
  findBySourceType(sourceType: MemorySourceType): string[];
  findByScope(namespace: MemoryNamespace, scopeId: string): string[];
  findByOrganization(organizationId: string): string[];
  findByWorkspace(workspaceId: string): string[];
  findByReference(targetId: string): string[];
  rebuild(entries: MemoryEntry[]): void;
  clear(): void;
}

export function createMemoryIndex(): MemoryIndex {
  const tagIndex = new Map<string, Set<string>>();
  const namespaceIndex = new Map<string, Set<string>>();
  const sourceTypeIndex = new Map<string, Set<string>>();
  const scopeIndex = new Map<string, Set<string>>();
  const orgIndex = new Map<string, Set<string>>();
  const workspaceIndex = new Map<string, Set<string>>();
  const referenceIndex = new Map<string, Set<string>>();

  function addToIndex(index: Map<string, Set<string>>, key: string, entryId: string): void {
    let set = index.get(key);
    if (!set) {
      set = new Set();
      index.set(key, set);
    }
    set.add(entryId);
  }

  function removeFromIndex(index: Map<string, Set<string>>, key: string, entryId: string): void {
    const set = index.get(key);
    if (set) {
      set.delete(entryId);
      if (set.size === 0) index.delete(key);
    }
  }

  function scopeKey(namespace: string, scopeId: string): string {
    return `${namespace}:${scopeId}`;
  }

  function getIds(index: Map<string, Set<string>>, key: string): string[] {
    return Array.from(index.get(key) ?? []);
  }

  let entryMeta = new Map<string, MemoryEntry>();

  return {
    add(entry: MemoryEntry): void {
      entryMeta.set(entry.id, entry);

      for (const tag of entry.tags) {
        addToIndex(tagIndex, tag, entry.id);
      }
      addToIndex(namespaceIndex, entry.namespace, entry.id);
      addToIndex(sourceTypeIndex, entry.sourceType, entry.id);
      addToIndex(scopeIndex, scopeKey(entry.namespace, entry.scopeId), entry.id);
      addToIndex(orgIndex, entry.organizationId, entry.id);
      addToIndex(workspaceIndex, entry.workspaceId, entry.id);

      for (const ref of entry.references) {
        addToIndex(referenceIndex, ref.targetId, entry.id);
      }
    },

    remove(entryId: string): void {
      const entry = entryMeta.get(entryId);
      if (!entry) return;

      for (const tag of entry.tags) {
        removeFromIndex(tagIndex, tag, entryId);
      }
      removeFromIndex(namespaceIndex, entry.namespace, entryId);
      removeFromIndex(sourceTypeIndex, entry.sourceType, entryId);
      removeFromIndex(scopeIndex, scopeKey(entry.namespace, entry.scopeId), entryId);
      removeFromIndex(orgIndex, entry.organizationId, entryId);
      removeFromIndex(workspaceIndex, entry.workspaceId, entryId);

      for (const ref of entry.references) {
        removeFromIndex(referenceIndex, ref.targetId, entryId);
      }

      entryMeta.delete(entryId);
    },

    findByTag(tag: string): string[] {
      return getIds(tagIndex, tag);
    },

    findByNamespace(namespace: MemoryNamespace): string[] {
      return getIds(namespaceIndex, namespace);
    },

    findBySourceType(sourceType: MemorySourceType): string[] {
      return getIds(sourceTypeIndex, sourceType);
    },

    findByScope(namespace: MemoryNamespace, scopeId: string): string[] {
      return getIds(scopeIndex, scopeKey(namespace, scopeId));
    },

    findByOrganization(organizationId: string): string[] {
      return getIds(orgIndex, organizationId);
    },

    findByWorkspace(workspaceId: string): string[] {
      return getIds(workspaceIndex, workspaceId);
    },

    findByReference(targetId: string): string[] {
      return getIds(referenceIndex, targetId);
    },

    rebuild(entries: MemoryEntry[]): void {
      this.clear();
      for (const entry of entries) {
        this.add(entry);
      }
    },

    clear(): void {
      tagIndex.clear();
      namespaceIndex.clear();
      sourceTypeIndex.clear();
      scopeIndex.clear();
      orgIndex.clear();
      workspaceIndex.clear();
      referenceIndex.clear();
      entryMeta = new Map();
    },
  };
}
