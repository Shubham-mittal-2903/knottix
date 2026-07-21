import type { RegisterToolInput, ToolDefinition, ToolFilter } from '../types';
import { ToolError } from '../errors';

let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `tool_${Date.now()}_${idCounter}`;
}

export interface ToolRegistry {
  register(input: RegisterToolInput): ToolDefinition;
  get(name: string): ToolDefinition;
  find(filter: ToolFilter): ToolDefinition[];
  list(): ToolDefinition[];
  deactivate(name: string): void;
  activate(name: string): void;
  exists(name: string): boolean;
  unregister(name: string): void;
  applyPersistedState(name: string, isActive: boolean): void;
}

export function createToolRegistry(): ToolRegistry {
  const tools = new Map<string, ToolDefinition>();

  return {
    register(input: RegisterToolInput): ToolDefinition {
      if (tools.has(input.name)) {
        throw ToolError.duplicateTool(input.name);
      }

      const tool: ToolDefinition = {
        id: generateId(),
        name: input.name,
        description: input.description,
        category: input.category,
        parameters: input.parameters ?? [],
        permission: input.permission,
        metadata: input.metadata ?? {},
        handler: input.handler,
        version: input.version ?? '1.0.0',
        isActive: true,
        registeredAt: Date.now(),
      };

      tools.set(tool.name, tool);
      return tool;
    },

    get(name: string): ToolDefinition {
      const tool = tools.get(name);
      if (!tool) throw ToolError.toolNotFound(name);
      return tool;
    },

    find(filter: ToolFilter): ToolDefinition[] {
      return Array.from(tools.values()).filter((tool) => {
        if (filter.category && tool.category !== filter.category) return false;
        if (filter.isActive !== undefined && tool.isActive !== filter.isActive) return false;
        if (filter.tag && !(tool.metadata.tags ?? []).includes(filter.tag)) return false;
        if (filter.search) {
          const lower = filter.search.toLowerCase();
          if (!tool.name.toLowerCase().includes(lower) && !tool.description.toLowerCase().includes(lower)) {
            return false;
          }
        }
        return true;
      });
    },

    list(): ToolDefinition[] {
      return Array.from(tools.values());
    },

    deactivate(name: string): void {
      const tool = tools.get(name);
      if (!tool) throw ToolError.toolNotFound(name);
      tool.isActive = false;
    },

    activate(name: string): void {
      const tool = tools.get(name);
      if (!tool) throw ToolError.toolNotFound(name);
      tool.isActive = true;
    },

    exists(name: string): boolean {
      return tools.has(name);
    },

    unregister(name: string): void {
      tools.delete(name);
    },

    applyPersistedState(name: string, isActive: boolean): void {
      const tool = tools.get(name);
      if (tool) tool.isActive = isActive;
    },
  };
}
