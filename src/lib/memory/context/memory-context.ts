import type { MemoryAccessContext, MemoryEntry, MemoryFilter, MemoryNamespace } from '../types';

export interface MemoryQueryContext {
  accessContext: MemoryAccessContext;
  namespace?: MemoryNamespace;
  scopeId?: string;
  maxResults?: number;
}

export function buildScopedFilter(queryCtx: MemoryQueryContext, additionalFilter?: Partial<MemoryFilter>): MemoryFilter {
  const filter: MemoryFilter = {
    organizationId: queryCtx.accessContext.organizationId,
    status: 'active',
    ...additionalFilter,
  };

  if (queryCtx.namespace) {
    filter.namespace = queryCtx.namespace;
  }
  if (queryCtx.scopeId) {
    filter.scopeId = queryCtx.scopeId;
  }
  if (queryCtx.accessContext.workspaceId) {
    filter.workspaceId = queryCtx.accessContext.workspaceId;
  }

  return filter;
}

export function contextFromEntry(entry: MemoryEntry): MemoryQueryContext {
  return {
    accessContext: {
      userId: entry.createdBy ?? '',
      memberId: '',
      organizationId: entry.organizationId,
      workspaceId: entry.workspaceId,
      roleId: '',
      isFounder: false,
      permissions: [],
    },
    namespace: entry.namespace,
    scopeId: entry.scopeId,
  };
}
