import type { MemoryAccessContext, MemoryEntry, MemoryNamespace } from '../types';
import { MemoryError } from '../errors';

const NAMESPACE_PERMISSIONS: Record<MemoryNamespace, string> = {
  organization: 'memory:read',
  workspace: 'memory:read',
  department: 'memory:read',
  team: 'memory:read',
  project: 'projects:read',
  client: 'clients:read',
  document: 'memory:read',
  knowledge: 'memory:read',
  conversation: 'memory:read',
  user: 'memory:read',
  agent: 'agents:read',
};

const WRITE_PERMISSIONS: Record<MemoryNamespace, string> = {
  organization: 'memory:write',
  workspace: 'memory:write',
  department: 'memory:write',
  team: 'memory:write',
  project: 'projects:write',
  client: 'clients:write',
  document: 'memory:write',
  knowledge: 'memory:write',
  conversation: 'memory:write',
  user: 'memory:write',
  agent: 'agents:write',
};

const DELETE_PERMISSION = 'memory:delete';

export interface MemoryAccessLayer {
  canRead(ctx: MemoryAccessContext, entry: MemoryEntry): boolean;
  canWrite(ctx: MemoryAccessContext, namespace: MemoryNamespace): boolean;
  canDelete(ctx: MemoryAccessContext): boolean;
  assertRead(ctx: MemoryAccessContext, entry: MemoryEntry): void;
  assertWrite(ctx: MemoryAccessContext, namespace: MemoryNamespace): void;
  assertDelete(ctx: MemoryAccessContext, entry: MemoryEntry): void;
  assertOrganizationScope(ctx: MemoryAccessContext, organizationId: string): void;
}

export function createMemoryAccessLayer(): MemoryAccessLayer {
  function hasPermission(ctx: MemoryAccessContext, permission: string): boolean {
    if (ctx.isFounder) return true;
    return ctx.permissions.includes(permission);
  }

  function isOrgMatch(ctx: MemoryAccessContext, orgId: string): boolean {
    return ctx.organizationId === orgId;
  }

  return {
    canRead(ctx: MemoryAccessContext, entry: MemoryEntry): boolean {
      if (!isOrgMatch(ctx, entry.organizationId)) return false;
      const required = NAMESPACE_PERMISSIONS[entry.namespace];
      if (!required) return false;
      return hasPermission(ctx, required);
    },

    canWrite(ctx: MemoryAccessContext, namespace: MemoryNamespace): boolean {
      const required = WRITE_PERMISSIONS[namespace];
      if (!required) return false;
      return hasPermission(ctx, required);
    },

    canDelete(ctx: MemoryAccessContext): boolean {
      return hasPermission(ctx, DELETE_PERMISSION);
    },

    assertRead(ctx: MemoryAccessContext, entry: MemoryEntry): void {
      if (!this.canRead(ctx, entry)) {
        throw MemoryError.accessDenied(entry.id, 'Insufficient read permissions');
      }
    },

    assertWrite(ctx: MemoryAccessContext, namespace: MemoryNamespace): void {
      if (!this.canWrite(ctx, namespace)) {
        throw MemoryError.accessDenied('', `Insufficient write permissions for namespace: ${namespace}`);
      }
    },

    assertDelete(ctx: MemoryAccessContext, entry: MemoryEntry): void {
      if (!isOrgMatch(ctx, entry.organizationId)) {
        throw MemoryError.accessDenied(entry.id, 'Organization mismatch');
      }
      if (!this.canDelete(ctx)) {
        throw MemoryError.accessDenied(entry.id, 'Insufficient delete permissions');
      }
    },

    assertOrganizationScope(ctx: MemoryAccessContext, organizationId: string): void {
      if (!isOrgMatch(ctx, organizationId)) {
        throw MemoryError.accessDenied('', 'Organization boundary violation');
      }
    },
  };
}
