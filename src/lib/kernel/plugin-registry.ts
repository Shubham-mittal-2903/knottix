import type { KernelInterface, PluginDefinition, PluginInfo, PluginRegistry } from './types';
import { logger } from '@/lib/logger';

interface PluginEntry {
  definition: PluginDefinition;
  installed: boolean;
}

export function createPluginRegistry(kernel: KernelInterface): PluginRegistry {
  const plugins = new Map<string, PluginEntry>();

  return {
    async install(definition: PluginDefinition): Promise<void> {
      if (plugins.has(definition.id)) {
        throw new Error(`Plugin already registered: ${definition.id}`);
      }
      const entry: PluginEntry = { definition, installed: false };
      plugins.set(definition.id, entry);

      try {
        await definition.install(kernel);
        entry.installed = true;
        logger.info('kernel.plugins', `Plugin installed: ${definition.id} v${definition.version}`);
      } catch (err) {
        plugins.delete(definition.id);
        logger.error('kernel.plugins', `Plugin install failed: ${definition.id}`, { error: err });
        throw err;
      }
    },

    async uninstall(id: string): Promise<void> {
      const entry = plugins.get(id);
      if (!entry) {
        throw new Error(`Plugin not found: ${id}`);
      }
      if (entry.definition.uninstall) {
        await entry.definition.uninstall(kernel);
      }
      plugins.delete(id);
      logger.info('kernel.plugins', `Plugin uninstalled: ${id}`);
    },

    get(id: string): PluginInfo | undefined {
      const entry = plugins.get(id);
      if (!entry) return undefined;
      return {
        id: entry.definition.id,
        name: entry.definition.name,
        version: entry.definition.version,
        installed: entry.installed,
      };
    },

    list(): PluginInfo[] {
      return Array.from(plugins.values()).map((entry) => ({
        id: entry.definition.id,
        name: entry.definition.name,
        version: entry.definition.version,
        installed: entry.installed,
      }));
    },

    has(id: string): boolean {
      return plugins.has(id);
    },
  };
}
