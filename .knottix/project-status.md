# Knottix — Project Status

## Current Milestone

**M4: Full System** — Mission Control (Founder) + Workspace (Employee) application shell, MVP screens, a 7-employee AI Employee Platform (Directory + per-employee chat), a GitHub Integration (the reference implementation for future integrations), a Command Center (the primary interaction surface, classifying free-text into Navigation/Search/Tool/Workflow/Conversation/Information), a Desktop Runtime (real local OS/browser/voice control, exposed as Tool Engine tools), a Goal Execution Engine (plan → execute → verify → retry a whole goal, not just one command, built entirely on the Workflow Engine), a Skill Registry (every capability as a discoverable, composable skill the Goal Engine plans from, instead of a fixed template list), Task Sessions (persisted, multi-round, restart-recoverable long-running objectives wrapping Goal Execution), a Context Engine (automatic real-context discovery/ranking from 13 sources, the first step of every Goal Execution), and an MCP Client Layer (external MCP servers as first-class Skills/Context/Prompt providers, interoperability with the outside world via the Model Context Protocol), all built on top of the existing Kernel/AI Runtime/Memory/RBAC/Persistence/Intelligence Platform/Tool Engine. As of Session 15, the full presentation layer is live-verified in a browser end-to-end with `NEXT_PUBLIC_DEMO_MODE=true`; Sessions 16–23 added GitHub, the Command Center, the Desktop Runtime, Goal Execution, the Skill Registry, Task Sessions, the Context Engine, and MCP on top of that same verified base — Session 18 additionally verified real (non-simulated) execution directly on the host machine for clipboard, screenshot, window focus, and local TTS; Session 19 live-verified the full plan→execute→pause-for-confirmation→resume→complete goal lifecycle in the browser in Demo Mode; Session 20 live-verified both single-skill and multi-skill composed goals end to end; Session 21 added real crash-recovery to the Workflow Engine itself and built Task Sessions on top; Session 22 added the Context Engine, verified its Demo Mode/Command Center wiring live but not any collector's behavior against real data; Session 23 added the MCP Client Layer, live-verified `/mcp`'s Demo Mode decline and all five of the mission's own Command Center example phrases against the running dev server (catching and fixing two router bugs and one keyword-ordering bug in the process), but not any real external MCP server connection. Remaining: database provisioning + migration so every screen, every AI Employee, a real GitHub connection, real AI-based command/goal/skill classification, real WhatsApp/Instagram/voice sessions, real (non-demo) goal execution, real Task Session crash recovery, real Context Engine collection, and a real connected MCP server render/execute against real data, a real model, and real logged-in accounts (the real, non-demo path is still verified only by `next build` plus targeted local-execution tests, not a full live run against real third-party accounts).

## What Was Done

### Session 1: Foundation Docs (2026-07-09)
All 12 `.knottix/` documentation files created.

### Session 2: Project Architecture (2026-07-09)
Production-grade project skeleton built. Zero features, zero business logic — pure architecture.

### Session 3: Enterprise Data Layer (2026-07-09)
Complete Prisma schema with 37 models, multi-organization architecture, and database-driven RBAC.

### Session 4: Authentication & Authorization (2026-07-09)

Production-ready auth system connecting the credential flow to the database-driven RBAC layer.

**Auth infrastructure:**

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Auth config | `src/lib/auth/config.ts` | Auth.js v5 configuration — credentials provider, JWT callbacks, session enrichment, authorized callback |
| Edge auth config | `src/lib/auth/auth.config.ts` | Edge-compatible config for middleware (DEC-018) |
| Auth exports | `src/lib/auth/index.ts` | Exports `handlers`, `auth`, `signIn`, `signOut` |
| Session helpers | `src/lib/auth/session.ts` | `getCurrentUser()`, `requireAuth()`, `requirePermission()`, `requireAnyPermission()`, `requireAllPermissions()`, `requireOrganizationAccess()`, `requireWorkspaceAccess()` |
| Permission logic | `src/lib/auth/permissions.ts` | `hasPermission()`, `hasAnyPermission()`, `hasAllPermissions()`, route-to-permission mapping |
| Password utils | `src/lib/auth/password.ts` | bcrypt hash (12 rounds) and verify |
| Auth queries | `src/lib/db/queries/auth.ts` | `findUserByEmail()`, `resolveMemberSession()`, `updateLastLogin()` |
| API route | `src/app/api/auth/[...nextauth]/route.ts` | Auth.js HTTP handlers |
| Middleware | `src/middleware.ts` | Route protection — auth check + permission check from JWT (Edge-safe) |
| Login page | `src/app/(auth)/login/page.tsx` + `LoginForm.tsx` | Credential login form with Zod validation |
| Login action | `src/app/(auth)/login/actions.ts` | Server action — validate, authenticate, redirect |
| Logout action | `src/app/(auth)/logout/actions.ts` | Server action — audit log, sign out, redirect |
| Unauthorized | `src/app/(auth)/unauthorized/page.tsx` | 403 access denied page |
| Type augmentation | `src/types/next-auth.d.ts` | Session and JWT types with Knottix properties |
| Permission constants | `src/constants/permissions.ts` | All permission definitions, role-permission mapping |
| Seed script | `prisma/seed.ts` | Seeds org, workspace, 7 roles, all permissions, role-permission links |
| Founder CLI | `prisma/create-founder.ts` | CLI to create the first founder user after seeding |

### Session 5: Backend Foundation Infrastructure (2026-07-15)

Production backend subsystems — error handling, logging, validation, audit, security, and entity resolution.

**New infrastructure:**

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Environment validation | `src/lib/env.ts` | Zod-validated server/client env vars with lazy singleton |
| Structured errors | `src/lib/errors.ts` | `AppError` class with error codes, HTTP status mapping, factory methods |
| Server action helpers | `src/lib/actions.ts` | `success()`, `fail()`, `actionHandler()` — standardized response pattern |
| Structured logger | `src/lib/logger.ts` | JSON-structured logging with levels (debug/info/warn/error) |
| Input validation | `src/lib/validation.ts` | Reusable Zod schemas (uuid, slug, email, pagination, password) + pagination helpers |
| Security helpers | `src/lib/security.ts` | `sanitizeString()`, `sanitizeHtml()`, `generateSlug()`, `maskEmail()`, `generateToken()` |
| Formatting utilities | `src/lib/format.ts` | `formatDate()`, `formatDateTime()`, `formatRelativeTime()`, `formatCurrency()`, `truncate()`, `pluralize()` |
| Request context | `src/lib/request.ts` | `getRequestContext()` — extract IP and User-Agent from headers |
| Audit log service | `src/lib/db/queries/audit.ts` | `createAuditLog()` — fail-safe audit trail writer |
| Organization queries | `src/lib/db/queries/organization.ts` | `findOrganizationById()`, `findOrganizationBySlug()`, `requireOrganization()`, `listOrganizationsForUser()` |
| Workspace queries | `src/lib/db/queries/workspace.ts` | `findWorkspaceById()`, `requireWorkspace()`, `listWorkspacesForMember()`, `findDefaultWorkspace()` |
| Member queries | `src/lib/db/queries/member.ts` | `findMemberById()`, `requireMember()`, `findMemberByUserAndOrg()`, `listMembersForOrganization()` |
| Department queries | `src/lib/db/queries/department.ts` | `findDepartmentById()`, `requireDepartment()`, `listDepartmentsForOrganization()` |
| Team queries | `src/lib/db/queries/team.ts` | `findTeamById()`, `requireTeam()`, `listTeamsForDepartment()`, `listTeamMemberships()` |
| Role queries | `src/lib/db/queries/role.ts` | `findRoleById()`, `requireRole()`, `listRolesForOrganization()`, `findDefaultRole()`, `resolvePermissionsForRole()` |

**Enhanced existing files:**
- `src/lib/auth/session.ts` — Added `requireAnyPermission()`, `requireAllPermissions()`, `requireOrganizationAccess()`, `requireWorkspaceAccess()`, uses `AppError` instead of raw `Error`
- `src/app/(auth)/logout/actions.ts` — Audit logging on logout

**Verified:**
- TypeScript compiles clean (`tsc --noEmit` passes)
- Dev server boots clean on port 3955
- Login page renders correctly
- No Edge Runtime errors

### Session 6: Knottix Kernel (2026-07-15)

Central communication layer — all modules communicate through the Kernel, no direct module-to-module interaction.

**Kernel subsystems:**

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Kernel types | `src/lib/kernel/types.ts` | All shared interfaces — ServiceToken, ServiceContainer, EventBus, CommandBus, HookManager, ModuleDefinition, PluginDefinition, FeatureFlagManager, LifecycleManager, Context types, KernelInterface |
| DI container | `src/lib/kernel/container.ts` | Dependency injection with singleton/transient scopes and circular dependency detection |
| Event bus | `src/lib/kernel/event-bus.ts` | Pub/sub event system with async handler support and error isolation |
| Command bus | `src/lib/kernel/command-bus.ts` | Command dispatch — register handlers by type, dispatch with RequestContext |
| Hook manager | `src/lib/kernel/hook-manager.ts` | Before/after hooks on operations with abort capability |
| Module registry | `src/lib/kernel/module-registry.ts` | Module registration, topological dependency sort, lifecycle (init/stop) |
| Plugin registry | `src/lib/kernel/plugin-registry.ts` | Plugin install/uninstall with kernel reference |
| Lifecycle manager | `src/lib/kernel/lifecycle.ts` | Phase transitions (boot → init → ready → shutdown) with handler registration |
| Feature flags | `src/lib/kernel/feature-flags.ts` | Enable/disable features at runtime |
| Context system | `src/lib/kernel/context.ts` | Application, Organization, Workspace, Session context factories |
| Kernel core | `src/lib/kernel/kernel.ts` | Composes all subsystems, manages boot/shutdown sequence |
| Public API | `src/lib/kernel/index.ts` | Exports createKernel, createToken, and all types |

**Verified:**
- TypeScript compiles clean (`tsc --noEmit` passes)

### Session 7: AI Runtime Foundation (2026-07-15)

Orchestration layer for all AI interactions. Every future AI feature passes through the Runtime. No module communicates directly with AI providers.

**AI Runtime subsystems:**

| Component | File(s) | Purpose |
|-----------|---------|---------|
| AI types | `src/lib/ai/types.ts` | AIRequest, AIResponse, AIStreamChunk, TokenUsage, ModelDefinition, ModelCapabilities, ModelPricing, ExecutionContext, UsageRecord, PipelineMiddleware, StreamPipelineMiddleware |
| AI errors | `src/lib/ai/errors.ts` | AIError class with 14 error codes — timeout, rate limit, auth, cancellation, streaming, content filter, context length, etc. |
| Configuration | `src/lib/ai/config.ts` | Default runtime config, provider configs (Anthropic, OpenAI, Google, OpenRouter) |
| Validation | `src/lib/ai/validation.ts` | Request validator (model, messages, params, capability checks) + response validator |
| Provider interface | `src/lib/ai/providers/types.ts` | AIProvider interface — `complete()`, `stream()`, `isAvailable()` |
| Provider registry | `src/lib/ai/providers/registry.ts` | Register/resolve providers with lazy instantiation and health tracking |
| Provider resolver | `src/lib/ai/providers/resolver.ts` | Resolve provider for model with fallback support |
| Provider health | `src/lib/ai/providers/health.ts` | Health monitor — tracks latency, consecutive failures, status (healthy/degraded/unavailable) |
| Provider factory | `src/lib/ai/providers/factory.ts` | Factory pattern + env-based provider discovery |
| Model registry | `src/lib/ai/models/registry.ts` | Register/resolve models, query by provider or capability |
| Model types | `src/lib/ai/models/types.ts` | ModelRegistryInterface |
| Execution context | `src/lib/ai/runtime/context.ts` | Per-request context with unique ID, org/user/module scoping |
| Streaming | `src/lib/ai/runtime/streaming.ts` | StreamAccumulator + collectStream utility |
| Retry strategy | `src/lib/ai/runtime/retry.ts` | Exponential backoff with jitter, retryable error detection |
| Fallback strategy | `src/lib/ai/runtime/fallback.ts` | Primary → fallback provider chain |
| Cancellation | `src/lib/ai/runtime/cancellation.ts` | AbortController handle, signal checking, timeout wrapper |
| Rate limiter | `src/lib/ai/runtime/rate-limiter.ts` | Token bucket per provider (configurable RPM) |
| Request pipeline | `src/lib/ai/runtime/pipeline.ts` | Full lifecycle — validate → rate check → retry → execute → track. Middleware support for both complete and stream |
| Core runtime | `src/lib/ai/runtime/runtime.ts` | AIRuntime facade — composes all subsystems, exposes `complete()` and `stream()` |
| Token tracker | `src/lib/ai/tracking/tokens.ts` | Per-request and aggregate token usage |
| Cost tracker | `src/lib/ai/tracking/cost.ts` | Cost calculation from model pricing, per-model and per-provider aggregation |
| Usage tracker | `src/lib/ai/tracking/usage.ts` | Full usage records with org/user/module context, summary stats |
| Public API | `src/lib/ai/index.ts` | Single entry point — exports createAIRuntime, AIError, types |

**Enhanced existing files:**
- `src/lib/env.ts` — Added `OPENROUTER_API_KEY`, `AZURE_OPENAI_API_KEY`, `OLLAMA_BASE_URL` to server env schema

**Verified:**
- TypeScript compiles clean (`tsc --noEmit` passes)

### Session 8: Memory Engine (2026-07-16)

Permanent knowledge system — how knowledge is represented, stored, organized, versioned, and accessed. NOT embeddings, vector search, or semantic search.

**Memory Engine subsystems:**

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Memory types | `src/lib/memory/types.ts` | MemoryNamespace (11 types), MemorySourceType, MemoryType, MemoryStatus, RelationshipType, MemoryEntry, MemoryRevision, MemorySnapshot, MemoryFilter, MemoryPage, CreateMemoryInput, UpdateMemoryInput, MemoryAccessContext, MemoryStats, MemoryHealthStatus |
| Memory errors | `src/lib/memory/errors.ts` | MemoryError class with 10 error codes — entry not found, namespace invalid, access denied, revision conflict, validation failed, store unavailable, snapshot not found, reference invalid, duplicate entry, restore failed |
| Store interfaces | `src/lib/memory/stores/types.ts` | MemoryStore, RevisionStore (versioned methods), SnapshotStore, StatsStore — all with unique method names to avoid intersection conflicts |
| In-memory store | `src/lib/memory/stores/in-memory-store.ts` | Full reference implementation of all 4 store interfaces — optimistic concurrency, soft delete/restore, text search, tag filtering, auto-revision on writes |
| Access layer | `src/lib/memory/permissions/access.ts` | Namespace-to-permission mapping (project→projects:read, client→clients:read), isFounder bypass, org boundary enforcement, canRead/canWrite/canDelete + assert variants |
| Memory cache | `src/lib/memory/cache/memory-cache.ts` | LRU cache (default 500 entries) with scope-based invalidation index, evictOldest on overflow |
| Namespace resolver | `src/lib/memory/resolver/namespace-resolver.ts` | Namespace validation, composite ID parsing/building (namespace:scopeId:entryId) |
| Memory index | `src/lib/memory/indexing/memory-index.ts` | Multi-key in-memory index — by tag, namespace, sourceType, scope, organization, workspace, reference target |
| Memory events | `src/lib/memory/events/memory-events.ts` | Kernel event bus integration — 8 event types (created, updated, deleted, restored, hardDeleted, archived, snapshot.created, snapshot.deleted) with typed payloads |
| Memory context | `src/lib/memory/context/memory-context.ts` | Query context builder — scoped filter construction, context-from-entry extraction |
| Version manager | `src/lib/memory/versioning/version-manager.ts` | Revision history, version retrieval, version diff comparison (title, content, summary, tags, metadata changes) |
| Memory engine | `src/lib/memory/engine/memory-engine.ts` | Core facade — composes all subsystems, permission-gated CRUD, versioning, snapshots, stats, health. Hard delete restricted to founders |
| Public API | `src/lib/memory/index.ts` | Single entry point — exports createMemoryEngine, all types, all factory functions |

**Verified:**
- TypeScript compiles clean (`tsc --noEmit` passes)

### Session 9: Intelligence Platform — Sprint 2 (2026-07-16)

The complete Intelligence Platform, built as one cohesive system across five integrated subsystems: Prompt Engine, Tool Engine, Agent Framework, Workflow Foundation, and the Context Builder. No business agents, no business workflows, no external tool integrations — framework only, per scope.

**Prompt Engine** (`src/lib/prompt/`):

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Types | `types.ts` | PromptTemplate, PromptVariableDefinition, PromptTemplateRevision, RenderPromptInput, RenderedPrompt, PromptValidationResult, PromptContextBlock/Entry |
| Errors | `errors.ts` | PromptError — 7 codes |
| Registry | `registry/prompt-registry.ts` | Org-scoped template storage with global fallback, version-incrementing updates, immutable revision history |
| Validator | `validation/prompt-validator.ts` | Variable presence/type validation, template-definition consistency (undefined placeholders, duplicate variable names) |
| Renderer | `rendering/prompt-renderer.ts` | `{{variable}}` substitution with default-value fallback, unresolved-placeholder detection |
| Context injector | `context/context-injector.ts` | Builds `[RELEVANT CONTEXT]...[END CONTEXT]` blocks per memory-system.md format, token-budget truncation (default 2000 tokens, ~4 chars/token estimate) |
| Engine | `engine/prompt-engine.ts` | Facade — create/update/render, validates definitions before persisting |

**Tool Engine** (`src/lib/tools/`), MCP-compatible descriptors, no external integrations:

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Types | `types.ts` | ToolDefinition, ToolParameterDefinition, ToolExecutionContext, ToolDescriptor (MCP-shaped: name/description/inputSchema), ToolFilter |
| Errors | `errors.ts` | ToolError — 8 codes |
| Registry | `registry/tool-registry.ts` | In-memory tool storage, activate/deactivate |
| Access layer | `permissions/tool-access.ts` | Permission-string gate per tool, isFounder bypass |
| Validator | `validation/tool-validator.ts` | Parameter-definition and input validation (type + enum checks) |
| Discovery | `discovery/tool-discovery.ts` | Category/tag/search filtering, `toDescriptor()` converts `ToolDefinition` to MCP-compatible JSON-Schema descriptor |
| Executor | `execution/tool-executor.ts` | Permission assert → input validate → timeout-wrapped handler call → duration-tracked result |
| Events | `events/tool-events.ts` | registered/executed/execution.failed/deactivated through Kernel event bus |
| Engine | `engine/tool-engine.ts` | Facade composing all of the above |

**Agent Framework** (`src/lib/agents/`), framework only — no business agents registered:

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Types | `types.ts` | AgentDefinition, AgentCapability, AgentLifecycleStatus, AgentContext, AgentExecutionRequest/Result |
| Errors | `errors.ts` | AgentError — 8 codes |
| Registry | `registry/agent-registry.ts` | Org-scoped agent storage |
| Lifecycle | `lifecycle/agent-lifecycle.ts` | State machine: registered → initializing → ready → running → (ready\|stopped\|error), with explicit valid-transition table |
| Access layer | `permissions/agent-access.ts` | Permission-gated invocation, allowed-tool assertion |
| Context builder | `context/agent-context-builder.ts` | Resolves an agent's allowed tools to MCP descriptors via the Tool Engine, pulls conversation-scoped memories via the Memory Engine into `PromptContextBlock[]` |
| Execution pipeline | `execution/agent-pipeline.ts` | Full lifecycle: permission check → auto-init if needed → transition to running → build context → render system prompt (Prompt Engine) → call AI Runtime `complete()` → transition back to ready/error → structured result (never throws — mirrors Tool Executor's result-object pattern) |
| Events | `events/agent-events.ts` | registered/lifecycle.changed/execution.started/completed/failed |
| Engine | `engine/agent-engine.ts` | Facade — register/get/find/initialize/stop/execute |

**Workflow Foundation** (`src/lib/workflows/`), infrastructure only — no business workflows:

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Types | `types.ts` | WorkflowDefinition, WorkflowStepDefinition (tool\|agent\|prompt\|condition\|transform), WorkflowContext, WorkflowExecutionState, WorkflowStepResult. Reuses `WorkflowStatus`/`WorkflowExecutionStatus` from `@/types/database` |
| Errors | `errors.ts` | WorkflowError — 8 codes |
| Registry | `registry/workflow-registry.ts` | Org-scoped workflow storage with step-graph validation (start step exists, onSuccess/onFailure reference valid steps) |
| State manager | `state/workflow-state.ts` | Live execution state — status, current step, accumulated step results, variables |
| History store | `history/workflow-history.ts` | Immutable record of finalized executions, queryable by workflow or organization |
| Events | `events/workflow-events.ts` | started/step.completed/step.failed/completed/failed/cancelled |
| Executor | `execution/workflow-executor.ts` | Graph traversal engine with built-in `condition`/`transform` step handlers; `tool`/`agent`/`prompt` step types require external handler registration via `registerStepHandler()` — keeps the foundation free of business logic. Max 200 steps per execution as a runaway guard |
| Engine | `engine/workflow-engine.ts` | Facade — create/update/activate/execute/getHistory |

**Context Builder** (`src/lib/intelligence/`) — the platform's unifying layer:

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Types | `types.ts` | `IntelligenceContext` — combines Kernel's `RequestContext` (app/organization/workspace/session) with a derived `MemoryAccessContext`, an AI Runtime `ExecutionContext`, and an optional conversation reference, into one object |
| Context builder | `context/context-builder.ts` | `build()` constructs the combined context from a Kernel `RequestContext` in one call; adapter methods (`toMemoryAccessContext`, `toToolAccessContext`, `toToolExecutionContext`, `toAIExecutionContext`) derive each subsystem's context shape from it — single source of truth, no duplicated context-assembly logic |
| Platform facade | `platform.ts` | `createIntelligencePlatform()` composes Prompt Engine + Tool Engine + Agent Framework + Workflow Engine + Context Builder, wired to a shared Kernel `EventBus` and the existing AI Runtime/Memory Engine instances. `createIntelligenceModule()` registers the platform as a Kernel `ModuleDefinition`, resolvable via `container.resolve(INTELLIGENCE_PLATFORM_TOKEN)` |

**Dependency graph** (one-directional, no cycles): Kernel/AI Runtime/Memory Engine (existing) ← Prompt Engine, Tool Engine, Workflow Foundation (independent of each other) ← Agent Framework (depends on Prompt, Tools, AI Runtime, Memory, `intelligence/types` only) ← Intelligence Platform facade (composes everything, depends on `agents`/`tools`/`prompt`/`workflows` runtime code).

**Verified:**
- TypeScript compiles clean (`tsc --noEmit` passes) — 38 new files
- No circular imports (agents imports only `intelligence/types`, never `intelligence/platform`)
- No duplicate context-assembly logic — every subsystem's access/execution context is derived from `IntelligenceContext` via the Context Builder's adapter methods

### Session 10: Persistence Layer, Anthropic Provider, Founder Executive Assistant (2026-07-16)

Transformed the Sprint 2 framework into a working platform: real Prisma-backed persistence for all seven required subsystems, a fully functional Anthropic provider adapter, an OpenAI adapter-ready stub, the first (and only) production business agent, and a validated end-to-end request pipeline.

**Prisma schema extensions** (`prisma/schema.prisma`) — all additive, no existing fields removed or renamed:

| Change | Purpose |
|--------|---------|
| `SettingScope.FEATURE` | New scope value so `Setting` can back Feature Flag persistence |
| `ToolCategory` enum (new) | Backs `AITool.category` |
| `MemoryEntryStatus` enum (new) | Backs `AIMemory.status` (active/archived/deleted) |
| `AIAgent.permission`, `.promptKey`, `.capabilities` | Fields `AgentDefinition` requires that didn't exist on the model |
| `PromptTemplate.organizationId` → nullable | Global (non-org-scoped) prompt templates, matching `PromptTemplate.organizationId: string \| null` in code |
| `PromptTemplateRevision` (new model) | Immutable prompt version history — didn't exist before |
| `AIMemory.namespace/scopeId/title/version/status/categoryId/references` | Fields the Memory Engine's `MemoryEntry` requires that the original `AIMemory` model didn't have |
| `AIMemoryRevision`, `AIMemorySnapshot` (new models) | Memory Engine's revision history and snapshot support |
| `AITool` (new model) | Tool metadata persistence (permission, category, parameters, isActive) — tool *handlers* are never persisted (see DEC-027) |

Ran `npx prisma generate` to regenerate the typed client — schema validated with zero errors. No migration was applied against a live database (none is provisioned yet); that remains the next step.

**Persistence pattern** (DEC-027) — applied consistently across five subsystems instead of five bespoke solutions:

| Subsystem | Approach | File(s) |
|-----------|----------|---------|
| Memory Engine | **Full replacement** — `MemoryStore`/`RevisionStore`/`SnapshotStore`/`StatsStore` were already async by design (Session 8), so `createPrismaMemoryStore(db)` is a drop-in swap for `createInMemoryStore()` | `src/lib/memory/stores/prisma-memory-store.ts` |
| Prompt Registry | **Write-through decorator** — sync in-memory registry stays the runtime engine; `createPersistedPromptRegistry(base, db)` wraps it, persisting on create/update/deactivate (fire-and-forget) and exposing `hydrate()` to reload on boot | `src/lib/prompt/persistence/prompt-persistence.ts` |
| Tool Registry | **Metadata-only decorator** — tool *handlers* are JS closures and cannot be serialized; `createPersistedToolRegistry` persists name/description/category/parameters/permission/isActive only, and `hydrate()` applies persisted `isActive` overrides to tools whose handlers are already registered in code at boot (never fabricates a tool with no handler) | `src/lib/tools/persistence/tool-persistence.ts` |
| Agent Registry | **Write-through decorator**, persists only the static definition — `AgentDefinition.status` is a transient in-process lifecycle (registered→initializing→ready→running→stopped→error) and is deliberately never written to or restored from the database; every hydrated agent starts fresh at `'registered'` | `src/lib/agents/persistence/agent-persistence.ts` |
| Workflow Registry + History | **Write-through decorator** for definitions; a second decorator wraps `WorkflowHistoryStore.record()` to persist finalized executions to the existing `WorkflowExecution` table (no schema change needed) | `src/lib/workflows/persistence/workflow-persistence.ts` |
| Feature Flags | Same decorator pattern applied to the Kernel's `FeatureFlagManager` — `createPersistedFeatureFlags(kernel.features, db, organizationId)` persists to `Setting` (scope `FEATURE`) and hydrates on boot | `src/lib/kernel/persistence/feature-flag-persistence.ts` |
| Provider Configuration | Standalone repository (`ProviderConfigRepository`) reading/writing only non-secret operational config (baseUrl/timeoutMs/maxRetries/rateLimitRpm) to the existing `Integration` model — API keys always come from environment variables, never the database | `src/lib/ai/persistence/provider-config-repository.ts` |

Every registry (`PromptRegistry`, `ToolRegistry`, `AgentRegistry`, `WorkflowRegistry`) gained one small additive method (`seed()` / `applyPersistedState()`) so the persistence decorator can restore exact IDs/versions on hydrate without going through the public `create()`/`register()` path (which would re-trigger persistence and assign new IDs). `IntelligencePlatformDeps` gained optional registry-override fields (`promptRegistry?`, `toolRegistry?`, etc.) defaulting to the in-memory implementations — zero breaking changes for any existing caller.

**AI Provider Adapters** (`src/lib/ai/providers/`):

| Provider | File | Status |
|----------|------|--------|
| Anthropic | `anthropic.ts` | **Fully implemented** via native `fetch` (no new dependency) — request/response mapping, system-message extraction, error mapping (auth/rate-limit/overloaded/invalid-request → `AIError` codes), and a real SSE stream parser for `content_block_delta`/`message_delta`/`message_stop` events |
| OpenAI | `openai.ts` | **Adapter-ready stub** — registers cleanly, reports real availability from `OPENAI_API_KEY`, participates in health/fallback, but `complete()`/`stream()` throw a clear not-yet-implemented `AIError` (see IDEA-010) |

**Founder Executive Assistant** (`src/lib/agents/founder-assistant/`) — the one and only business agent built this session:

| File | Purpose |
|------|---------|
| `tools.ts` | 4 read-only tools: `read_organization_memory` (queries the Memory Engine), `list_projects`, `list_tasks`, `list_meetings` (query Prisma directly via new `src/lib/db/queries/{project,task,meeting}.ts`, following the existing query-file convention) |
| `prompt.ts` | System prompt template (grounded-answer instructions, executive-summary behavior, no fabrication) |
| `register.ts` | Idempotent registration of the tools, prompt template, and agent definition against a running `IntelligencePlatform` |

**Tool Resolution enhancement** (DEC-028) — `agents/context/agent-context-builder.ts` (Sprint 2) was extended, not redesigned: it now auto-executes an agent's zero-required-parameter tools and folds their output into `PromptContextBlock[]` before the AI Runtime call, and organization-scoped memory (not just conversation-scoped) is now injected automatically. This is what makes "Tool Resolution" in the mission's pipeline diagram real rather than descriptive-only, while stopping short of a full multi-turn, model-driven function-calling loop (still tracked as IDEA-016).

**System bootstrap / composition root** (`src/lib/system/bootstrap.ts`) — did not exist anywhere before this session; the Kernel, AI Runtime, Memory Engine, and Intelligence Platform had never been instantiated together as a running system:
- `getSystem()`: memoized singleton — boots the Kernel, builds the Memory Engine (Prisma-backed), builds the AI Runtime (registers Anthropic + OpenAI + the `claude-sonnet-4-20250514` model), builds all five persisted registries, registers the Intelligence module, boots the Kernel.
- `ensureOrganizationReady(system, organizationId)`: idempotent per-org readiness — hydrates all persisted registries and feature flags, applies any org-specific Anthropic provider config override, registers the Founder Executive Assistant.

**End-to-end validation** — `POST /api/agents/founder-assistant` (`src/app/api/agents/founder-assistant/route.ts`) exercises every stage of the mission's pipeline diagram in one real request: `requirePermission('agents:execute')` → Kernel `RequestContext` → Context Builder → `ensureOrganizationReady` (persistence hydration) → Agent Execution Pipeline (Prompt Engine render → Memory Engine query → Tool Resolution → AI Runtime `complete()` → Anthropic provider) → structured `AgentExecutionResult` → `createAuditLog` (`AI_EXECUTION` action, fail-safe) → `ServerActionResponse` JSON.

**Verified:**
- TypeScript compiles clean (`tsc --noEmit` passes) — 0 errors across all new/modified files
- `npx prisma generate` succeeds against the extended schema — 0 validation errors
- `npm run lint` still fails with the pre-existing `es-abstract/2024/AddEntriesFromIterable` module resolution error (IDEA-008, unrelated to this session's changes, unresolved since Session 5)
- No circular imports — confirmed via dependency grep: nothing under `src/lib/**` imports from `src/lib/system` or `src/app`
- No dead code — every new file has at least one real importer (`src/lib/ai/persistence/provider-config-repository.ts` was initially unwired and has been fixed to be called from `ensureOrganizationReady`)

### Session 11: Mission Control + Workspace application shell (2026-07-17)

The first real UI. No new engines, registries, or runtimes — every screen reads through the existing Kernel/AI Runtime/Memory Engine/RBAC/Persistence/Intelligence Platform/Founder Executive Assistant built in Sessions 6–10. This session is glue and screens, not architecture.

**Application Shell** (`src/components/layouts/`) — an original interaction model, not a copy of Linear/Notion/Raycast:

| Component | File | Notes |
|-----------|------|-------|
| Shell orchestrator | `AppShell.tsx` | Client component owning sidebar-collapse and command-palette-open state; composes Sidebar + Topbar + Command Palette around `children` |
| Sidebar | `Sidebar.tsx` | Collapsible (260px ↔ 64px, Framer Motion), active-route indicator bar, collapsed state shows icon-only nav with real `Tooltip` popovers instead of native `title` |
| Topbar | `Topbar.tsx` | Workspace switcher, breadcrumbs, search trigger (⌘K), notification bell, profile menu |
| Command Palette | `CommandPalette.tsx` | ⌘K/Ctrl+K global toggle, arrow-key + Enter navigation, categorized (Navigate/Create), founder-only commands filtered out for non-founders. Built on `@base-ui/react/dialog` — no new command-palette dependency added |
| Breadcrumbs | `Breadcrumbs.tsx` | Derived from the URL path + `MODULES` labels, no separate breadcrumb state to keep in sync |
| Workspace Switcher | `WorkspaceSwitcher.tsx` | Lists real workspaces from `listWorkspacesForOrganization`; selecting a non-current workspace shows an honest inline notice ("requires re-authentication — coming soon", linking to the pre-existing IDEA-003) rather than silently doing nothing or faking a switch |
| Notification Bell / Profile Menu | `NotificationBell.tsx`, `ProfileMenu.tsx` | Real unread count and recent notifications (`Notification` model); sign-out reuses the existing `logout()` server action |

New primitives added to `src/components/ui/` (only `button.tsx` existed before this session): `card.tsx`, `badge.tsx`, `skeleton.tsx`, `separator.tsx`, `avatar.tsx`, `tooltip.tsx`, `dialog.tsx`, `dropdown-menu.tsx` — all thin wrappers over `@base-ui/react` primitives (already a dependency), styled to the `ui-system.md` token set. No new UI dependency was added.

**Founder Experience — Mission Control** (all real data, zero fake business logic):

| Route | Data source |
|-------|-------------|
| `/command` (Executive Home) | Org-wide counts (active projects, open tasks, upcoming meetings) via new aggregate queries + `Activity` feed + AI quick-link. Redirects non-founders to `/workspace` |
| `/organizations` | `listOrganizationsForUser` (founder-only, redirects otherwise) |
| `/workspaces` | New `listWorkspacesForOrganization` query (founder-only) |
| `/projects`, `/tasks`, `/meetings` | Org-wide for founders, workspace-scoped for employees, assigned-to-me for members with no workspace — same page, permission/role-aware query selection |
| `/memory` (Knowledge) | Direct `system.memoryEngine.query()` call with a real search form — no separate "search index," reuses the Memory Engine's own filter/search support |
| `/agents` (AI) | `AIConsole` client component posting to the existing `/api/agents/founder-assistant` route — command-line-style input and structured response blocks, not a chat bubble (per `ui-system.md`'s explicit AI Interface guidance) |
| `/activity` | `Activity` model, org-wide |
| `/audit` | `AuditLog` model, gated by `requirePermission('audit:read')` |
| `/settings/system` | **Live introspection** of the actually-running system: `kernel.lifecycle.current()`, `kernel.modules.list()`, `aiRuntime.providers` + `aiRuntime.health.getAllHealth()`, `aiRuntime.getUsageSummary()`, `memoryEngine.getHealth()`, `kernel.features.list()` — not mocked data, the real singleton from `src/lib/system/bootstrap.ts` |
| `/approvals` | Honest empty-state page — Knottix has no Approval data model; states this plainly instead of fabricating pending approvals |

**Employee Experience — Workspace**: `/workspace` (My Work — assigned tasks + meetings + AI quick-link), plus shared `/projects`, `/tasks`, `/meetings`, `/memory`, `/agents`, `/settings`, and a new `/calendar` (upcoming meetings grouped by day, built from the same real `Meeting` data). "Bookmarks" and a dedicated "My Files" surface were **not** built — no backing data model for the former, and the latter's query (`listFilesForMember`, already written) has no consuming page yet; both are tracked as ideas rather than shipped as fake or dead surfaces.

**New read-only query functions** (`src/lib/db/queries/`, following the existing `findX`/`listX`/`countX` convention — no new query abstraction): `notification.ts`, `activity.ts`, `file.ts` (new files); additive functions on `project.ts`, `task.ts`, `meeting.ts`, `workspace.ts`, `audit.ts` for org-wide and assigned-to-member views.

**Typed routes**: `next.config.ts`'s `typedRoutes` (moved out of `experimental` per Next 16's deprecation notice) meant every `Link`/`redirect`/`router.push` needed a build pass to regenerate the route manifest before literal paths type-checked; dynamic hrefs sourced from config/DB data (`Sidebar`, `Breadcrumbs`, `CommandPalette`, `NotificationBell`, `NotificationRow`) are cast `as Route` at the point of use.

**Verified:**
- `npx tsc --noEmit` — 0 errors
- `npx next build` — compiles clean, all 27 routes generated (`/`, Mission Control + Workspace pages, existing stub pages left untouched: `/clients`, `/creative`, `/finance`, `/team`)
- `npm run lint` — still blocked by the pre-existing `es-abstract` resolution error (IDEA-008), unrelated to this session
- Unused-component sweep found `skeleton.tsx`, `tooltip.tsx`, `separator.tsx` genuinely unwired after creation — fixed by using `Skeleton` in a new `(dashboard)/loading.tsx` Suspense fallback, `Tooltip` for collapsed-sidebar labels, and `Separator` in the Topbar, rather than leaving them as dead code or deleting freshly-built primitives
- **Not verified**: no live database is provisioned, so no page has actually been rendered against real rows — this is a build-time and type-level verification only, same caveat as Session 10 (IDEA-021)

### Session 12: AI Employee Platform (2026-07-17)

Seven production AI Employees registered through the existing Agent Framework — no new engine, registry, or runtime. This session is entirely definitions (prompts, tool lists, directory metadata) and two generalized surfaces (a dynamic API route, a directory + chat UI) built on top of what Sessions 9–11 already shipped.

**AI Employee definitions** (`src/lib/agents/employees/`) — each is a plain `AIEmployeeDefinition` (prompt template + agent registration input), not a new abstraction:

| Employee | Key | Tools (all pre-existing or newly-shared, none agent-specific) | Model |
|----------|-----|-----------------------------------------------------------------|-------|
| Founder Executive Assistant | `founder-executive-assistant` | `read_organization_memory`, `list_projects`, `list_tasks`, `list_meetings` | Claude Sonnet 4 |
| Developer AI | `developer-ai` | `read_organization_memory`, `list_projects`, `list_tasks` | Claude Sonnet 4 |
| Designer AI | `designer-ai` | `read_organization_memory`, `list_recent_files` (new), `list_projects` | Claude Sonnet 4 |
| Project Manager AI | `project-manager-ai` | `read_organization_memory`, `list_projects`, `list_tasks`, `list_meetings` | Claude Sonnet 4 |
| Marketing AI | `marketing-ai` | `read_organization_memory`, `list_clients` (new) | Claude Haiku 4.5 |
| Content AI | `content-ai` | `read_organization_memory` | Claude Haiku 4.5 |
| Sales AI | `sales-ai` | `read_organization_memory`, `list_clients` (new) | Claude Sonnet 4 |

Only **two new tools** were added (`list_clients` backed by the real `Client` model, `list_recent_files` backed by the real `File` model, both in `src/lib/agents/employees/shared-tools.ts`) — every other tool is the exact same registered instance the Founder Executive Assistant already uses; the Tool Engine's registry is global, so any agent can list an existing tool name in `allowedTools` without re-registering it. `list_clients` required a new `src/lib/db/queries/client.ts`; `list_recent_files` required a new `listFilesForWorkspace` in the existing `file.ts`.

**Registration refactor** — `src/lib/agents/employees/registration.ts` extracts the idempotent tools→prompt→agent registration pattern that `founder-assistant/register.ts` already had, so it isn't duplicated seven times. `founder-assistant/register.ts` was refactored (not rewritten from scratch) to build an `AIEmployeeDefinition` and call the shared helper — this is the "extend existing" the mission asked for. `src/lib/agents/employees/register-all.ts` registers the two shared tools once, then all seven employee definitions. `src/lib/system/bootstrap.ts`'s `ensureOrganizationReady` now calls `registerAllAIEmployees` instead of `registerFounderAssistant` directly, and registers a second model (`claude-haiku-4-5-20251001`) alongside the existing Sonnet registration so Content AI / Marketing AI's "recommended model" is a real, resolvable model, not just documentation.

**Directory metadata** (`src/config/ai-employees.ts`) — a plain `AIEmployeeProfile[]` array, config data (same pattern as `config/navigation.ts`'s `staticCommands`), not a new registry. Holds the identity/responsibilities/defaultWorkspace/memoryScope/recommendedModel/conversationStarter/suggestedWorkflows the mission asked each employee to define — deliberately kept separate from `AgentDefinition` (the Agent Framework's own type) since most of these fields are directory-display concerns, not execution concerns.

**Generalized surfaces** — replacing single-employee-specific code with one reusable path, not duplicating it seven times:
- `src/app/api/agents/[key]/route.ts` replaces the Session-10 `src/app/api/agents/founder-assistant/route.ts` (deleted) — identical pipeline (Context Builder → Agent Execution → audit log), parameterized by `key`, validated against `AI_EMPLOYEES` before touching the Agent Framework.
- `AIConsole` (`src/components/modules/ai/AIConsole.tsx`) now takes `agentKey`/`agentName`/`emptyStateHint` props instead of being hardcoded to the Founder Assistant.
- `/agents` is now the **AI Directory** (profile cards: identity, description, responsibility tags, tool count, recommended model, status badge, "Start conversation" launcher).
- `/agents/[key]` is the **chat interface** — same command-line-style console from Session 11, now driven by whichever employee's key is in the URL.

**Verified:**
- `npx tsc --noEmit` — 0 errors
- `npx next build` — compiles clean; `/agents`, `/agents/[key]`, and `/api/agents/[key]` all generated; the old `/api/agents/founder-assistant` route is gone (confirmed no stale references)
- `npm run lint` — still blocked by the pre-existing `es-abstract` resolution error (IDEA-008), unrelated to this session
- Reference sweep — every new file (`employees/*.ts`, `config/ai-employees.ts`, `queries/client.ts`) has at least one real importer, no dead code
- **Not verified**: same live-database caveat as Sessions 10–11 (IDEA-021/024) — no AI Employee has actually executed against a running Anthropic call or real seeded data yet

### Session 13: Premium visual polish pass (2026-07-17)

Pure front-end craft — no backend, engine, registry, or runtime touched. Every screen from Sessions 11–12 restyled to a consistent, premium visual language; no data-fetching logic changed anywhere (same query functions, same Intelligence Platform calls, same API routes).

**Design foundation** (`src/app/globals.css`) — new utility layer, additive to the existing token set (DEC-005 dark-only theme untouched):
- `.glass` / `.glass-strong` — translucent, blurred surfaces (Sidebar, Topbar, AI Chat, Command Palette)
- `.shimmer` — sweeping-gradient loading animation (replaces the flat `animate-pulse` on `Skeleton`)
- `.gradient-mesh` — soft radial-gradient background used behind hero sections (Mission Control, My Work)
- `.text-gradient`, `.glow-ring`, `.card-hover`, `.fade-in-up` — reusable hover/emphasis/entrance primitives
- `@media (prefers-reduced-motion: reduce)` — all custom animation durations collapse to near-zero, keeping the "perfect accessibility" requirement honest rather than aspirational

**New shared primitives** (`src/components/modules/shared/`): `PageHeader.tsx` (consistent title/description/action hierarchy, replacing a hand-rolled `<div><h1>...` block duplicated across ~13 pages) and `Reveal.tsx` (`Reveal`, `RevealGroup`, `RevealItem` — Framer Motion fade-in-up and stagger wrappers used everywhere a list or grid renders). `EmptyState` was rebuilt with an animated glow ring and entrance motion — every "never fabricate business data, never leave a blank page" surface from Sessions 10–12 inherits this automatically.

**Sidebar** — added `NavSection` grouping (`Overview` / `Work` / `Intelligence` / `Organization` / `System`, additive field on `NavItem` in `config/navigation.ts`, founder and employee nav sets re-partitioned accordingly) and a Framer Motion `layoutId`-based active-item pill that slides between nav entries instead of snapping.

**Command Palette** — stronger backdrop blur, `glass-strong` popup, per-row icon chips, an `↵`-on-hover affordance, and a persistent keyboard-hint footer bar (↑↓ navigate, ↵ select) — same command list and keyboard handling as Session 11, purely visual.

**Mission Control** — rebuilt as a true executive home per the mission's explicit brief: gradient-mesh hero with time-aware greeting and an at-a-glance summary sentence, Today's Focus (tasks due today/overdue + meetings today, computed by filtering the already-fetched `listTasksForOrganization`/`listMeetingsForOrganization` results — no new query functions), Company Health stat cards, an AI Status card (real `AI_EMPLOYEES.length` and names, plus a live "online" indicator), Recent Activity, Upcoming Meetings, and Knowledge Highlights (a small real `memoryEngine.query()` call, wrapped in try/catch so a memory-layer hiccup never blanks the page).

**AI Directory** — premium card treatment: per-employee gradient header wash, icon-in-chip avatar, tool-count/model footer row, animated "Start conversation" arrow.

**AI Chat** (`AIConsole`) — rebuilt around real chat affordances: right-aligned user bubbles, left-aligned assistant bubbles with an avatar chip, a three-dot bounce typing indicator while a request is pending, a new dependency-free `MarkdownLite` renderer (`src/components/modules/ai/MarkdownLite.tsx` — headers, bold, inline code, fenced code blocks, bullet/numbered lists; no markdown library added), and a pill-shaped composer with a focus glow ring.

**Workspace, Projects, Tasks, Meetings, Knowledge, Organizations, Workspaces, Settings, System Health, Notifications, Activity, Audit, Calendar, Approvals** — every one of these now uses `PageHeader` + `Reveal`/`RevealGroup` for consistent entrance motion and hierarchy, and clickable/informational `Card`s got the `.card-hover` treatment (lift + border glow + shadow). Table rows and list rows (`TaskList`, `MeetingList`) got a hover background instead of a static divider-only look. No page's data source changed.

**Verified:**
- `npx tsc --noEmit` — 0 errors
- `npx next build` — compiles clean, all 26 routes generate
- `npm run lint` — still blocked by the pre-existing `es-abstract` resolution error (IDEA-008), unchanged and unrelated to this session
- Manual import check on every edited page — no leftover unused imports from the `PageHeader`/`Reveal` swap-ins
- **Not visually verified in a browser**: no database is provisioned (same caveat as Sessions 10–12), so no screen has been rendered against real rows or clicked through interactively — verification here is limited to compilation and static review of the JSX/CSS, not a live render

### Session 14: Demo Mode (2026-07-17)

A presentation-layer switch, gated by a single environment variable, that swaps every screen's data source between real queries and realistic fixture data — no Kernel, AI Runtime, Memory Engine, or Prisma schema change; no query function signature changed.

**The switch**: `NEXT_PUBLIC_DEMO_MODE=true` (or `false`/unset for live). Read in exactly one place — `isDemoMode()` in `src/lib/demo/config.ts` — every page checks that function (directly, or via the `withDemo()` helper), never the raw env var. `withDemo<T>(demoValue: T, loadReal: () => Promise<T>): Promise<T>` resolves to the fixture when demo mode is on and only invokes `loadReal` (a real Prisma query, `getSystem()` call, etc.) when it's off, so no real query ever runs during a demo and no demo fixture is ever shown live.

**Demo Data Provider** (`src/lib/demo/`) — fixtures shaped to match each real query's return type exactly, so pages needed zero type gymnastics beyond the shape mismatches that already existed pre-demo-mode (e.g. `listProjectsForWorkspace` already omitted the `workspace` field that `listProjectsForOrganization` includes):

| File | Contents |
|------|----------|
| `config.ts` | `isDemoMode()`, `withDemo()` |
| `projects.ts` | 6 realistic projects — ACCD Jubilee Website, Judge by 4 Knotts, Knottix, Kreativ Website, CoverHub, Internal CRM — across 3 demo workspaces |
| `tasks.ts` | 24 open tasks (dev/design/marketing mix) distributed across the 6 projects |
| `meetings.ts` | 5 meetings scheduled for today + 2 more in the coming days |
| `people.ts` | 8 named team members (for the Mission Control "Team members" stat) |
| `activity.ts` | 8-entry activity timeline mixing human and `AI_ACTION` events |
| `notifications.ts` | 6 notifications (mentions, assignments, reminders, system) |
| `memory.ts` | 8 Knowledge entries — brand guidelines, client kickoff notes, an architecture decision, a bug root-cause note, an executive summary, a wiki page |
| `system-health.ts` | Believable Kernel/provider/usage/memory-health/feature-flag numbers matching the real `getSystem()` introspection shapes |
| `conversations.ts` | 4 scripted AI Chat transcripts — Developer AI reviewing the Judge scoring bug, Founder Executive Assistant's weekly summary, Designer AI's cross-project consistency review, Marketing AI's growth angles |
| `ai-status.ts` | Per-employee "recent activity" line shown on AI Directory cards |

**Wired into every screen the mission named** (Mission Control, Projects, Tasks, Meetings, AI Directory, AI Chat, Knowledge, Activity, Notifications, System Health), plus Workspace/My Work and Calendar for consistency since they reuse the same task/meeting fixtures at near-zero marginal cost:
- Mission Control gained a 4th stat card ("Team members", via the existing `listMembersForOrganization(...).total}` in live mode) and an AI Status widget that shows each employee's demo "recent activity" line instead of a plain badge list.
- Projects was rebuilt from a table into a **card grid** (per the mission's explicit "premium project cards" ask) — one render path serves both real and demo data identically.
- Knowledge's search still works in demo mode — a plain `.filter()` over the fixture array by title/content substring, no call to `getSystem()` at all when demoing.
- System Health restructured its data-fetching into a single `{kernelPhase, modules, providers, usage, memoryHealth, flags}` shape computed once, populated from either `DEMO_*` constants or the real `system.*` calls — the render section doesn't know or care which.
- AI Chat (`AIConsole`) now accepts `demoMode`/`demoTranscript` props: in demo mode it seeds the four scripted conversations as pre-completed messages, and if the user types anything else, it simulates a realistic delay then returns an honest "Demo Mode" response pointing back at the seeded examples — it never fakes a real model answer to an arbitrary question, and never calls `/api/agents/[key]` while demoing.
- Notifications' "Mark read" button is hidden in demo mode (`NotificationRow`'s new `readOnly` prop) rather than firing a server action against notification IDs that don't exist in whatever real database is connected.

**Demo Mode badge**: a small pill (`src/components/layouts/DemoBadge.tsx`) reading "Demo Mode" in the Topbar, shown whenever `isDemoMode()` is true — computed once in the server-rendered dashboard layout and threaded down through `AppShell` → `Topbar` as a plain boolean prop, not re-checked in a client component.

**Scope note**: Organizations, Workspaces, Audit, and Settings were deliberately left on real data paths — not in the mission's named screen list, and (per Session 10–13's own db-provisioning guidance) expected to work against a live, seeded database during the demo regardless of the `NEXT_PUBLIC_DEMO_MODE` flag, since login itself requires a real database connection either way.

**Verified:**
- `npx tsc --noEmit` — 0 errors
- `npx next build` — compiles clean, all 26 routes generate
- No Prisma schema, Kernel, AI Runtime, or Memory Engine file touched — confirmed by diff scope (everything is under `src/lib/demo/`, `src/components/`, or `src/app/(dashboard)/*/page.tsx`)
- **Not visually verified in a browser** — same standing caveat as Sessions 10–13; demo mode's actual on-screen appearance (fonts, spacing, the AI Chat seeded transcripts rendering correctly) has not been clicked through live

### Session 15: Live-demo presentation polish + Demo Mode login bypass (2026-07-18)

Transformed the product into a presentation-ready live demo: boot splash, animated page transitions, ripple/counter micro-interactions, a richer Command Palette, a real System Status strip, Presentation Mode, Quick Actions, a redesigned Login experience, and AI Chat streaming/copy/regenerate — then discovered and fixed the reasons the app couldn't actually be clicked through end-to-end in this environment (no database, missing `AUTH_SECRET`, and a latent server→client serialization bug in the nav), rather than reporting success on `tsc`/`next build` alone as the four prior sessions' "not visually verified" caveats had been doing.

**Splash Screen** (`src/components/layouts/SplashScreen.tsx`) — a once-per-browser-session boot overlay (`sessionStorage` gated) showing the Knottix mark, "Initializing Intelligence Platform...", an animated progress bar, and 5 staged checks (Kernel → AI Runtime → Memory → Mission Control → Done), ~2.1s + fade, rendered inside `AppShell`.

**Page Transitions** (`src/components/layouts/PageTransition.tsx`) — every route change fades/slides via Framer Motion, keyed on `usePathname()`, wrapping `{children}` inside `AppShell`'s `<main>`.

**Micro-interactions**: `Button` (`src/components/ui/button.tsx`) gained a click-position ripple effect; `AnimatedCounter` (`src/components/modules/shared/AnimatedCounter.tsx`) eases Mission Control's stat cards up from 0 on mount.

**Command Palette upgrades** (`src/components/layouts/CommandPalette.tsx`) — recent commands and recent free-text searches persist to `localStorage` (last 5 each) and render as a "Recent" group / chip row when the query is empty; also now opens from anywhere via a `window` custom event (`src/lib/command-palette-events.ts`) instead of only ⌘K, so `QuickActions`' "Command Palette" button can trigger it from a Server Component page without prop-drilling across the server/client boundary.

**System Status** (`src/components/modules/system/StatusStrip.tsx`) — pill badges for Kernel/Memory/AI Runtime (presentation-only, not live-polled — see IDEA-029) plus a genuine `Anthropic Connected` / `Anthropic Not Configured` indicator computed from `Boolean(process.env.ANTHROPIC_API_KEY)` directly in the Mission Control server component — no fake credential check, no Kernel round-trip.

**Presentation Mode** (`src/stores/presentation-store.ts`, a `zustand`+`persist` store — `zustand` was already a project dependency, no new package) — a Profile Menu toggle that forces the Sidebar into collapsed/icon-only mode, hides the Workspace Switcher and Notification Bell in the Topbar, hides the Sidebar's own collapse-toggle button (`data-hide-presentation` attribute + the matching `globals.css` rule, now actually used), and bumps base font size and `<main>` padding via a `[data-presentation='true']` CSS block.

**Quick Actions** (`src/components/modules/command/QuickActions.tsx`) — pill shortcuts to AI Chat, Projects, Meetings, Knowledge, System Health, and the Command Palette, replacing Mission Control's old two-button CTA row.

**Login Experience** — `src/app/(auth)/layout.tsx` gained the existing `gradient-mesh`/glow-pulse treatment; `src/app/(auth)/login/page.tsx` and `LoginForm.tsx` were rebuilt with a `glass` card, entrance animation, a Remember Me checkbox (presentational — the credentials action doesn't yet read it, since there's no session-length toggle wired to Auth.js), a "Forgot password?" affordance that expands an inline notice rather than faking a reset flow (IDEA-006 already tracks the real flow), and a spinner + "Signing in..." loading state on the submit button.

**AI Chat** (`src/components/modules/ai/AIConsole.tsx`) — demo responses now reveal word-by-word (`streamContent()`, a 35ms-interval reveal over the same canned response, not a real token stream) instead of appearing all at once; every completed assistant message gets a Copy button (`navigator.clipboard`) and, in Demo Mode only, a Regenerate button that re-runs the same canned-response simulation for that turn.

**Demo Mode login bypass** (new, not originally scoped, added after discovering login was completely unreachable in this environment — no live `DATABASE_URL`, no seeded user, and no `AUTH_SECRET` in `.env`) — `getCurrentUser()` (`src/lib/auth/session.ts`) now falls back to a synthetic Founder session (`DEMO_SESSION_USER`, `src/lib/demo/session.ts`) when `auth()` returns no real session **and** `isDemoMode()` is true; the real Auth.js/credentials/DB path is completely unchanged and still takes priority whenever a real session exists. The Login page shows a "Continue in Demo Mode" button (only rendered when `NEXT_PUBLIC_DEMO_MODE=true`) that simply links to `/command` — no server action, no cookie, no new auth mechanism. `DashboardLayout` (`src/app/(dashboard)/layout.tsx`) was also made demo-aware for the two calls it made unconditionally (`requireOrganization`, `listWorkspacesForMember`), which were the one gap in Session 14's otherwise-complete Demo Mode coverage — both now route through `withDemo()` with new `DEMO_ORGANIZATION`/`DEMO_WORKSPACES` fixtures, exactly like every other demo-covered query. Added `AUTH_SECRET`/`AUTH_URL` to `.env` (was entirely missing, causing every `auth()` call to throw) and set `NEXT_PUBLIC_DEMO_MODE="true"` locally for the demo build. See DEC-032.

**Nav-icon server/client boundary bug fix (pre-existing, not introduced this session)** — `DashboardLayout` (Server Component) was passing `NavItem[]` (each with a Lucide icon **function reference**) as a prop into `AppShell` (`'use client'`), which is invalid RSC serialization ("Functions cannot be passed directly to Client Components") and crashed every dashboard page load. This had been masked in every prior session because the dashboard always failed earlier on a real database connection first — Session 15 is the first time the app ever ran far enough to hit it. Fixed by moving `getNavForUser()` off the server and into `AppShell` itself (`useMemo` over a new `permissions: string[]` prop instead of a `navItems` prop) — icons are now selected client-side from the same `@/config/navigation` module that's already a client-safe shared import, never crossing the server/client prop boundary. See DEC-033.

**Verified:**
- `npx tsc --noEmit` — 0 errors
- `npx next build` — compiles clean, all 26 routes generate
- **Actually clicked through live in a browser for the first time across Sessions 10–15** — Login → Continue in Demo Mode → Mission Control (splash plays, hero/StatusStrip/QuickActions/AnimatedCounter render, Demo Mode badge shows) → AI Chat (`/agents/founder-executive-assistant`, sent a live message, watched it stream word-by-word, Copy/Regenerate buttons present) — via the Browser pane, not just compiler output
- Confirmed the nav-icon fix by reading the browser console in a fresh tab (no cached errors) after the page rendered correctly

**Not yet done:**
- No `data-presentation` visual click-through was captured this session (Presentation Mode toggle exists and type-checks, but wasn't clicked in the browser)
- The demo-mode login bypass is gated by `NEXT_PUBLIC_DEMO_MODE` and is not a substitute for real authentication once a database is provisioned (IDEA-031)

### Session 16: GitHub Integration — reference implementation (2026-07-18)

The first production integration, built to be the template every future integration (Figma, Slack, Stripe, ...) follows. See DEC-034 for the full architecture. No new engine, runtime, registry, or duplicate abstraction — every piece reuses something that already existed in the frozen architecture.

**New infrastructure:**

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Credential encryption | `src/lib/crypto/encryption.ts` | AES-256-GCM (Node's built-in `crypto`, no new dependency) — encrypts integration secrets before they're written to the database. Closes IDEA-004 for GitHub. |
| Integration queries | `src/lib/db/queries/integration.ts` | `findIntegrationByProvider`, `listIntegrationsForOrganization`, `upsertIntegrationCredentials`, `markIntegrationDisconnected` — first real consumer of the `Integration` model (existed since Session 3, unused) |
| GitHub API client | `src/lib/github/client.ts`, `types.ts`, `errors.ts` | Fetch-based (no SDK), typed `Raw*` → `GitHub*` mappers, `GitHubApiError` |
| GitHub credentials | `src/lib/github/credentials.ts` | `connectGitHubWithToken`, `disconnectGitHub`, `getGitHubConnectionStatus`, `getGitHubClientForOrganization` — OAuth-ready `GitHubCredentials` shape, PAT flow implemented |
| GitHub service layer | `src/lib/github/service.ts` | Org-scoped reads returning a `{connected, data, error}` envelope; `resolvePrimaryRepository()` (30s-cached); `getRepositoryDetail()`; `getGitHubSummary()` for the Mission Control widget — the single shared call site for both UI and Tool Engine tools |
| GitHub Tool Engine tools | `src/lib/agents/employees/github-tools.ts` | 8 tools: `github_list_repositories`, `github_get_repository`, `github_list_commits`, `github_list_pull_requests`, `github_list_issues`, `github_get_release`, `github_get_contributors`, `github_list_branches` — every parameter optional, so all 8 are auto-resolved into Developer AI's context (DEC-028), no new invocation mechanism |
| Demo GitHub fixtures | `src/lib/demo/github.ts` | `DEMO_REPOSITORIES` (6 repos, mirroring Session 14's demo projects), full commit/PR/issue/release/contributor detail for the 3 most active, `DEMO_GITHUB_SUMMARY` for the Mission Control widget |

**Developer AI upgraded** (`src/lib/agents/employees/developer.ts`, `src/config/ai-employees.ts`) — gained all 8 GitHub tools in `allowedTools` (11 tools total, up from 3), system prompt rewritten to describe explain-commits/summarize-PRs/analyze-activity/detect-inactive-repos/weekly-summary/release-summary as reasoning over the auto-resolved GitHub tool context, "no live Git connection" hard constraint replaced with instructions on how to report not-connected/errored GitHub state honestly. AI Directory now shows "11 tools" and "Repository analysis (live, via connected GitHub repositories)".

**UI** (`src/app/(dashboard)/settings/integrations/`):
- `/settings/integrations` — index, GitHub card with live/demo connection status
- `/settings/integrations/github` — Connection Status card (connected-as, masked token, last synced), `GitHubConnectForm` (PAT input, server action) when not connected, `DisconnectGitHubButton` when connected and demo mode is off
- `/settings/integrations/github/repos` — Repository Browser, card grid mirroring the AI Directory's list pattern
- `/settings/integrations/github/repos/[...repo]` — Repository Detail (catch-all route splitting `owner/name`): stat tiles (stars/forks/open issues/branches) + stacked cards for Commit Timeline, Branches, Contributors, Pull Requests, Issues, Releases — no new `tabs.tsx` primitive, matching System Health's existing stacked-card convention
- Settings landing page (`/settings`) gained an "Integrations" link card, visible to anyone with `integrations:read`
- Sidebar gained an "Integrations" nav item (founder and employee navigation, gated by the already-seeded `integrations:read` permission) and a Command Palette entry

**Mission Control** gained a GitHub widget (`src/components/modules/github/GitHubWidget.tsx`) in the side column — connected repository count, open PR/issue counts, 3 most recent commits, latest release, all scoped to the primary (most recently pushed) repository to keep API cost constant.

**Security**: `INTEGRATION_ENCRYPTION_KEY` added to `.env`/`.env.example` (AES-256-GCM key for credential encryption); `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` reserved in `.env.example` for the future OAuth flow (IDEA-032) but unused today. No GitHub token is ever stored in plaintext or logged.

**Verified:**
- `npx tsc --noEmit` — 0 errors
- `npx next build` — compiles clean, 29 routes generate (4 new: `/settings/integrations`, `/settings/integrations/github`, `/settings/integrations/github/repos`, `/settings/integrations/github/repos/[...repo]`)
- Clicked through live in the Browser pane with `NEXT_PUBLIC_DEMO_MODE=true`: Mission Control's GitHub widget (6 repos, 2 open PRs, 3 open issues, 3 recent commits, latest release) → Settings → Integrations (GitHub card, "Connected") → GitHub connection status page (connected as `@4knotts-bot`, masked token, "Demo Mode" notice, no connect/disconnect form shown) → Repository Browser (6 repository cards) → `4knotts/knottix` detail page (4 stat tiles, 5-commit timeline, 2 branches, 1 contributor, PR/issue/release sections) — no console errors in a fresh tab
- AI Directory confirmed Developer AI now shows "11 tools" and the updated description

**Not yet done / caveats:**
- No live model call was exercised (`ANTHROPIC_API_KEY` not configured in this environment), so Developer AI's actual use of the auto-resolved GitHub tool context (explain commits, weekly summary, etc.) has not been observed against a real response — only the registration/auto-resolution wiring was verified by type-checking and by confirming the tool count in the AI Directory (IDEA-034)
- No real GitHub account was connected (would require a real Personal Access Token) — the connect/disconnect server actions, encryption round-trip, and `GitHubApiError` handling are verified by type-checking and code review, not a live GitHub API call
- OAuth connect flow is not implemented — PAT only (IDEA-032)
- No caching/mirroring layer beyond the 30-second primary-repository cache — will need one before real team-scale usage (IDEA-033)

### Session 17: Command Center — primary interaction surface (2026-07-18)

Replaced the lightweight Command Palette with a full-screen, intent-routing Command Center — the PRIMARY way to interact with Knottix per the mission. Classifies free-text input into Navigation / Search / Tool / Workflow / Conversation / Information and routes it using only pre-existing infrastructure (Prompt Engine, AI Runtime, Tool Engine, Agent Framework). See DEC-035 for the full architecture and DEC-036 for a client/server boundary bug it surfaced and fixed.

**New infrastructure:**

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Types | `src/lib/command-center/types.ts` | `CommandIntent`, `CommandPlan`, `CommandExecutionResult` — the shared contract between router, engine, API route, and UI |
| Client-safe router | `src/lib/command-center/router.ts` | `heuristicClassify()`, `resolveEmployeeForQuery()`, `resolveNavigation()` — zero server-only imports, used by both the client UI (instant preview, Navigation fast path) and the server (deterministic fallback beneath AI classification, and the only classifier in Demo Mode) |
| AI classification prompt | `src/lib/command-center/prompt.ts` | Registers the `command-center-intent` global prompt template idempotently (same pattern as AI Employee prompt registration) |
| AI classification | `src/lib/command-center/classify.ts` | `promptEngine.render()` → `aiRuntime.complete()` (Haiku), mirroring `agent-pipeline.ts`'s own shape; falls back to the heuristic on any failure or in Demo Mode |
| Execution engine | `src/lib/command-center/engine.ts` | `planCommand()`/`executeCommand()` — Tool/Workflow via direct `toolEngine.execute()` calls, Conversation/Information via direct `intelligence.agents.execute()` calls, Demo Mode branch reusing existing `DEMO_*` fixtures |
| Shared request-context helper | `src/lib/system/request-context.ts` | `buildIntelligenceContext(user, module, conversationId?)` — extracted from `api/agents/[key]/route.ts`'s own glue so the Command Center route doesn't duplicate it; that route now uses the helper too |
| API route | `src/app/api/command-center/route.ts` | Single POST endpoint: classifies, executes immediately for non-mutating intents, or returns the plan alone (for the Confirmation Card) when `requiresConfirmation && !confirm` |
| Zustand store | `src/stores/command-center-store.ts` | `recent`/`favorites` command history, persisted — replaces the old Command Palette's raw-`localStorage` recent-commands logic |

**UI** (`src/components/layouts/command-center/`) — `CommandCenter.tsx` (full-screen glass overlay, replacing the small popover `CommandPalette.tsx`, which was deleted), `IntentBadge.tsx`, `CommandIdleView.tsx` (Recent/Favorite/example chips when empty, live nav suggestions while typing), `CommandConfirmCard.tsx` (Detected intent / AI Employee / Tools to execute / Affected resources / Execute / Cancel, exactly as the mission specified), `CommandResultView.tsx` (Summary / execution time / AI Employee used / Tools executed / Next suggested actions, plus a favorite-toggle star). Rotating placeholder cycles through the mission's 8 example commands. Opens via `⌘K`/`Ctrl+K` (unchanged), a new Sidebar trigger button (`Command Center ⌘K`, the mission's explicit "Sidebar" open-trigger requirement), the existing Topbar search button, and Mission Control's Quick Actions ("Command Center", renamed from "Command Palette"). The open event (`OPEN_COMMAND_CENTER_EVENT`, renamed from `OPEN_COMMAND_PALETTE_EVENT`) now supports an optional `{ query }` detail so history chips can reopen pre-filled.

**Mission Control** gained a `CommandHistoryWidget` (Recent Commands + Favorite Commands, per the mission) reading the same Zustand store, in the side column below the GitHub widget.

**Confirmation gate**: real and functional — `plan.requiresConfirmation` is true whenever the router detects a write-verb command (`create`/`assign`/`delete`/...). Since every tool registered in the codebase today is read-only (Founder Assistant's 3 tools, GitHub's 8 tools, `list_clients`/`list_recent_files`), no real mutation exists to confirm yet — in real mode this honestly reports "no tool is registered for this action yet, nothing was changed"; in Demo Mode it shows "Demo Mode — command simulated." with an explicit "No data was changed" line, per the mission's explicit Demo Mode instruction. No fake `create_project` tool was built solely to exercise the UI (coding-rules.md rule 4).

**Verified:**
- `npx tsc --noEmit` — 0 errors
- `npx next build` — compiles clean, 30 routes (added `/api/command-center`)
- Clicked through live in the Browser pane with `NEXT_PUBLIC_DEMO_MODE=true`:
  - **Tool intent**: "Show GitHub repositories" → classified Tool, executed `github_list_repositories` against the demo fixtures, returned "6 repositories — 4knotts/knottix, ..." with a "Demo Mode — command simulated." banner, 1ms latency, "Open the full GitHub Repositories page" suggestion — and the command immediately appeared under Mission Control's Recent Commands (confirming the Zustand store syncs live across the modal and the background widget)
  - **Confirmation flow**: "Create a project for ACCD" → classified Tool (write-shaped), Confirmation Card showed Detected intent=Tool, AI Employee=Founder Executive Assistant, Tools to execute="None registered yet", Affected resources="ACCD" → clicking Execute returned "Demo Mode — command simulated." / "No data was changed — this is a simulated result."
  - **Navigation intent**: "Open Developer AI" → resolved entirely client-side (no network request), closed the Command Center, and navigated straight to `/agents/developer-ai`
  - No console errors in a fresh tab after the fixes below

**Bugs found and fixed during live verification (not caught by `tsc`/`next build`):**
- **Client/server boundary break**: `router.ts` imported `AI_EMPLOYEES` from `@/config/ai-employees`, which imported each AI Employee's `*_KEY` constant from its server-only definition file (e.g. `developer.ts` → `github-tools.ts` → Prisma) — bundling the Command Center into client code pulled `pg`'s Node built-ins (`net`, `tls`) into the browser bundle and broke `next build` with `Module not found`. Fixed at the root by making `ai-employees.ts` itself client-safe: its 7 employee keys are now literal strings instead of imports (see DEC-036). `tsc --noEmit` did not catch this — it's a bundler/module-resolution failure, not a type error, and only surfaced on `next build`.
- **Stale query on "Ask something else"**: clicking "Ask something else" (or Cancel, or a suggestion chip) reset the result/confirmation view but never cleared the input's `query` state, so the next typed command got appended to the leftover text (observed live as `"Show GitHub repositoriesCreate a project for ACCD"`). Fixed by adding a dedicated `startNewCommand()` that clears `query` alongside the view state, used by "Ask something else" and Cancel; `selectExample()` (used by history/suggestion chips) now also resets the view so a chip click can't leave a stale result showing under a new query.

**Not yet done / caveats:**
- AI-based classification (the real `aiRuntime.complete()` path in `classify.ts`) was never exercised against a real model call — no `ANTHROPIC_API_KEY` in this environment means every live test above went through the heuristic-only path (Demo Mode) or the fallback-on-failure path (IDEA-035)
- "Workflow" intent sequences `toolEngine.execute()` calls directly rather than calling a registered `WorkflowDefinition` — the Workflow Engine has zero registered workflows and zero `tool`/`agent`/`prompt` step handlers anywhere in the codebase today (IDEA-036)
- No real write/mutation tool exists for any business entity, so the Confirmation Card's "Execute" path can only ever be demonstrated in Demo Mode outside of showing the honest "not available" message (IDEA-037)

### Session 18: Desktop Runtime — Knottix controls the local computer (2026-07-18)

Turned Knottix into a real local AI desktop agent. The mission's first version (unrestricted shell execution, autonomous WhatsApp sending, an always-executing voice loop) was declined in the prior turn on safety grounds; the user's revised mission addressed the shell-execution and autonomous-send concerns directly (an allowlisted git/dev tool set instead of `run_shell_command`, explicit confirmation before sending/closing/deleting/git commit/push/restart/shutdown), and this session implements that revised scope. See DEC-037 for the full architecture and DEC-038 for a safety bug found and fixed during live testing.

**New module — `src/lib/desktop-runtime/`** (the one new module the mission allowed; everything else reuses the existing Tool Engine/Agent Framework/Command Center):

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Safe process execution | `exec.ts` | `runCommand`/`launchDetached`/`launchDirect` — `execFile`/`spawn` with argument arrays, never shell-interpolated strings |
| OS automation | `os-tools.ts` | `open_chrome`, `open_edge`, `open_vscode`, `open_cursor`, `open_file_explorer`, `open_terminal`, `open_folder`, `open_file`, `open_url`, `google_search`, `youtube_search`, `focus_window`, `switch_window`, `close_app` (confirmation) |
| Clipboard | `clipboard.ts` | `clipboard_read`/`clipboard_write` via PowerShell's `Get-Clipboard`/`Set-Clipboard`, text passed through an env var (never string-interpolated) |
| Screenshot | `screenshot.ts` | `take_screenshot` via .NET `System.Drawing`/`System.Windows.Forms` through PowerShell |
| Allowlisted dev tools | `dev-tools.ts` | `open_project`, `start_dev_server`, `git_status`, `git_pull`, `git_fetch`, `git_commit` (confirmation), `git_push` (confirmation), `open_terminal_in_project`, `open_logs` — each runs exactly one fixed command, never a caller-supplied shell string |
| Browser session | `browser/session.ts` | Singleton Playwright `launchPersistentContext` on a dedicated, isolated Chrome profile (`~/Knottix/BrowserProfile`) — never the user's real default profile |
| Browser primitives | `browser/tools.ts` | `browser_open`, `browser_navigate`, `browser_search`, `browser_fill`, `browser_click`, `browser_new_tab`, `browser_close_tab`, `browser_switch_tab`, `browser_list_tabs`, `browser_read_page`, `browser_screenshot`, `browser_scroll`, `open_browser_devtools` |
| WhatsApp | `browser/whatsapp.ts` | `whatsapp_open`, `whatsapp_find_contact`, `whatsapp_type_message` (draft only), `whatsapp_preview_message`, `whatsapp_send_message` (confirmation — never sends automatically) |
| Instagram | `browser/instagram.ts` | `instagram_open`, `instagram_open_profile`, `instagram_search_users`, `instagram_open_reels`, `instagram_scroll_feed`, `instagram_read_visible_content` |
| STT | `voice/stt.ts` | Real Deepgram or OpenAI Whisper adapter (fetch-based, no SDK), whichever API key is configured; throws a clear error if neither is set |
| TTS | `voice/tts.ts` | Real ElevenLabs adapter if configured, otherwise Windows' built-in SAPI voice via PowerShell (genuinely speaks through the machine's speakers) |
| Wake phrase | `voice/wake-word.ts` | STT-based "Hey Knottix" detection (transcribe rolling chunks, string-match) — not a dedicated acoustic wake-word engine (IDEA-039) |
| Registration | `register.ts` | `registerDesktopRuntimeTools()` — same idempotent `registerTools()` helper every AI Employee uses, called from `ensureOrganizationReady()` |

**Deliberately not implemented**: a general `run_shell_command` tool, and raw global OS-level mouse/keyboard simulation. Where the mission's examples need pointer/keyboard input (filling WhatsApp's message box, clicking Instagram buttons, scrolling a feed), those are Playwright page-scoped calls confined to the Knottix-controlled browser tab, never a global input hook — see DEC-037 for the full reasoning, which was already stated to the user in the prior (declined-scope) turn and carried forward here since the revised mission didn't revisit that specific point.

**Command Center integration** — `router.ts` gained ~20 new tool-keyword entries with parameter extraction (quoted strings, URLs, "to X" patterns) and a dedicated `detectWhatsAppSend()` matcher for "Send X to Y" → a 4-step `whatsapp_open → whatsapp_find_contact → whatsapp_type_message → whatsapp_send_message` plan. `engine.ts` now threads `step.params` through to real tool calls (previously only `read_organization_memory`'s search query was wired), stops a multi-step sequence at the first failure, and — critically — checks each resolved tool's real `metadata.requiresConfirmation` via the Tool Registry in real mode, upgrading the plan to require confirmation even when the router's own heuristics didn't already flag it. `planCommand()` also now calls `ensureOrganizationReady()` in real mode, a latent bug from Session 17 (AI classification's prompt template was never actually registered before use outside Demo Mode, silently masked because every Session 17 test ran in Demo Mode).

**Permissions**: added `desktop:execute`/`desktop:manage` to `constants/permissions.ts` and `prisma/seed.ts` (kept in sync, matching the codebase's existing dual-definition pattern), granted to `DEVELOPER` role; `FOUNDER`/`ADMINISTRATOR` already get everything via existing bypass/allPermissionKeys rules.

**New dependency**: `playwright` (explicitly requested by the mission for browser automation) — uses `channel: 'chrome'` to drive the user's real installed Chrome rather than downloading a bundled browser.

**New env vars** (`.env.example`): `DEEPGRAM_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (all optional — the system degrades to Whisper/local-SAPI when unset, never to a fake response).

**Voice wiring in the existing Command Center** (no UI redesign, per the mission — functional wiring only): `useVoiceMode.ts` hook adds `MediaRecorder`-based mic capture, sends 4-second chunks to `/api/voice/transcribe`, and on a detected "Hey Knottix" + command, calls the exact same `submit()` function typed commands already use — voice and typed input share one execution pipeline. One mic-toggle icon button was added to `CommandCenter.tsx`'s existing input row, styled identically to the existing Close button (no new visual design). Results are spoken back via `/api/voice/speak` only when the triggering command came from voice.

**Verified — real execution, tested directly on this machine:**
- **Clipboard**: wrote real text via `Set-Clipboard`, read it back via `Get-Clipboard` — confirmed round-trip
- **Screenshot**: captured a real 232KB PNG of the actual screen via the exact PowerShell script `screenshot.ts` uses
- **Window focus**: the `SetForegroundWindow`/`ShowWindow` P/Invoke script correctly found Chrome's running process and would bring it to the foreground
- **Local TTS**: the SAPI `SpeechSynthesizer.Speak()` script executed successfully (exit code 0, blocked for the spoken duration — confirming it played real audio; audibility itself wasn't/couldn't be confirmed by the agent)
- **Full Command Center pipeline, live in the Browser pane** (`NEXT_PUBLIC_DEMO_MODE=true`): "take a screenshot" → classified Tool, executed, returned "Demo Mode — this action was simulated. Nothing was actually executed on the computer."; "Send \"Hello\" to Shubhrat" → classified Workflow, **Confirmation Card correctly appeared** showing all 4 WhatsApp steps before anything ran, clicking Execute ran all 4 steps and returned the same honest "simulated, nothing executed" message for each
- `npx tsc --noEmit` — 0 errors; `npx next build` — compiles clean, 32 routes (added `/api/voice/transcribe`, `/api/voice/speak`)

**Bug found and fixed during live verification**: the WhatsApp send confirmation flow initially ran all 4 steps in Demo Mode **without ever showing the Confirmation Card** — `planCommand()`'s tool-metadata confirmation check only ran in real mode (Demo Mode never hydrates the Tool Registry), so nothing enforced "wait for confirmation" during a demo. Fixed by moving the primary enforcement into the client-safe router itself (`CONFIRMATION_REQUIRED_TOOLS`, checked by `heuristicClassify()` directly, so it holds in both modes) — see DEC-038. Re-verified live after the fix: the Confirmation Card now appears correctly before any WhatsApp step runs, in Demo Mode.

**Not yet done / caveats (honest, not simulated — these are gaps in what could be observed, not gaps in what the code does):**
- No Playwright browser session was actually driven against a real WhatsApp Web/Instagram login — no account was logged into the dedicated Knottix browser profile during this session (IDEA-041)
- No real STT/TTS provider call was exercised — no `DEEPGRAM_API_KEY`/`OPENAI_API_KEY`/`ELEVENLABS_API_KEY` configured in this environment
- No real microphone/wake-phrase loop was exercised — this sandbox has no audio input hardware
- WhatsApp Web selectors (`aria-label`/`title` based, the most stable hooks WhatsApp's own accessibility markup provides) will need updating if WhatsApp redesigns its web client — inherent to any non-official WhatsApp Web automation (IDEA-038)

### Session 19: Goal Execution Engine — Knottix plans, executes, verifies, and retries whole goals (2026-07-19)

Turned Knottix from "reacts to individual commands" into "give it a goal, it delivers the finished output" — a Goal Execution Engine that plans, executes, verifies, and retries, built entirely on top of the Workflow Engine, Tool Engine, Agent Framework, Prompt Engine, Memory Engine, Desktop Runtime, and Command Center. No new AI, no new engine, no duplicate execution pipeline. See DEC-039 for the full architecture.

**Workflow Engine extended (closes IDEA-036)** — three additive capabilities, all reusable by anything that registers a `WorkflowDefinition`, not goal-specific:
- `src/lib/workflows/step-handlers.ts` (`registerCoreWorkflowStepHandlers()`) — real `tool`/`agent`/`prompt` step handlers, calling `toolEngine.execute()`/`agentEngine.execute()`/`promptEngine.render()`+`aiRuntime.complete()` — the exact calls every other part of Knottix already makes
- Pause/resume for confirmation-gated steps — new `WorkflowExecutionStatus.WAITING_CONFIRMATION` (additive Prisma enum value), `WorkflowConfirmationRequired` signal, `WorkflowExecutor.resume(executionId, confirm)` / `WorkflowEngine.resume()`
- Per-step retry — `step.config.retry.maxAttempts`, read directly in the executor's `runStep`

**Goal Execution Engine — new module** (`src/lib/goal-engine/`, the mission's one explicitly-scoped new module):

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Types | `types.ts` | `GoalPlan`, `GoalStepSummary`, `GoalExecutionSummary` — the shared contract between planner, engine, API routes, and UI |
| Project Templates | `templates.ts` | `matchGoalTemplate()` (deterministic keyword matcher, including an `UNSUPPORTED` list for logo/invoice/presentation generation — capabilities Knottix genuinely has no tool for) + `buildGoalWorkflow()` (hand-written, reviewable `WorkflowStepDefinition[]` builders for `deploy-project`, `sync-project`, `engineering-summary`, `project-status-report`, `website-plan`, `content-draft`) |
| AI-upgraded planning | `planner.ts`, `prompt.ts` | `planGoalHeuristic()` (pure, no system dependency — the only path Demo Mode uses) and `planGoal()` (adds an optional AI upgrade over the SAME fixed template list, mirroring `command-center/classify.ts`'s exact discipline — never in Demo Mode, falls back to heuristic on any failure) |
| Memory reuse | `memory.ts` | `recordGoalOutcome()` writes one real `memoryEngine.create()` entry per finished goal (tagged `goal-execution` + template key + outcome); `recallGoalHistory()` reads them back before planning to surface a track record in `GoalPlan.reasoning` — informational only |
| Facade | `engine.ts` | `startGoal()`/`resumeGoal()`/`getGoalStatus()` — creates a real `WorkflowDefinition` per goal and calls `workflowEngine.execute()`/`resume()`/`getExecution()`; Demo Mode uses a separate, fully in-memory simulation path (`startDemoGoal`/`resumeDemoGoal`) that never calls `buildIntelligenceContext` (no database touch while demoing) |

**New tool**: `git_add` (`dev-tools.ts`) — stages all changes, same allowlist tier as `git_status`/`git_pull` (no confirmation needed, reversible), the one gap that would have blocked the "Deploy my project" example from being real end-to-end.

**API routes**: `POST /api/goals` (start), `GET /api/goals/[executionId]` (poll status), `POST /api/goals/[executionId]/confirm` (resume) — all gated by the existing `workflows:read`/`workflows:execute` permissions (no new permission needed; Goal Execution IS the Workflow Engine).

**UI**: `/goals` (`GoalExecutionPanel.tsx`) — goal input, real task-graph view (per-step status/attempts/summary/error), a Confirmation Card matching `CommandConfirmCard`'s visual language, polled via TanStack Query (`GET /api/goals/[executionId]`, `refetchInterval` while RUNNING) — the first real consumer of `QueryProvider`, present since an earlier session but never wired to an actual query until now. A Mission Control widget (`GoalExecutionWidget.tsx`) links out to the full panel, matching the GitHub widget's own "summary card, full experience elsewhere" pattern. Reads an optional `?goal=` query param and auto-starts — the landing point for Command Center goal routing.

**Command Center integration** — `router.ts` gained `detectGoalCommand()`: goal-shaped free text ("Build a website for ACCD", "Deploy my project at ...") resolves to the EXISTING `navigation` intent, pointing at `/goals?goal=...` — no new Command Center execution path, no second router.

**Verified — live in the Browser pane, Demo Mode**:
- `npx tsc --noEmit` — 0 errors; `npx next build` — compiles clean, 35 routes (added `/goals`, `/api/goals`, `/api/goals/[executionId]`, `/api/goals/[executionId]/confirm`)
- Full `deploy-project` goal, live via direct `fetch()` and the real UI: 5-step plan built → 2 steps auto-completed → correctly paused at `git_commit` (Confirmation Card shown) → confirmed → 1 more step completed → correctly paused again at `git_push` → confirmed → all 5 steps completed
- `create a logo for our new landing page` → correctly classified `UNSUPPORTED`, zero steps executed, honest message shown — confirming "no fake execution" holds
- `write a blog about our latest release` → `content-draft` template, Content AI agent step, completed
- Command Center: "Build a website for ACCD" → classified `navigation`, `href: /goals?goal=Build%20a%20website%20for%20ACCD`
- `/goals?goal=...` auto-start confirmed end-to-end in the actual rendered UI (not just the API): task graph, step statuses, and Confirmation Card all rendered correctly

**Bugs found and fixed during live verification (not caught by `tsc`/`next build`)**:
- `startGoal()` originally called `buildIntelligenceContext()` (a real Prisma `organization.findUnique()`) unconditionally, even in Demo Mode — violated the "Demo Mode never touches a real database" contract every other module follows. Fixed by branching on `isDemoMode()` before any system/database call, using `planGoalHeuristic()` (zero dependencies) for the demo path.
- `resumeDemoGoal()` reconstructed a fake partial `GoalPlan` (`{ goal, templateName } as GoalPlan`) missing `.steps`, and the shared step-runner read `plan.steps.length` — crashed on the second confirmation of any multi-confirmation goal. Fixed by passing `goal`/`templateName`/`totalSteps` as plain parameters instead of a synthetic cast object.
- The Demo Mode execution store (`demoExecutions`, a module-level `Map`) didn't reliably share state between `/api/goals` and `/api/goals/[executionId]/confirm` — two different `route.ts` files — under Next.js 16's Turbopack dev server; confirming a paused goal hit the same "real database touch" error as the first bug. Fixed by anchoring the map to `globalThis` instead of module scope (IDEA-043 tracks auditing other module-level singletons for the same risk).

**Not yet done / caveats (honest, not simulated)**:
- No live model call was exercised for the AI-upgraded template classification or any `website-plan`/`content-draft` agent step (no `ANTHROPIC_API_KEY` in this environment) — every live test above went through the heuristic-only Demo Mode path
- `website-plan`'s three agent steps reason independently rather than as a hand-off pipeline (IDEA-045)
- Goal/workflow execution state is in-memory only — a goal paused mid-confirmation is lost on server restart (IDEA-042)
- A pre-existing duplicate-DOM-render issue (confirmed on `/agents` too, not introduced this session) made browser-automation clicking unreliable during verification — worked around via direct `fetch()`/`get_page_text` checks; root cause not yet diagnosed (IDEA-044)
- No "QA" AI Employee exists (the mission named one; Knottix's seven employees don't include it) — self-verification uses real tool re-checks instead (IDEA-046)

### Session 20: Skill Registry — every capability becomes a discoverable, composable skill (2026-07-19)

Turned the Goal Execution Engine's fixed 6-template switch into a real, extensible Skill Registry — "adding a new capability should require only registering a new skill" is now literally true. No new AI, no new engine; Skills sit beside Tool/Prompt/Agent/Workflow following the exact same registry+persistence pattern. See DEC-040 for the full architecture.

**Skill Registry — new module** (`src/lib/skills/`, the mission's one explicitly-scoped new module):

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Types | `types.ts` | `SkillDefinition`, `RegisterSkillInput`, `SkillPlanBuilder`, `SkillFilter`, `SkillMatch`, `SkillStats` |
| Registry | `registry/skill-registry.ts` | Org-scoped in-memory storage — register/get/find/exists/activate/deactivate/`applyPersistedState` |
| Discovery | `discovery/skill-discovery.ts` | Ranks active skills against free text by real keyword-overlap score |
| Access | `permissions/skill-access.ts` | `requiredPermission` gate, `isFounder` bypass |
| Engine | `engine/skill-engine.ts` | Facade composing all of the above |
| Persistence | `persistence/skill-persistence.ts` | Metadata-only write-through decorator against a new `Skill` Prisma model — mirrors `AITool`'s exact DEC-027 precedent; `buildPlan` closures stay code-only |
| Catalog | `catalog/{development,business,desktop,browser}.ts` | 17 real skills — every one backed by an already-registered Desktop Runtime/GitHub tool or AI Employee, zero placeholders |
| Registration | `catalog/register-all.ts` | `registerCoreSkills()` — idempotent, same pattern as `registerTools()`/`registerAllAIEmployees()` |

**Goal Engine planner rewritten around skill composition** — `goal-engine/templates.ts` (Session 19) deleted:
- `goal-engine/skill-index.ts` — a `globalThis`-anchored, database-free `SkillEngine` instance (`getSkillIndex()`) registering the same code catalog purely for planning-time discovery, shared by both Demo Mode and real mode (applies IDEA-043's lesson proactively)
- `planner.ts` — splits a goal into clauses, discovers the best-matching skill per clause, and composes multiple matched skills into ONE step graph (`sk{index}_`-prefixed step IDs, chained via `onSuccess`) — real multi-skill composition, not a single-template lookup
- `prompt.ts` — the AI-upgrade path now renders a LIVE `{{skillList}}` from whatever is currently registered, not a static baked-in list; a newly-registered skill is immediately AI-selectable with zero prompt changes
- `GoalPlan.templateKey` (closed union) replaced with `GoalPlan.kind` (`'skill-composed' | 'general-question' | 'unsupported'`) + `GoalPlan.skillKeys: string[]` — memory tagging and stats attribution now key on real skill keys instead of a retired template concept

**Self-evaluation — real, derived from already-persisted data, no new stats table**:
- `startGoal()` stashes `plan.skillKeys` into `WorkflowContext.initialVariables.__skillKeys`, which `workflow-persistence.ts` was *already* writing verbatim to `WorkflowExecution.input` — zero changes needed there
- `src/lib/db/queries/skill-stats.ts`'s `getSkillStats()` reads the most recent 300 `WorkflowExecution` rows per organization and derives usage count, success/failure counts, success rate, average duration, average retries, last-executed timestamp, and the top 3 most common failure messages — all real numbers (IDEA-047 tracks the 300-row bound; IDEA-048 tracks using these stats to break discovery ties, not yet wired in)

**UI**: `/skills` (Mission Control) — every active skill grouped by category (Development/Business/Desktop/Browser) with its real tool dependencies and, in real mode, live usage/success-rate/last-run stats; a nav item + Command Palette entry added alongside `/goals`.

**Verified — live in the Browser pane, Demo Mode, via direct `fetch()` (browser-automation clicking still unreliable per IDEA-044)**:
- `npx tsc --noEmit` — 0 errors; `npx next build` — compiles clean, 36 routes (added `/skills`)
- `/skills` renders all 17 skills correctly grouped into 4 categories with real tool-dependency chips
- "Deploy my project at C:\...\KNOTTIX" → matched the `deploy-project` skill, composed its 5-step graph with `sk0_` prefixes, paused at `git_commit`, confirmed, paused again at `git_push`, confirmed, completed — identical behavior to Session 19's template-based version, now produced by skill discovery instead
- "take a screenshot and read clipboard" → composed TWO independent skills (`take-screenshot` + `clipboard-read`) into one 2-step graph (`sk0_s1`, `sk1_s1`) and completed both — real multi-skill composition confirmed live
- "create a logo for our new product" → still honestly declined as `UNSUPPORTED`, zero steps executed

**Not yet done / caveats (honest, not simulated)**:
- No live model call was exercised for the skill classifier's AI-upgrade path or any newly-registered skill's agent step (no `ANTHROPIC_API_KEY` in this environment) — every live test above went through the heuristic-only Demo Mode path (IDEA-050)
- Skill discovery doesn't yet re-rank ties using real success-rate stats — only surfaced informationally in `GoalPlan.reasoning` (IDEA-048)
- Multi-skill composition doesn't thread one skill's real output into the next skill's input — same class of limitation as Session 19's `website-plan` (IDEA-045), now generalized (IDEA-049)
- `getSkillStats()`'s 300-execution bound is a pragmatic default, not indexed at the database level (IDEA-047)

### Session 21: Task Sessions — long-running autonomous work that survives a restart (2026-07-19)

Turned single Goal Executions into persisted, multi-round Task Sessions that give ONE objective and keep working until it's completed, paused, blocked, or cancelled — including surviving a server restart mid-confirmation. No new AI, engine, workflow engine, tool engine, or planner. See DEC-041 for the full architecture.

**Workflow Engine gained real crash recovery (benefits every future consumer, not just Task Sessions)**:
- `runFrom()` now persists a `WorkflowExecution` row the moment a run pauses for confirmation, not only on completion/failure — closing the gap where a paused execution was previously invisible to the database entirely
- Fixed a latent bug found while touching it: the in-memory `WorkflowHistoryStore.record()` always pushed a new entry instead of upserting by `executionId`, so `getById()` could return a stale snapshot after a later update
- `WorkflowHistoryStore` gained `getByIdRemote()` (real direct DB lookup, Prisma-decorator only) and `WorkflowStateManager` gained `seed()`
- `WorkflowExecutor.resume()` now takes a `context: WorkflowContext` and, when the in-memory paused closure is gone (a server restart), reconstructs the workflow/step graph/execution state from persisted data and a freshly-built context — `goal-engine`'s `resumeGoal()`/`getGoalStatus()` both gained the matching DB-fallback

**Task Sessions — new module** (`src/lib/task-sessions/`, the mission's one explicitly-scoped new module):

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Prisma model | `schema.prisma` | `TaskSession` — objective, status (RUNNING/PAUSED/BLOCKED/COMPLETED/FAILED/CANCELLED), `workflowExecutionIds[]`, `skillKeys[]`, `artifacts[]`, `retryCount`, `lastError` |
| Query file | `src/lib/db/queries/task-session.ts` | Standard `createX`/`findX`/`requireX`/`listX`/`updateX` convention, plus `findActiveTaskSessionByKeyword` for Command Center resolution |
| Manager | `manager.ts` | `startTaskSession`/`resumeTaskSession`/`continueTaskSession`/`cancelTaskSession`/`getTaskSessionProgress` — thin wrappers delegating all real planning/execution to `startGoal`/`resumeGoal`/`getGoalStatus` |
| Memory | `memory.ts` | `recordSessionOutcome()` (one real entry per finished session — objective, outcome, rounds, skills, retries, artifacts, duration, failing steps) / `recallSessionPatterns()` (surfaced on the page as an honest track-record banner) |
| Demo guard | `demo-guard.ts` | `assertTaskSessionsAvailable()` — Task Sessions require a real database and are honestly declined in Demo Mode, not simulated |

**Artifacts are extracted, never fabricated** — `GoalStepSummary` gained an `artifact` field, populated in `goal-engine/engine.ts` only when a step's real output has a `.path`/`.url`, or its text contains git's own commit-hash line (`[branch abc1234] message`).

**API routes**: `POST /api/task-sessions` (start), `GET /api/task-sessions` (list, filterable by status), `GET /api/task-sessions/[id]` (live progress), `POST /api/task-sessions/[id]/confirm`, `POST /api/task-sessions/[id]/continue`, `POST /api/task-sessions/[id]/cancel` — all gated by the existing `workflows:read`/`workflows:execute` permissions and `assertTaskSessionsAvailable()`.

**UI**: `/task-sessions` (`TaskSessionsPanel.tsx`) — Running/Paused-Blocked/Completed/Failed-Cancelled grouped session list, live task-graph detail (polled via TanStack Query), current skill/employee/tool, estimated time remaining, artifacts produced, Confirm/Decline/Continue/Cancel actions. A Mission Control widget links out, hidden in Demo Mode.

**Command Center integration** — `router.ts` gained `task_session:list`/`task_session:continue`/`task_session:cancel` keyword entries ("Continue my website", "Resume ACCD", "Show active work", "Pause current session"); `command-center/engine.ts`'s new `runTaskSessionStep()` resolves the named session (by keyword, or "most recently active" when unnamed) and calls the exact same `task-sessions/manager.ts` functions the page uses. `task_session:cancel` added to `CONFIRMATION_REQUIRED_TOOLS`.

**Verified**:
- `npx tsc --noEmit` — 0 errors; `npx next build` — compiles clean, 39 routes (added `/task-sessions`, `/api/task-sessions`, `/api/task-sessions/[sessionId]`, `.../confirm`, `.../continue`, `.../cancel`)
- No live database in this environment (`DATABASE_URL` is still Prisma's default placeholder) — every claim in this session, including the central "survives a restart" one, is verified by `tsc`/`next build`/code review only, not an observed live restart (IDEA-053, the highest-priority open item)

**Not yet done / caveats (honest, not simulated)**:
- Only the confirmation-pause instant is truly crash-recoverable — a step actively executing when the process dies is still lost, no mid-step checkpointing exists (IDEA-051)
- "Continue my objective" always re-plans from the original objective text with no awareness of what prior rounds already completed, risking redundant re-execution of non-idempotent skills (IDEA-052)
- `findActiveTaskSessionByKeyword` has no disambiguation when two active sessions share a keyword — silently picks the most recently updated (IDEA-054)
- Task Sessions are unavailable in Demo Mode by deliberate design (DEC-041), not a gap to close

### Session 22: Context Engine — every goal starts by discovering what Knottix already knows (2026-07-20)

Built a Universal Context Engine that automatically collects, ranks, and selects real context from 13 sources before every Goal Execution — no new AI, no new storage, no duplicate of the Memory/Knowledge architecture. See DEC-042 for the full architecture. (Note: this session's project directory moved from `Desktop\KNOTTIX` to `Desktop\PROJECTS\KNOTTIX` mid-session, a user-side reorganization — no files were lost, confirmed by a clean `tsc` run immediately after locating the new path.)

**Context Engine — new module** (`src/lib/context-engine/`, the mission's one explicitly-scoped new module):

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Types | `types.ts` | `ContextItem` (source, title, summary, sourceRef, relevance/freshness/trust/total scores, reasonSelected, timestamps), `ContextCollectionResult` |
| Collectors | `collectors.ts` | One real `Collector` per source — Memory, Knowledge, Projects, Tasks, Meetings, Documents, GitHub, Task Sessions, Workflow History, Skill History, Artifacts, Browser State (real open tabs), Desktop State (real clipboard) — every one a call into an already-existing query/service, nothing new |
| Ranking | `ranking.ts` | `scoreRelevance()` (keyword overlap, title-weighted), `scoreFreshness()` (14-day half-life decay), `scoreTrust()` (static per-source weights), `rankAndSelect()` (top 15 above a relevance floor, everything else `rejected` with a real reason) |
| Engine | `engine.ts` | `collectContext()` (orchestrates all collectors in parallel, resilient to individual failures), `renderContextBlock()` (formats selected items for an agent prompt), `explainContext()` (Command Center's "why did you choose this" answer) |
| Memory | `memory.ts` | `recordContextUsage()` — one real entry per finished goal, tagged `context-pattern` + contributing sources + outcome |
| Demo guard | `demo-guard.ts` | `assertContextEngineAvailable()` — every collector is a real database/service query, honestly declined in Demo Mode |

**Goal Engine integration** — `startGoal()` calls `collectContext(goal, user)` once the plan is confirmed real (after skill selection, not strictly before as the mission's diagram shows — see IDEA-056), then `enrichAgentSteps()` prepends the selected context as a real text block to every 'agent' step's input before the workflow runs. `GoalExecutionSummary` gained `contextUsed: ContextItem[]`, round-tripped through `WorkflowContext.initialVariables.__contextUsed` the same way Session 20's `__skillKeys` already was.

**Task Sessions integration** — `TaskSession` gained a `workingContext: Json` field (additive schema change). Each round's `contextUsed` merges into it (deduped, capped at 20, re-sorted by score) — reusing what `startGoal`/`resumeGoal` already collected rather than a second `collectContext()` call. New artifacts automatically feed the next round's context because the `artifact` collector reads straight from `TaskSession.artifacts`.

**Automatic Project Detection** ("Continue ACCD" → repo, tasks, meetings, artifacts, without asking again) needed zero special-cased code — it falls directly out of the generic collect-and-rank pipeline scoring "ACCD" against every source in parallel.

**Command Center**: `context:explain` — "What do you know about ACCD?" / "Why did you choose this context?" / "What information are you using?" — new `router.ts` keyword entries, resolved in `command-center/engine.ts`'s `runContextStep()` via `explainContext()`.

**UI**: `/context` (Context Inspector) — ad-hoc query box showing Context Sources (every collector, including empty ones), Selected Context, and Rejected Context, each item with all four scores and its real reason. `/task-sessions` now also shows each session's live Working Context.

**Verified**:
- `npx tsc --noEmit` — 0 errors; `npx next build` — compiles clean, 40 routes (added `/context`, `/api/context`)
- `/context` renders correctly, honestly declines in Demo Mode
- Command Center: "What do you know about ACCD?" → classified `tool`, resolved to `context:explain`, honestly reported Demo Mode unavailability (subject extraction kept a trailing "?" — cosmetic, IDEA-057)
- Demo Mode goal execution ("take a screenshot") still completes correctly with `contextUsed: []` — confirms this session's changes to shared `GoalExecutionSummary`/`toSummary()` didn't regress Sessions 19–21's verified Demo Mode behavior

**Not yet done / caveats (honest, not simulated)**:
- No tool enumerates real desktop state beyond the clipboard — no running-window-list tool exists (IDEA-055)
- Context doesn't yet influence WHICH skill the planner selects, only how richly an already-selected skill's agent steps are grounded (IDEA-056)
- No live verification of any collector against real Projects/Tasks/Meetings/Documents/GitHub/Memory data — verified by code review and the type system only (IDEA-058, highest-priority open item alongside IDEA-053)

### Session 23: MCP Integration — external systems as first-class Skills (2026-07-21)

Built a production-ready MCP Client Layer so Knottix can treat external Model Context Protocol servers as external skill/context/prompt providers — no new AI, no duplicate execution mechanism. See DEC-043 for the full architecture.

**MCP — new module** (`src/lib/mcp/`, the mission's one explicitly-scoped new module):

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Types | `types.ts` | `MCPServerRecord`/`MCPServerInfo` (server + live tools/resources/prompts), descriptors, call log entries |
| Client | `client.ts` | Real `@modelcontextprotocol/sdk` handshake (`connectMCPClient`) and capability fetch (`fetchServerCapabilities`) over stdio/SSE/HTTP |
| Manager | `manager.ts` | `globalThis`-anchored live-connection map, `discoverAndConnectServers`/`refreshMCPServers`/`connectMCPServer`/`disconnectMCPServer`, `callMCPTool`/`readMCPResource`/`getMCPPrompt` — every call logged via `loggedCall()` |
| Skills | `skills.ts` | `registerMCPToolsAndSkills()` — every tool becomes a real Tool Engine tool and, where composable, a real org-scoped Skill |
| Tools | `tools.ts` | `mcp_get_prompt` — a generic, logged Tool Engine tool for requesting MCP prompts |
| Explain | `explain.ts` | `explainRecentMCPToolChoice()` — answers "why did you choose this MCP tool?" from the real Memory Engine record of the last goal that used one |
| Demo guard | `demo-guard.ts` | `assertMCPAvailable()` — real external connections can't be honestly simulated |
| Queries | `db/queries/mcp-server.ts` | CRUD + encrypted auth token handling (same `encryptSecret`/`decryptSecret` GitHub PATs use) + call log recording |

**Goal Engine integration** — `goal-engine/planner.ts`'s new `discoverBest()` merges the static `getSkillIndex()` catalog with the calling organization's own `SkillEngine` (which includes its connected MCP servers' skills) before picking the top match, explicitly filtered by `organizationId` — "Local Skills and MCP Skills without knowing the difference" without ever mixing tenants.

**Context Engine integration** — a new `mcp-resource` collector (`context-engine/collectors.ts`) scores every connected server's (already-cached) resource descriptors against the query first, and only fetches the handful that rank as relevant — every resulting item traceable to its originating server.

**Cross-tenant safety — four bugs caught and fixed during this session's own implementation and verification, before any user ever saw them:**
1. MCP skills registering into the shared, global `getSkillIndex()` (would leak across every organization) — fixed by registering into the org-scoped `SkillEngine` only.
2. The registered Tool Engine tool name keyed on `server.name` (two orgs naming a server identically would collide) — fixed by keying on `server.id` (a UUID).
3. The registered skill omitting `organizationId` (defaults into the registry's shared "global" bucket) — fixed by setting it explicitly.
4. `discoverBest()`'s call to the org `SkillEngine.discover()` passing no filter at all (silently bypassing fixes 1–3 at this specific call site) — fixed by threading `organizationId` through `discoverBest()`/`planGoalHeuristic()`/`planGoal()`.

**Command Center + Mission Control**: new `mcp:*` `TOOL_KEYWORDS` (list/refresh/tools/explain/use), handled in `command-center/engine.ts`'s `runMCPStep()`; `/mcp` (Mission Control) — Server Registry cards, per-server tools/resources/prompts, Add/Refresh/Remove, Recent Calls feed; new routes `GET/POST /api/mcp/servers`, `DELETE .../[serverId]`, `POST .../[serverId]/refresh`, `POST .../refresh`, `GET /api/mcp/calls` — all gated on the existing `integrations:*` permissions, zero new permissions.

**Two more bugs caught during live verification (not code review alone):**
1. `resolveNavigation()`'s loose substring match meant "Show connected MCP servers" (the mission's own example) matched the generic `/mcp` nav item before ever reaching the `mcp:list` tool — fixed with a narrow override in `heuristicClassify()` scoped only to `/mcp`.
2. `mcp:list`'s keywords included the bare "mcp servers" substring, which "Refresh MCP servers" also satisfied and, being earlier in the array, silently won — fixed by removing the over-generic keyword and reordering.

**Verified**:
- `npx tsc --noEmit` — 0 errors; `npx next build` — compiles clean, 51 routes (added `/mcp`, `/api/mcp/servers`, `/api/mcp/servers/[serverId]`, `/api/mcp/servers/[serverId]/refresh`, `/api/mcp/servers/refresh`, `/api/mcp/calls`)
- `/mcp` renders correctly in the running dev server and honestly declines in Demo Mode
- All five of the mission's own Command Center example phrases ("Show connected MCP servers", "Refresh MCP servers", "What tools are available?", "Use the Figma MCP", "Why did you choose this MCP tool?") tested live against `/api/command-center` — each classifies as `tool` intent, resolves to its intended `mcp:*` step, and honestly reports Demo Mode unavailability

**Not yet done / caveats (honest, not simulated)**:
- No real external MCP server or database connection verified — `prisma migrate status` confirms `P1001: Can't reach database server` in this environment, same standing constraint as every database-dependent feature since Session 10 (IDEA-059, same priority class as IDEA-053/058)
- `mcp:use` confirms a server is connected/available but doesn't itself execute a named tool call (IDEA-060)
- `mcp_get_prompt` has no real caller yet — AI Employees can't spontaneously invoke it mid-conversation until the real tool-calling loop (IDEA-016) exists (IDEA-061)

## Auth Flow

```
Login Form → Server Action (Zod validate) → signIn('credentials')
  → authorize callback (find user, verify password, check status)
  → JWT callback (resolve member → org → role → permissions)
  → Session callback (map token to session)
  → Redirect to /command

Every request:
  → Middleware reads JWT (Edge-safe config only)
  → authorized callback checks authentication
  → Custom middleware checks route permission
  → Server component/action uses auth() for session
```

## Permission Resolution

```
User (email login)
  → Member (first active org membership)
    → Role (with isFounder flag)
      → RolePermission[] (with scope)
        → Permission[] (resource:action keys)
          → string[] embedded in JWT
```

## Known Assumptions

1. pgvector extension is available on the target PostgreSQL instance
2. Embedding dimension is 1536 (adjustable when provider is chosen)
3. `Unsupported("vector(1536)")` fields require raw SQL for vector operations
4. Integration credentials stored as Json — will need encryption before production
5. JWT permissions are refreshed only on login — role changes require re-login (see IDEA-002)
6. Multi-org users log into their first active membership — org switcher is future work (see IDEA-003)

## Current State

- Complete Prisma schema (38 models, 30 enums) — validated
- Complete auth system (config, middleware, session, permissions) — Edge Runtime fix applied (DEC-018)
- Auth config split: `auth.config.ts` (Edge-safe) + `config.ts` (full, Node.js only)
- Login page with form and server action — renders clean on port 3955
- Logout action with audit logging
- Seed script for org, workspace, roles, permissions
- Founder creation CLI script
- Environment validation system (Zod-based)
- Structured error system (`AppError` with error codes)
- Server action response helpers (`actionHandler`, `success`, `fail`)
- Structured JSON logger
- Input validation schemas (uuid, slug, email, pagination, password)
- Security utilities (sanitize, slug generation, token generation)
- Formatting utilities (date, currency, relative time)
- Request context extraction (IP, User-Agent)
- Audit log service (fail-safe)
- Complete entity resolution queries (Organization, Workspace, Member, Department, Team, Role)
- Enhanced permission guards (org access, workspace access, multi-permission checks)
- **Knottix Kernel** — complete (DEC-023)
- **AI Runtime** — complete (DEC-024)
- **Memory Engine** — complete (DEC-025)
- **Intelligence Platform** (Prompt Engine, Tool Engine, Agent Framework, Workflow Foundation, Context Builder) — complete (DEC-026)
- **Persistence layer** — complete for all 7 required subsystems (DEC-027): Prompt/Tool/Agent/Workflow registries (write-through decorators), Memory Engine (full Prisma replacement), Feature Flags (persisted decorator), Provider Configuration (Integration-backed repository)
- **Anthropic provider adapter** — complete, fetch-based, streaming supported (DEC-027). OpenAI adapter-ready stub in place.
- **AI Employee Platform** — complete (DEC-030): 7 registered AI Employees (Founder Executive Assistant, Developer AI, Designer AI, Project Manager AI, Marketing AI, Content AI, Sales AI), AI Directory (`/agents`) + generalized per-employee chat (`/agents/[key]`) + generalized API route (`/api/agents/[key]`)
- **System bootstrap composition root** — Kernel + AI Runtime + Memory Engine + Intelligence Platform now actually instantiated together for the first time (`src/lib/system/bootstrap.ts`)
- TypeScript compiles clean (`tsc --noEmit` passes)
- `npm run lint` still broken by a pre-existing dependency issue (IDEA-008) — unrelated to this session
- Dev server boots clean (only expected `MissingSecret` until `.env` is configured)
- No database provisioned — schema is migration-ready but no `DATABASE_URL` connects to a live instance; `prisma generate` succeeds (schema-only, no DB connection required)
- No migrations generated/applied yet
- **Mission Control + Workspace application shell** — complete (DEC-029): Sidebar, Topbar, Command Palette, Breadcrumbs, Workspace Switcher, Notification Bell, Profile Menu, all founder/employee screens listed in Session 11 above
- `/clients`, `/creative`, `/finance`, `/team` remain empty shells and unstyled — out of this session's explicit scope (not listed in the visual-polish brief either)
- `next build` passes (26 routes, one route replaced: `/api/agents/founder-assistant` → `/api/agents/[key]`); no live database means no screen or AI Employee has been exercised against real rows yet
- **Premium visual layer** — complete (DEC-031): glass/gradient/glow CSS utilities, `PageHeader`/`Reveal`/`RevealGroup`/`RevealItem` shared components, shimmer skeletons, animated empty states, sectioned Sidebar with sliding active-pill, spotlight-style Command Palette, redesigned Mission Control (hero + Today's Focus + Company Health + AI Status + Recent Activity + Upcoming Meetings + Knowledge Highlights), premium AI Directory cards, and a real chat-bubble AI Console with a dependency-free markdown renderer and typing indicator
- **Demo Mode** — complete: `NEXT_PUBLIC_DEMO_MODE=true` swaps Mission Control, Projects (now card-based), Tasks, Meetings, Workspace/My Work, Calendar, AI Directory, AI Chat, Knowledge, Activity, Notifications, and System Health to realistic fixture data via `src/lib/demo/`; `false`/unset leaves every screen on its real data path unchanged. A "Demo Mode" badge shows in the Topbar when active.
- **Live-demo presentation layer** — complete (DEC-032): Splash Screen, Page Transitions, ripple/counter micro-interactions, Command Palette recents, System Status strip, Presentation Mode, Quick Actions, redesigned Login, AI Chat streaming/copy/regenerate
- **Demo Mode login bypass** — complete (DEC-033): `NEXT_PUBLIC_DEMO_MODE=true` now makes the entire app clickable with zero database — `getCurrentUser()` falls back to a synthetic Founder session, `DashboardLayout`'s org/workspace lookups route through `withDemo()`, and `.env` has a real `AUTH_SECRET` for the first time
- **Nav-icon server/client boundary bug** (pre-existing since Session 11, first surfaced Session 15) — fixed: `AppShell` now computes `navItems` client-side from a `permissions: string[]` prop instead of receiving `NavItem[]` (icon function references) from the server `DashboardLayout`
- **First real browser click-through since Session 10** — Login → Mission Control → AI Chat verified live in the Browser pane, not just by compiler/build output
- **GitHub Integration** — complete (DEC-034): first real consumer of the `Integration` model, credential encryption (`src/lib/crypto/encryption.ts`), fetch-based GitHub API client, 8 Tool Engine tools registered on Developer AI (11 tools total), Integrations UI (index/status/connect/disconnect/Repository Browser/Repository Detail), Mission Control GitHub widget, full Demo Mode fixtures — `next build` passes with 29 routes
- `INTEGRATION_ENCRYPTION_KEY` now required in `.env` for any integration credential encrypt/decrypt to work — set locally for this session's demo build
- **Command Center** — complete (DEC-035): full-screen intent-routing command palette replacing the old lightweight Command Palette (deleted), classifies Navigation/Search/Tool/Workflow/Conversation/Information via a client-safe heuristic router with an optional AI-classification upgrade, executes via direct `toolEngine.execute()`/`intelligence.agents.execute()` calls (no new execution layer), real Confirmation Card gate, Mission Control Recent/Favorite Commands widget, `zustand`-persisted history — `next build` passes with 30 routes
- `ai-employees.ts` client/server boundary fixed (DEC-036) — employee keys are now literals, not imports from server-only files; this makes the config file safely importable from any future client component, not just the Command Center
- **Desktop Runtime** — complete (DEC-037): real Windows OS automation (apps, clipboard, screenshot, window focus), allowlisted git/dev tools (no unrestricted shell), real Playwright browser automation on an isolated Chrome profile, WhatsApp/Instagram tools (WhatsApp send confirmation-gated, never automatic), real STT/TTS voice pipeline wired into the existing Command Center — `next build` passes with 32 routes; `playwright` added as a new dependency
- Command Center confirmation gate now holds in Demo Mode too (DEC-038), and `planCommand()` now correctly hydrates the Tool Registry/prompts in real mode (a Session 17 gap masked by every Session 17 test running in Demo Mode)
- **Goal Execution Engine** — complete (DEC-039): Workflow Engine gained real `tool`/`agent`/`prompt` step handlers and pause/resume for confirmation-gated steps (closing IDEA-036), a new `src/lib/goal-engine/` module plans free-text goals into real `WorkflowDefinition`s, executes/pauses/resumes/retries them for real, a `/goals` Live Execution Panel polls live task-graph state, and the Command Center routes goal-shaped commands to it
- **Skill Registry** — complete (DEC-040): a new `src/lib/skills/` module (registry/discovery/access/engine, Prisma-backed metadata persistence mirroring `AITool`) with 17 real skills across Development/Business/Desktop/Browser, every one backed by an already-registered tool or AI Employee. The Goal Engine's planner now composes plans from live skill discovery instead of a fixed template switch (`templates.ts` deleted), the AI-upgrade path selects from a live skill list with zero prompt changes needed for new skills, and self-evaluation stats (`getSkillStats()`) derive entirely from already-persisted `WorkflowExecution` rows — no new stats table. `/skills` shows every skill's real dependencies and (in real mode) live usage/success-rate stats — `next build` passes with 36 routes; single-skill and multi-skill composed goals both live-verified end to end in Demo Mode
- **Task Sessions** — complete (DEC-041): the Workflow Engine gained real crash recovery (persists on pause, `WorkflowExecutor.resume()` rehydrates from the database when the in-memory paused state is gone — fixes IDEA-042's core claim), a new `src/lib/task-sessions/` module wraps one or more Goal Execution rounds into a persisted, restart-recoverable `TaskSession`, real artifact extraction from step outputs, memory of session outcomes/patterns, a `/task-sessions` Mission Control page, and Command Center control phrases ("Continue my website", "Resume ACCD", "Show active work", "Pause current session") — `next build` passes with 39 routes; honestly unavailable in Demo Mode by design (requires a real database), so this session's verification is `tsc`/`next build`/code review only
- **Context Engine** — complete (DEC-042): a new `src/lib/context-engine/` module collects real context from 13 sources (Memory, Knowledge, Projects, Tasks, Meetings, Documents, GitHub, Task Sessions, Workflow History, Skill History, Artifacts, Browser State, Desktop State), ranks by relevance/freshness/trust, and folds the top results into every Goal Execution's 'agent' step inputs before execution starts; Task Sessions gained a persisted, evolving Working Context; the Command Center answers "What do you know about X?"/"Why did you choose this context?" from it directly; `/context` (Context Inspector) shows every source, selected item, rejected item, score, and reason — `next build` passes with 40 routes; Command Center routing and Demo Mode decline verified live, no collector verified against real data yet
- **MCP Integration** — complete (DEC-043): a new `src/lib/mcp/` module (real `@modelcontextprotocol/sdk`-driven Client Manager over stdio/SSE/HTTP, `MCPServer`/`MCPCallLog` Prisma models, encrypted auth tokens) makes external MCP servers first-class — every connected server's tools become real Tool Engine tools and, where composable, real Skills the Goal Engine plans from identically to local skills; a new `mcp-resource` Context Engine collector retrieves and traces real server resources; `mcp_get_prompt` lets prompts be requested with logging; `/mcp` (Mission Control) shows the Server Registry, health, latency, tools/resources/prompts, and recent calls; Command Center handles all five of the mission's own example phrases. Three chained cross-tenant multi-tenancy bugs and two Command Center router bugs were caught and fixed during this session's own implementation/live-verification, not reported by a user — see DEC-043 points 3 and 7. Closes IDEA-018. `next build` passes with 51 routes; Demo Mode decline and all five Command Center phrases verified live against the running dev server; no real external MCP server or database connection verified yet (IDEA-059)

## Next Step

**Next milestone: Provision database + apply migration + live verification**
1. Provision PostgreSQL database (Neon recommended) and set `DATABASE_URL`
2. Generate and run initial migration (`prisma migrate dev`) — will create all tables including the Session 10 schema additions (`PromptTemplateRevision`, `AIMemoryRevision`, `AIMemorySnapshot`, `AITool`, and the extended `AIAgent`/`PromptTemplate`/`AIMemory` columns)
3. Run seed script (`npm run db:seed`)
4. Create founder user (`npm run db:create-founder <email> <password> <name>`)
5. Set `ANTHROPIC_API_KEY` in `.env` and manually click through every Mission Control / Workspace screen, and every one of the 7 AI Employees, against a live database — this session's build/type verification is not a substitute for seeing real data render or a real model call succeed
6. Fix the ESLint dependency chain (IDEA-008) so `npm run lint` actually runs
7. Implement the real tool-calling loop (IDEA-016) if/when an AI Employee needs parameterized, model-driven tool invocation beyond the current zero-argument auto-resolution
8. Decide on and build (or explicitly decline) Bookmarks and a dedicated My Files screen (IDEA-022, IDEA-023)
9. Build out Clients/Creative/Finance/Team modules if/when a future mission scopes them
10. ~~For tomorrow's demo specifically: set `NEXT_PUBLIC_DEMO_MODE=true` ... confirm login still works against a real database~~ — superseded by Session 15's Demo Mode login bypass (DEC-033): with `NEXT_PUBLIC_DEMO_MODE=true`, login no longer needs a database at all
11. After the demo, remember to unset `NEXT_PUBLIC_DEMO_MODE` (or set it to `false`) before any real usage, so real organizational data — and real authentication — is used again
12. Consider per-employee Workflow definitions (IDEA-026) — the mission asked for "Suggested Workflows" per employee; these currently ship as descriptive text in the AI Directory, not registered `WorkflowDefinition`s
13. Before a database is provisioned: the newly-polished screens still render against real empty states when `NEXT_PUBLIC_DEMO_MODE=false` — the visual layer and the demo bypass are ready, but empty-state real usage still undersells the product (IDEA-028)
14. Wire real Kernel/Memory/AI Runtime health into `StatusStrip` once a database is provisioned (IDEA-029)
15. Build the real password-reset flow so "Forgot password?" does something beyond an inline notice (IDEA-006, reaffirmed by IDEA-030)
16. Decide the long-term fate of the Demo Mode login bypass once a real database and seeded founder user exist — keep it as a permanent "try before you sign up" path, or restrict it to non-production environments only (IDEA-031)
17. Once `ANTHROPIC_API_KEY` is configured, verify Developer AI actually produces coherent answers for the six new GitHub-reasoning capabilities (explain commits, summarize PRs, analyze activity, detect inactive repos, weekly summary, release summary) from the auto-resolved tool context — not yet exercised against a real model call (IDEA-034)
18. Connect a real GitHub account (a real Personal Access Token) once this is tested outside the sandboxed dev environment, to verify the encryption round-trip and live GitHub API calls end-to-end, not just via Demo Mode and type-checking
19. Build the GitHub OAuth App connect flow if a org-wide OAuth grant becomes preferable to a per-founder Personal Access Token (IDEA-032)
20. Add a caching/mirroring layer for GitHub data before real team-scale usage — today only a 30-second in-process cache bounds repeated calls within one AI Chat turn (IDEA-033)
21. Once `ANTHROPIC_API_KEY` is configured, verify the Command Center's real AI-classification path (`classify.ts`) against live model calls — every test this session went through the heuristic path (IDEA-035)
22. Build real `tool`/`agent`/`prompt` Workflow Engine step handlers and register at least one real `WorkflowDefinition`, then migrate the Command Center's "Workflow" intent off direct sequenced `toolEngine.execute()` calls onto `workflowEngine.execute()` (IDEA-036)
23. Build real write/mutation tools (starting with `create_project`, `assign_task`) so the Command Center's Confirmation Card can execute something real outside Demo Mode — the highest-priority open gap, since "create a project" is the mission's own first example command (IDEA-037)
24. Log into WhatsApp Web and Instagram inside the dedicated Knottix browser profile (`~/Knottix/BrowserProfile`) and send one real confirmed test message end-to-end — not yet exercised against a real account (IDEA-041)
25. Configure `DEEPGRAM_API_KEY`/`OPENAI_API_KEY` and `ELEVENLABS_API_KEY`, then test the real STT/TTS pipeline and the client-side "Hey Knottix" wake-phrase loop with a real microphone — not yet exercised against real audio hardware (IDEA-041)
26. Consider a dedicated acoustic wake-word engine (e.g. Picovoice Porcupine) if continuous voice listening sees real sustained usage — today's STT-based wake-phrase detection costs a real API call per ~4-second chunk (IDEA-039)
27. Add a structural link (generated manifest or a test) between each tool's `metadata.requiresConfirmation` and the Command Center router's `CONFIRMATION_REQUIRED_TOOLS` set so the two can't silently drift apart as new mutating tools are added (IDEA-040)
28. ~~Once `ANTHROPIC_API_KEY` is configured, verify the Goal Execution Engine's AI-upgraded template classification...~~ — superseded by IDEA-050 (Session 20 replaced fixed-template classification with skill classification)
29. ~~Persist paused (`WAITING_CONFIRMATION`) workflow/goal execution state to the database...~~ — resolved (Session 21, DEC-041): `WorkflowExecutor` now persists on pause and rehydrates on resume; IDEA-042's in-memory-state-manager-only gap remains for actively-*executing* (not paused) state — see IDEA-051
30. Audit other module-level singletons (`getSystem()`'s `systemPromise`, `WorkflowExecutor`'s `pausedExecutions`/`stepHandlers`) for the same Turbopack dev-mode cross-route module-isolation risk `demoExecutions` hit this session, applying the same `globalThis` anchor wherever real (IDEA-043)
31. Root-cause the pre-existing duplicate-DOM-render issue found on every dashboard page during this session's live verification (confirmed on `/agents` and `/goals` both) — doesn't affect what users see, but breaks browser-automation testing reliability (IDEA-044)
32. Resume the interrupted WhatsApp Web send test — `whatsapp_open`/`whatsapp_find_contact` confirmed working live against a real logged-in account this session (selector bug fixed), but `whatsapp_type_message`/`whatsapp_preview_message`/`whatsapp_send_message` still need a real, confirmed end-to-end send test (IDEA-041 update)
33. Once `ANTHROPIC_API_KEY` is configured, verify the Skill Classifier's AI-upgrade path and the newly-registered skills' agent steps (`engineering-summary`, `project-status-report`, `proposal-draft`, `content-draft`, `website-plan`) against real model calls (IDEA-050)
34. Wire real success-rate stats (`getSkillStats()`) into skill discovery's ranking so "prefer the highest-success skills" is enforced automatically, not just surfaced informationally in `GoalPlan.reasoning` (IDEA-048)
35. Once a real database exists: actually start a Task Session, pause it on a confirmation, kill and restart the Node process, and confirm it resumes correctly — the one thing that would fully validate Session 21's central "survives a restart" claim, currently verified only by code review (IDEA-053)
36. Add mid-step reconciliation for non-idempotent steps (e.g. checking real `git status` before retrying a `git_push` that might have landed right before a crash) — closes the remaining slice of IDEA-051 that persisted pause-state recovery doesn't cover
37. Teach `continueTaskSession()`'s multi-round path to summarize what prior rounds already completed into the next round's planning input, so re-running a session doesn't blindly redo non-idempotent skills (IDEA-052)
38. Add disambiguation to `findActiveTaskSessionByKeyword` when more than one active session matches — currently silently picks the most recently updated (IDEA-054)
35. Thread one composed skill's real output into the next skill's input for multi-skill goals, instead of every skill only ever seeing the original goal text (IDEA-049, generalizes IDEA-045)
39. Once a real database exists: verify every Context Engine collector actually returns correct, well-scored real data (Memory, Projects, Tasks, Meetings, Documents, GitHub, Task Sessions, Workflow History, Skill History, Artifacts) — currently verified only by code review and the type system (IDEA-058, same priority class as IDEA-053)
40. Add a `list_running_windows` Desktop Runtime tool so the Context Engine's `desktop` collector can report more than just clipboard contents (IDEA-055)
41. Extend `SkillDiscovery.discover()` to accept collected context and weight skill selection by it, not just enrich already-selected agent steps — matches the mission's literal Context Collection → Ranking → Planning pipeline order more closely (IDEA-056)
42. Strip trailing punctuation in `context:explain`'s subject extraction ("ACCD?" → "ACCD") (IDEA-057, cosmetic)
43. Once a real database AND a real external MCP server exist: connect one for real, verify the actual handshake/`listTools`/`listResources`/`listPrompts`/encrypted-token round-trip, and re-verify the `mcp-resource` Context Engine collector against live server data — currently verified only by code review, `tsc`, `next build`, and live Command Center routing in Demo Mode (IDEA-059, same priority class as IDEA-053/058)
44. Implement the real tool-calling loop (IDEA-016) so AI Employees can spontaneously call `mcp_get_prompt` mid-conversation instead of only via an explicit workflow step (IDEA-061)
45. Consider wiring `mcp:use` to also execute a named tool call inline, once a safe way to parse "which tool, which arguments" out of free text exists beyond the current 0-or-1-required-param auto-extraction (IDEA-060)
