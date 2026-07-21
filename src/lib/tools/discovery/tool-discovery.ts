import type { ToolDefinition, ToolDescriptor, ToolFilter, ToolInputSchema, ToolSchemaProperty } from '../types';
import type { ToolRegistry } from '../registry/tool-registry';

export interface ToolDiscovery {
  discover(filter?: ToolFilter): ToolDefinition[];
  toDescriptor(tool: ToolDefinition): ToolDescriptor;
  listDescriptors(filter?: ToolFilter): ToolDescriptor[];
  listCategories(): string[];
}

export function createToolDiscovery(registry: ToolRegistry): ToolDiscovery {
  return {
    discover(filter: ToolFilter = {}): ToolDefinition[] {
      return registry.find({ isActive: true, ...filter });
    },

    toDescriptor(tool: ToolDefinition): ToolDescriptor {
      const properties: Record<string, ToolSchemaProperty> = {};
      const required: string[] = [];

      for (const param of tool.parameters) {
        properties[param.name] = {
          type: param.type,
          description: param.description,
          enum: param.enum,
        };
        if (param.required) {
          required.push(param.name);
        }
      }

      const inputSchema: ToolInputSchema = {
        type: 'object',
        properties,
        required,
      };

      return {
        name: tool.name,
        description: tool.description,
        inputSchema,
      };
    },

    listDescriptors(filter: ToolFilter = {}): ToolDescriptor[] {
      return this.discover(filter).map((tool) => this.toDescriptor(tool));
    },

    listCategories(): string[] {
      const categories = new Set(registry.list().map((t) => t.category));
      return Array.from(categories);
    },
  };
}
