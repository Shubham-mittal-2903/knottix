export type MemoryNamespace =
  | 'organization'
  | 'workspace'
  | 'department'
  | 'team'
  | 'project'
  | 'client'
  | 'document'
  | 'knowledge'
  | 'conversation'
  | 'user'
  | 'agent';

export type MemorySourceType =
  | 'MANUAL'
  | 'PROJECT'
  | 'CLIENT'
  | 'CONVERSATION'
  | 'AGENT'
  | 'SYSTEM'
  | 'DOCUMENT'
  | 'MEETING';

export type MemoryType =
  | 'FACT'
  | 'PREFERENCE'
  | 'CONTEXT'
  | 'DECISION'
  | 'INTERACTION'
  | 'INSIGHT';

export type MemoryStatus = 'active' | 'archived' | 'deleted';

export type RelationshipType =
  | 'references'
  | 'derived_from'
  | 'supersedes'
  | 'related_to'
  | 'part_of'
  | 'parent_of';

export interface MemoryId {
  namespace: MemoryNamespace;
  scopeId: string;
  entryId: string;
}

export interface MemoryMetadata {
  module?: string;
  projectId?: string;
  clientId?: string;
  departmentId?: string;
  teamId?: string;
  agentId?: string;
  conversationId?: string;
  documentId?: string;
  custom?: Record<string, unknown>;
}

export interface MemoryReference {
  targetId: string;
  targetNamespace: MemoryNamespace;
  relationship: RelationshipType;
  metadata?: Record<string, unknown>;
}

export interface MemoryEntry {
  id: string;
  namespace: MemoryNamespace;
  scopeId: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  content: string;
  summary: string | null;
  sourceType: MemorySourceType;
  memoryType: MemoryType;
  sourceId: string | null;
  tags: string[];
  categoryId: string | null;
  metadata: MemoryMetadata;
  references: MemoryReference[];
  status: MemoryStatus;
  version: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  deletedBy: string | null;
}

export interface MemoryRevision {
  id: string;
  entryId: string;
  version: number;
  title: string;
  content: string;
  summary: string | null;
  metadata: MemoryMetadata;
  tags: string[];
  changedBy: string | null;
  changedAt: number;
  changeReason: string | null;
}

export interface MemorySnapshot {
  id: string;
  namespace: MemoryNamespace;
  scopeId: string;
  label: string;
  entryCount: number;
  createdBy: string | null;
  createdAt: number;
  entryIds: string[];
}

export interface MemoryFilter {
  namespace?: MemoryNamespace;
  scopeId?: string;
  organizationId?: string;
  workspaceId?: string;
  sourceType?: MemorySourceType;
  memoryType?: MemoryType;
  tags?: string[];
  categoryId?: string;
  status?: MemoryStatus;
  createdBy?: string;
  createdAfter?: number;
  createdBefore?: number;
  search?: string;
}

export interface MemoryPage {
  entries: MemoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface CreateMemoryInput {
  namespace: MemoryNamespace;
  scopeId: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  content: string;
  summary?: string;
  sourceType: MemorySourceType;
  memoryType: MemoryType;
  sourceId?: string;
  tags?: string[];
  categoryId?: string;
  metadata?: MemoryMetadata;
  references?: MemoryReference[];
  createdBy?: string;
}

export interface UpdateMemoryInput {
  title?: string;
  content?: string;
  summary?: string;
  memoryType?: MemoryType;
  tags?: string[];
  categoryId?: string;
  metadata?: MemoryMetadata;
  references?: MemoryReference[];
  updatedBy?: string;
  changeReason?: string;
}

export interface MemoryAccessContext {
  userId: string;
  memberId: string;
  organizationId: string;
  workspaceId: string | null;
  roleId: string;
  isFounder: boolean;
  permissions: string[];
}

export interface MemoryStats {
  totalEntries: number;
  activeEntries: number;
  archivedEntries: number;
  deletedEntries: number;
  totalRevisions: number;
  entriesByNamespace: Record<string, number>;
  entriesBySourceType: Record<string, number>;
  entriesByMemoryType: Record<string, number>;
}

export interface MemoryHealthStatus {
  storeAvailable: boolean;
  cacheAvailable: boolean;
  totalEntries: number;
  lastWriteAt: number | null;
  lastReadAt: number | null;
}
