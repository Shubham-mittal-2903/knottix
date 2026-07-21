import type { AgentAccessContext, AgentDefinition } from '../types';
import { AgentError } from '../errors';

export interface AgentAccessLayer {
  canInvoke(ctx: AgentAccessContext, agent: AgentDefinition): boolean;
  assertInvoke(ctx: AgentAccessContext, agent: AgentDefinition): void;
  assertToolAllowed(agent: AgentDefinition, toolName: string): void;
}

export function createAgentAccessLayer(): AgentAccessLayer {
  function hasPermission(ctx: AgentAccessContext, permission: string): boolean {
    if (ctx.isFounder) return true;
    return ctx.permissions.includes(permission);
  }

  return {
    canInvoke(ctx: AgentAccessContext, agent: AgentDefinition): boolean {
      if (agent.organizationId && agent.organizationId !== ctx.organizationId) return false;
      return hasPermission(ctx, agent.permission);
    },

    assertInvoke(ctx: AgentAccessContext, agent: AgentDefinition): void {
      if (agent.status !== 'ready' && agent.status !== 'registered') {
        throw AgentError.agentInactive(agent.key);
      }
      if (!this.canInvoke(ctx, agent)) {
        throw AgentError.accessDenied(agent.key, `Requires permission: ${agent.permission}`);
      }
    },

    assertToolAllowed(agent: AgentDefinition, toolName: string): void {
      if (!agent.allowedTools.includes(toolName)) {
        throw AgentError.toolNotAllowed(agent.key, toolName);
      }
    },
  };
}
