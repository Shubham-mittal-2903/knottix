import type { ToolAccessContext, ToolDefinition } from '../types';
import { ToolError } from '../errors';

export interface ToolAccessLayer {
  canExecute(ctx: ToolAccessContext, tool: ToolDefinition): boolean;
  assertExecute(ctx: ToolAccessContext, tool: ToolDefinition): void;
}

export function createToolAccessLayer(): ToolAccessLayer {
  function hasPermission(ctx: ToolAccessContext, permission: string): boolean {
    if (ctx.isFounder) return true;
    return ctx.permissions.includes(permission);
  }

  return {
    canExecute(ctx: ToolAccessContext, tool: ToolDefinition): boolean {
      return hasPermission(ctx, tool.permission);
    },

    assertExecute(ctx: ToolAccessContext, tool: ToolDefinition): void {
      if (!tool.isActive) {
        throw ToolError.toolInactive(tool.name);
      }
      if (!this.canExecute(ctx, tool)) {
        throw ToolError.accessDenied(tool.name, `Requires permission: ${tool.permission}`);
      }
    },
  };
}
