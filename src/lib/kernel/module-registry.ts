import type { KernelInterface, ModuleDefinition, ModuleInfo, ModuleRegistry, ModuleStatus } from './types';
import { logger } from '@/lib/logger';

interface ModuleEntry {
  definition: ModuleDefinition;
  status: ModuleStatus;
}

export function createModuleRegistry(): ModuleRegistry & {
  initAll(kernel: KernelInterface): Promise<void>;
  stopAll(kernel: KernelInterface): Promise<void>;
  setStatus(id: string, status: ModuleStatus): void;
  getDefinition(id: string): ModuleDefinition | undefined;
  sortedByDependency(): ModuleDefinition[];
} {
  const modules = new Map<string, ModuleEntry>();

  function toInfo(entry: ModuleEntry): ModuleInfo {
    return {
      id: entry.definition.id,
      name: entry.definition.name,
      version: entry.definition.version,
      status: entry.status,
      dependencies: entry.definition.dependencies ?? [],
    };
  }

  function topologicalSort(entries: Map<string, ModuleEntry>): ModuleDefinition[] {
    const sorted: ModuleDefinition[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    function visit(id: string): void {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(`Circular module dependency detected: ${id}`);
      }
      visiting.add(id);

      const entry = entries.get(id);
      if (!entry) {
        throw new Error(`Module dependency not found: ${id}`);
      }

      for (const dep of entry.definition.dependencies ?? []) {
        visit(dep);
      }

      visiting.delete(id);
      visited.add(id);
      sorted.push(entry.definition);
    }

    for (const id of entries.keys()) {
      visit(id);
    }

    return sorted;
  }

  return {
    add(definition: ModuleDefinition): void {
      if (modules.has(definition.id)) {
        throw new Error(`Module already registered: ${definition.id}`);
      }
      modules.set(definition.id, { definition, status: 'registered' });
      logger.info('kernel.modules', `Module registered: ${definition.id} v${definition.version}`);
    },

    get(id: string): ModuleInfo | undefined {
      const entry = modules.get(id);
      return entry ? toInfo(entry) : undefined;
    },

    list(): ModuleInfo[] {
      return Array.from(modules.values()).map(toInfo);
    },

    has(id: string): boolean {
      return modules.has(id);
    },

    setStatus(id: string, status: ModuleStatus): void {
      const entry = modules.get(id);
      if (entry) {
        entry.status = status;
      }
    },

    getDefinition(id: string): ModuleDefinition | undefined {
      return modules.get(id)?.definition;
    },

    sortedByDependency(): ModuleDefinition[] {
      return topologicalSort(modules);
    },

    async initAll(kernel: KernelInterface): Promise<void> {
      const sorted = topologicalSort(modules);

      for (const def of sorted) {
        const entry = modules.get(def.id)!;
        entry.status = 'initializing';
        try {
          await def.register(kernel);
          if (def.init) {
            await def.init(kernel);
          }
          entry.status = 'ready';
          logger.info('kernel.modules', `Module initialized: ${def.id}`);
        } catch (err) {
          entry.status = 'error';
          logger.error('kernel.modules', `Module init failed: ${def.id}`, { error: err });
          throw err;
        }
      }
    },

    async stopAll(kernel: KernelInterface): Promise<void> {
      const sorted = topologicalSort(modules);
      const reversed = sorted.reverse();

      for (const def of reversed) {
        const entry = modules.get(def.id)!;
        if (entry.status !== 'ready') continue;
        try {
          if (def.stop) {
            await def.stop(kernel);
          }
          entry.status = 'stopped';
          logger.info('kernel.modules', `Module stopped: ${def.id}`);
        } catch (err) {
          logger.error('kernel.modules', `Module stop failed: ${def.id}`, { error: err });
        }
      }
    },
  };
}
