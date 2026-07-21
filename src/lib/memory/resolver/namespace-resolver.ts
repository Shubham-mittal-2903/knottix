import type { MemoryId, MemoryNamespace } from '../types';
import { MemoryError } from '../errors';

const VALID_NAMESPACES: Set<string> = new Set<MemoryNamespace>([
  'organization',
  'workspace',
  'department',
  'team',
  'project',
  'client',
  'document',
  'knowledge',
  'conversation',
  'user',
  'agent',
]);

export interface NamespaceResolver {
  validate(namespace: string): MemoryNamespace;
  parseMemoryId(compositeId: string): MemoryId;
  buildCompositeId(namespace: MemoryNamespace, scopeId: string, entryId: string): string;
  isValidNamespace(namespace: string): boolean;
  listNamespaces(): MemoryNamespace[];
}

export function createNamespaceResolver(): NamespaceResolver {
  return {
    validate(namespace: string): MemoryNamespace {
      if (!VALID_NAMESPACES.has(namespace)) {
        throw MemoryError.namespaceInvalid(namespace);
      }
      return namespace as MemoryNamespace;
    },

    parseMemoryId(compositeId: string): MemoryId {
      const parts = compositeId.split(':');
      if (parts.length !== 3) {
        throw MemoryError.validationFailed(`Invalid memory ID format: ${compositeId}. Expected namespace:scopeId:entryId`);
      }
      const [namespace, scopeId, entryId] = parts;
      return {
        namespace: this.validate(namespace),
        scopeId,
        entryId,
      };
    },

    buildCompositeId(namespace: MemoryNamespace, scopeId: string, entryId: string): string {
      return `${namespace}:${scopeId}:${entryId}`;
    },

    isValidNamespace(namespace: string): boolean {
      return VALID_NAMESPACES.has(namespace);
    },

    listNamespaces(): MemoryNamespace[] {
      return Array.from(VALID_NAMESPACES) as MemoryNamespace[];
    },
  };
}
