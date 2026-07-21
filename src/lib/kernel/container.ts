import type { ServiceContainer, ServiceFactory, ServiceScope, ServiceToken } from './types';
import { logger } from '@/lib/logger';

interface Registration<T = unknown> {
  factory: ServiceFactory<T>;
  scope: ServiceScope;
  instance?: T;
}

export function createContainer(): ServiceContainer {
  const registry = new Map<symbol, Registration>();
  const resolving = new Set<symbol>();

  return {
    register<T>(token: ServiceToken<T>, factory: ServiceFactory<T>, scope: ServiceScope = 'singleton'): void {
      if (registry.has(token)) {
        logger.warn('kernel.container', `Service already registered: ${token.toString()}, overwriting`);
      }
      registry.set(token, { factory, scope });
    },

    resolve<T>(token: ServiceToken<T>): T {
      const registration = registry.get(token) as Registration<T> | undefined;
      if (!registration) {
        throw new Error(`Service not registered: ${token.toString()}`);
      }

      if (registration.scope === 'singleton' && registration.instance !== undefined) {
        return registration.instance;
      }

      if (resolving.has(token)) {
        throw new Error(`Circular dependency detected: ${token.toString()}`);
      }

      resolving.add(token);
      try {
        const instance = registration.factory(this);
        if (registration.scope === 'singleton') {
          registration.instance = instance;
        }
        return instance;
      } finally {
        resolving.delete(token);
      }
    },

    has(token: ServiceToken): boolean {
      return registry.has(token);
    },
  };
}
