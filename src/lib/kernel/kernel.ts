import type {
  AppContext,
  CommandBus,
  EventBus,
  FeatureFlagManager,
  HookManager,
  KernelInterface,
  LifecycleManager,
  ModuleDefinition,
  ModuleRegistry,
  OrganizationContext,
  PluginRegistry,
  RequestContext,
  ServiceContainer,
  SessionContext,
  WorkspaceContext,
} from './types';
import { createContainer } from './container';
import { createEventBus } from './event-bus';
import { createCommandBus } from './command-bus';
import { createHookManager } from './hook-manager';
import { createModuleRegistry } from './module-registry';
import { createPluginRegistry } from './plugin-registry';
import { createLifecycleManager } from './lifecycle';
import { createFeatureFlagManager } from './feature-flags';
import { createAppContext, createRequestContext } from './context';
import { logger } from '@/lib/logger';

interface KernelConfig {
  name: string;
  version: string;
  environment: string;
  modules?: ModuleDefinition[];
}

export function createKernel(config: KernelConfig): KernelInterface {
  const appContext = createAppContext(config.name, config.version, config.environment);
  const container = createContainer();
  const events = createEventBus();
  const commands = createCommandBus();
  const hooks = createHookManager();
  const lifecycle = createLifecycleManager();
  const features = createFeatureFlagManager();
  const moduleRegistry = createModuleRegistry();

  let booted = false;

  const kernel: KernelInterface = {
    container,
    events,
    commands,
    hooks,
    modules: moduleRegistry,
    plugins: null as unknown as PluginRegistry,
    features,
    lifecycle,
    app: appContext,

    async boot(): Promise<void> {
      if (booted) {
        logger.warn('kernel', 'Kernel already booted');
        return;
      }

      logger.info('kernel', `Booting Knottix Kernel v${config.version}`);

      await lifecycle.transition('boot', kernel);

      if (config.modules) {
        for (const mod of config.modules) {
          moduleRegistry.add(mod);
        }
      }

      await lifecycle.transition('init', kernel);
      await moduleRegistry.initAll(kernel);
      await lifecycle.transition('ready', kernel);

      booted = true;
      logger.info('kernel', 'Kernel boot complete');
    },

    async shutdown(): Promise<void> {
      if (!booted) return;

      logger.info('kernel', 'Shutting down Knottix Kernel');
      await lifecycle.transition('shutdown', kernel);
      await moduleRegistry.stopAll(kernel);
      events.clear();
      booted = false;
      logger.info('kernel', 'Kernel shutdown complete');
    },

    createRequestContext(
      session: SessionContext,
      org: OrganizationContext,
      workspace: WorkspaceContext | null,
    ): RequestContext {
      return createRequestContext(appContext, session, org, workspace);
    },
  };

  const pluginRegistry = createPluginRegistry(kernel);
  (kernel as { plugins: PluginRegistry }).plugins = pluginRegistry;

  return kernel;
}
