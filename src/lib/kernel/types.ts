export type ServiceToken<T = unknown> = symbol & { __type?: T };

export function createToken<T>(name: string): ServiceToken<T> {
  return Symbol(name) as ServiceToken<T>;
}

export type ServiceFactory<T> = (container: ServiceContainer) => T;

export type ServiceScope = 'singleton' | 'transient';

export interface ServiceDescriptor<T = unknown> {
  token: ServiceToken<T>;
  factory: ServiceFactory<T>;
  scope: ServiceScope;
}

export interface ServiceContainer {
  register<T>(token: ServiceToken<T>, factory: ServiceFactory<T>, scope?: ServiceScope): void;
  resolve<T>(token: ServiceToken<T>): T;
  has(token: ServiceToken): boolean;
}

export interface KernelEvent<TPayload = unknown> {
  type: string;
  payload: TPayload;
  timestamp: number;
  source: string;
}

export type EventHandler<TPayload = unknown> = (event: KernelEvent<TPayload>) => void | Promise<void>;

export interface EventBus {
  emit<TPayload>(type: string, payload: TPayload, source: string): Promise<void>;
  on<TPayload>(type: string, handler: EventHandler<TPayload>): () => void;
  off(type: string, handler: EventHandler): void;
  clear(): void;
}

export interface KernelCommand<TInput = unknown, TOutput = unknown> {
  type: string;
  input: TInput;
  __outputType?: TOutput;
}

export type CommandHandler<TInput = unknown, TOutput = unknown> = (
  command: KernelCommand<TInput, TOutput>,
  context: RequestContext,
) => Promise<TOutput>;

export interface CommandBus {
  register<TInput, TOutput>(type: string, handler: CommandHandler<TInput, TOutput>): void;
  dispatch<TInput, TOutput>(command: KernelCommand<TInput, TOutput>, context: RequestContext): Promise<TOutput>;
  has(type: string): boolean;
}

export type HookPhase = 'before' | 'after';

export type HookHandler<T = unknown> = (context: HookContext<T>) => void | Promise<void>;

export interface HookContext<T = unknown> {
  operation: string;
  phase: HookPhase;
  data: T;
  metadata: Record<string, unknown>;
  abort: () => void;
  aborted: boolean;
}

export interface HookManager {
  register<T>(operation: string, phase: HookPhase, handler: HookHandler<T>): () => void;
  execute<T>(operation: string, phase: HookPhase, data: T, metadata?: Record<string, unknown>): Promise<HookContext<T>>;
}

export type ModuleStatus = 'registered' | 'initializing' | 'ready' | 'error' | 'stopped';

export interface ModuleDefinition {
  id: string;
  name: string;
  version: string;
  dependencies?: string[];
  register(kernel: KernelInterface): void | Promise<void>;
  init?(kernel: KernelInterface): void | Promise<void>;
  stop?(kernel: KernelInterface): void | Promise<void>;
}

export interface ModuleInfo {
  id: string;
  name: string;
  version: string;
  status: ModuleStatus;
  dependencies: string[];
}

export interface ModuleRegistry {
  add(definition: ModuleDefinition): void;
  get(id: string): ModuleInfo | undefined;
  list(): ModuleInfo[];
  has(id: string): boolean;
}

export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  install(kernel: KernelInterface): void | Promise<void>;
  uninstall?(kernel: KernelInterface): void | Promise<void>;
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  installed: boolean;
}

export interface PluginRegistry {
  install(definition: PluginDefinition): Promise<void>;
  uninstall(id: string): Promise<void>;
  get(id: string): PluginInfo | undefined;
  list(): PluginInfo[];
  has(id: string): boolean;
}

export interface FeatureFlagManager {
  isEnabled(flag: string): boolean;
  enable(flag: string): void;
  disable(flag: string): void;
  set(flag: string, enabled: boolean): void;
  list(): Record<string, boolean>;
}

export type LifecyclePhase = 'boot' | 'init' | 'ready' | 'shutdown';

export type LifecycleHandler = (kernel: KernelInterface) => void | Promise<void>;

export interface LifecycleManager {
  on(phase: LifecyclePhase, handler: LifecycleHandler): void;
  current(): LifecyclePhase;
}

export interface AppContext {
  name: string;
  version: string;
  environment: string;
}

export interface OrganizationContext {
  id: string;
  slug: string;
  name: string;
}

export interface WorkspaceContext {
  id: string;
  slug: string;
  name: string;
  organizationId: string;
}

export interface SessionContext {
  userId: string;
  memberId: string;
  email: string;
  name: string;
  roleId: string;
  isFounder: boolean;
  permissions: string[];
}

export interface RequestContext {
  app: AppContext;
  organization: OrganizationContext;
  workspace: WorkspaceContext | null;
  session: SessionContext;
}

export interface KernelInterface {
  readonly container: ServiceContainer;
  readonly events: EventBus;
  readonly commands: CommandBus;
  readonly hooks: HookManager;
  readonly modules: ModuleRegistry;
  readonly plugins: PluginRegistry;
  readonly features: FeatureFlagManager;
  readonly lifecycle: LifecycleManager;
  readonly app: AppContext;
  boot(): Promise<void>;
  shutdown(): Promise<void>;
  createRequestContext(session: SessionContext, org: OrganizationContext, workspace: WorkspaceContext | null): RequestContext;
}
