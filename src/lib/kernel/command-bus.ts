import type { CommandBus, CommandHandler, KernelCommand, RequestContext } from './types';

export function createCommandBus(): CommandBus {
  const handlers = new Map<string, CommandHandler>();

  return {
    register<TInput, TOutput>(type: string, handler: CommandHandler<TInput, TOutput>): void {
      if (handlers.has(type)) {
        throw new Error(`Command handler already registered: ${type}`);
      }
      handlers.set(type, handler as CommandHandler);
    },

    async dispatch<TInput, TOutput>(
      command: KernelCommand<TInput, TOutput>,
      context: RequestContext,
    ): Promise<TOutput> {
      const handler = handlers.get(command.type) as CommandHandler<TInput, TOutput> | undefined;
      if (!handler) {
        throw new Error(`No handler registered for command: ${command.type}`);
      }
      return handler(command, context);
    },

    has(type: string): boolean {
      return handlers.has(type);
    },
  };
}
