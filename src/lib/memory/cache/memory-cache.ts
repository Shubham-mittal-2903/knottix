import type { MemoryEntry } from '../types';

export interface MemoryCache {
  get(entryId: string): MemoryEntry | undefined;
  set(entry: MemoryEntry): void;
  invalidate(entryId: string): void;
  invalidateByScope(namespace: string, scopeId: string): void;
  clear(): void;
  size(): number;
  has(entryId: string): boolean;
}

interface CacheEntry {
  entry: MemoryEntry;
  accessedAt: number;
}

export function createMemoryCache(maxSize: number = 500): MemoryCache {
  const cache = new Map<string, CacheEntry>();
  const scopeIndex = new Map<string, Set<string>>();

  function scopeKey(namespace: string, scopeId: string): string {
    return `${namespace}:${scopeId}`;
  }

  function evictOldest(): void {
    if (cache.size <= maxSize) return;

    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, value] of cache) {
      if (value.accessedAt < oldestTime) {
        oldestTime = value.accessedAt;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      const removed = cache.get(oldestKey);
      cache.delete(oldestKey);
      if (removed) {
        const sk = scopeKey(removed.entry.namespace, removed.entry.scopeId);
        scopeIndex.get(sk)?.delete(oldestKey);
      }
    }
  }

  return {
    get(entryId: string): MemoryEntry | undefined {
      const cached = cache.get(entryId);
      if (!cached) return undefined;
      cached.accessedAt = Date.now();
      return cached.entry;
    },

    set(entry: MemoryEntry): void {
      cache.set(entry.id, { entry, accessedAt: Date.now() });

      const sk = scopeKey(entry.namespace, entry.scopeId);
      let set = scopeIndex.get(sk);
      if (!set) {
        set = new Set();
        scopeIndex.set(sk, set);
      }
      set.add(entry.id);

      evictOldest();
    },

    invalidate(entryId: string): void {
      const cached = cache.get(entryId);
      if (cached) {
        const sk = scopeKey(cached.entry.namespace, cached.entry.scopeId);
        scopeIndex.get(sk)?.delete(entryId);
      }
      cache.delete(entryId);
    },

    invalidateByScope(namespace: string, scopeId: string): void {
      const sk = scopeKey(namespace, scopeId);
      const ids = scopeIndex.get(sk);
      if (ids) {
        for (const id of ids) {
          cache.delete(id);
        }
        scopeIndex.delete(sk);
      }
    },

    clear(): void {
      cache.clear();
      scopeIndex.clear();
    },

    size(): number {
      return cache.size;
    },

    has(entryId: string): boolean {
      return cache.has(entryId);
    },
  };
}
