# Knottix — Improvement Ideas

Ideas identified during implementation that should NOT be acted on until explicitly approved.

---

## IDEA-001: Rate limiting middleware

**Identified**: Session 4 (Auth)
**Area**: Security
**Description**: Add rate limiting to the login endpoint to prevent brute-force attacks. Options: `express-rate-limit` equivalent for Next.js, or a custom in-memory/Redis-backed limiter on `/api/auth/callback/credentials`. Should limit by IP and by email independently.
**Priority**: High — should be addressed before production deployment.

---

## IDEA-002: Session invalidation on role/permission change

**Identified**: Session 4 (Auth)
**Area**: Authorization
**Description**: Currently, JWT tokens are enriched with permissions at login time. If an admin changes a user's role or permissions, the change only takes effect after the user's JWT expires or they re-login. Consider adding a mechanism to invalidate active sessions when permissions change — either via a short JWT maxAge with frequent refresh, or a database-backed session version check.
**Priority**: Medium — acceptable for initial internal use, important before multi-org scale.

---

## IDEA-003: Organization switcher

**Identified**: Session 4 (Auth)
**Area**: Multi-org
**Description**: Users with memberships in multiple organizations currently log into their first active membership. An organization switcher in the UI would allow switching context without re-authentication. The JWT would need to be refreshed with the new org/member/role/permissions.
**Priority**: Low — only needed when multiple organizations are active.

---

## IDEA-004: Integration credential encryption

**Identified**: Session 3 (Data Layer)
**Area**: Security
**Description**: Integration credentials stored as Json need an encryption layer before production. Consider using `aes-256-gcm` with a per-org encryption key derived from a master key. The `Setting.isEncrypted` field is already in place.
**Priority**: High — required before any third-party integrations are connected.

---

## IDEA-005: Audit logging for auth events

**Identified**: Session 4 (Auth)
**Area**: Security / Compliance
**Description**: Login, logout, failed login attempts, password changes, and role changes should be logged to AuditLog. The schema supports it (AuditAction has LOGIN, LOGOUT, ROLE_CHANGE). Implementation should be added when the audit system is built in Phase 6.
**Priority**: Medium — security best practice, not blocking for development use.

---

## IDEA-006: Email verification and password reset flows

**Identified**: Session 4 (Auth)
**Area**: Authentication
**Description**: The VerificationToken model and password hashing utilities are in place. Full email verification (send token → verify → activate) and password reset (request → email → reset form) flows need email sending infrastructure (Resend, SES, or SMTP). Implement when email integration is added.
**Priority**: Medium — internal tool can bootstrap users via CLI for now.

---

## IDEA-007: MFA (Multi-Factor Authentication)

**Identified**: Session 4 (Auth)
**Area**: Security
**Description**: The auth system is designed for future MFA compatibility. TOTP (authenticator app) is the recommended first step. Requires: a `mfaSecret` field on User, a VerificationToken type for MFA setup, and a challenge step between credential validation and session creation.
**Priority**: Low — nice to have for an internal tool, important if external users are added.

---

## IDEA-008: Fix ESLint dependency chain

**Identified**: Session 5 (Backend Foundation)
**Area**: Developer Experience
**Description**: ESLint fails with `Cannot find module 'es-abstract/2024/AddEntriesFromIterable'` — a transitive dependency of `eslint-plugin-react` via `object.fromentries`. The `eslint-config-next` package pulls in an older `eslint-plugin-react` that depends on a version of `object.fromentries` incompatible with the installed `es-abstract`. Fix: either pin `es-abstract` or update `eslint-plugin-react`, or switch to the flat ESLint config that `eslint-config-next@16` supports.
**Priority**: Medium — does not block development (TypeScript is the primary type gate) but blocks lint-staged pre-commit hooks.

---

## IDEA-009: Persistent usage tracking via database

**Identified**: Session 7 (AI Runtime)
**Area**: AI Runtime
**Description**: The current usage/cost/token trackers are in-memory — data is lost on server restart. When the database is provisioned, wire the `UsageTracker.record()` method to persist `UsageRecord` entries to the `AILog` Prisma model. This enables historical cost analysis, per-org billing, and usage dashboards. The in-memory tracker remains useful for request-scoped aggregation; the database write should be fail-safe (like audit logs).
**Priority**: Medium — required before production AI usage, not needed during development.

---

## IDEA-010: Provider adapter implementations — PARTIALLY RESOLVED (Session 10)

**Identified**: Session 7 (AI Runtime)
**Area**: AI Runtime
**Resolved (Anthropic only)**: Session 10 — `src/lib/ai/providers/anthropic.ts` is a complete `AIProvider` implementation using native `fetch` (no SDK dependency added, per coding-rules.md rule 14 — the Messages API is a plain HTTPS JSON/SSE endpoint). `src/lib/ai/providers/openai.ts` is adapter-ready (registers, reports availability, participates in health/fallback) but not functionally complete — see IDEA-019. Google/OpenRouter remain unimplemented.
**Priority**: High for OpenAI completion (IDEA-019); Low for Google/OpenRouter until a concrete need arises.

---

## IDEA-011: AI Runtime Kernel module registration

**Identified**: Session 7 (AI Runtime)
**Area**: Integration
**Description**: The AI Runtime should register itself as a Kernel module via `ModuleDefinition`, exposing the runtime as a service through the Kernel's DI container. This allows other modules to access AI capabilities through `kernel.container.resolve(AI_RUNTIME_TOKEN)` instead of direct imports. Implement when the Kernel boot sequence is wired up at application startup.
**Priority**: Medium — needed when the first module consumes AI services.

---

## IDEA-012: Persistent memory store via Prisma — RESOLVED (Session 10)

**Identified**: Session 8 (Memory Engine)
**Resolved**: Session 10 — `createPrismaMemoryStore()` in `src/lib/memory/stores/prisma-memory-store.ts`, backed by the `AIMemory` model (extended with namespace/scopeId/title/version/status/references) rather than `Knowledge` — a better structural fit since `Knowledge` lacked versioning and namespace fields entirely. The in-memory store remains for testing (DEC-027).
**Priority**: N/A — done.

---

## IDEA-013: Memory Engine Kernel module registration

**Identified**: Session 8 (Memory Engine)
**Area**: Integration
**Description**: The Memory Engine should register itself as a Kernel module via `ModuleDefinition`, exposing it through the DI container. Other modules would access memory through `kernel.container.resolve(MEMORY_ENGINE_TOKEN)`. Similar to IDEA-011 for AI Runtime. Implement when the Kernel boot sequence is wired up.
**Priority**: Medium — needed when the first module consumes memory services.

---

## IDEA-014: Memory deduplication

**Identified**: Session 8 (Memory Engine)
**Area**: Memory Engine
**Description**: The memory-system spec calls for deduplication at 0.95 similarity threshold. This requires embeddings and vector comparison, which are outside the current Memory Engine scope. When the embedding/vector layer is added, implement a pre-write dedup check in the engine's `create()` method that queries for similar entries in the same namespace/scope and either merges or rejects duplicates.
**Priority**: Medium — prevents knowledge bloat, but requires the embedding layer first.

---

## IDEA-015: Persistent stores for Prompt/Tool/Agent/Workflow registries — RESOLVED (Session 10)

**Identified**: Session 9 (Intelligence Platform)
**Resolved**: Session 10 — write-through decorators for Prompt/Agent/Workflow registries, metadata-only decorator for Tool Registry (handlers can't be persisted), all following one consistent pattern (DEC-027). See `src/lib/{prompt,tools,agents,workflows}/persistence/`.
**Priority**: N/A — done. Follow-up: none of these decorators have been exercised against a real, migrated database yet (no `DATABASE_URL` provisioned) — see the Next Step in project-status.md.

---

## IDEA-016: Real tool-calling loop in the Agent Execution Pipeline — PARTIALLY RESOLVED (Session 10)

**Identified**: Session 9 (Intelligence Platform)
**Area**: Agent Framework
**Description**: The Agent Execution Pipeline still does not implement true multi-turn, model-driven function calling — `AgentExecutionResult.toolCalls` is still always an empty array. What Session 10 added instead (DEC-028): the agent's zero-required-parameter tools are auto-executed and folded into prompt context *before* the AI Runtime call ("Tool Resolution" per the mission's pipeline diagram). This covers the Founder Executive Assistant's needs (all 4 of its tools are zero-argument, read-only) but not a general case where the model needs to decide, mid-conversation, to call a *parameterized* tool based on the user's question. Implementing that still requires: (1) provider-specific function-calling wiring — the Anthropic adapter (`src/lib/ai/providers/anthropic.ts`) does not yet parse `tool_use` content blocks or send `tools` in the request body, (2) a loop in the pipeline that executes tool calls via the Tool Engine and feeds results back as follow-up messages, (3) a step limit / cost guard.
**Priority**: Medium — no current agent needs it (the Founder Assistant's tools are all zero-argument), but any future agent needing parameterized, on-demand tool use will require it.

---

## IDEA-017: Automatic memory capture from agent runs

**Identified**: Session 9 (Intelligence Platform)
**Area**: Agent Framework / Memory Engine
**Description**: `memory-system.md` specifies that useful agent outputs should be written to memory (source type `AGENT`), either by explicit user action or agent decision. The Agent Execution Pipeline currently does not write anything to memory after a successful run — this was deliberately left out of Sprint 2 as business logic. When the first real business agent is built, wire a post-execution hook (via `AGENT_EVENTS.EXECUTION_COMPLETED`) that decides whether to persist the result as a memory entry.
**Priority**: Medium — depends on the first real agent existing; not needed for the framework itself.

---

## IDEA-018: MCP SDK integration for the Tool Engine — RESOLVED Session 23

**Identified**: Session 9 (Intelligence Platform)
**Area**: Tool Engine
**Description**: `ToolDiscovery.toDescriptor()` produces `{ name, description, inputSchema }` objects shaped to match the Model Context Protocol's tool descriptor format, but there is no actual MCP server/client wiring — Sprint 2 explicitly excluded external integrations. When Knottix needs to expose tools to an external MCP-compatible client (or consume external MCP tool servers), add an adapter layer that translates between `ToolDescriptor`/`ToolExecutor` and the `@modelcontextprotocol/sdk` types.
**Resolution**: Session 23 built `src/lib/mcp/` — a real MCP Client Manager (discover/connect/authenticate/monitor/reconnect over stdio/SSE/HTTP), with every connected server's tools registered as real Tool Engine tools and, where composable, real Skills. See DEC-043. The descriptor-shape compatibility noted here turned out academic; the actual work was the connection lifecycle and cross-tenant safety, not the descriptor translation.
**Priority**: Resolved.

---

## IDEA-019: OpenAI provider adapter completion

**Identified**: Session 10 (Persistence Layer + Founder Executive Assistant)
**Area**: AI Runtime
**Description**: `src/lib/ai/providers/openai.ts` is adapter-ready (registers, reports real availability, participates in health/fallback) but `complete()`/`stream()` throw a clear not-implemented error. Complete it by mapping `AIRequest`/`AIResponse` to OpenAI's Chat Completions API (`POST /v1/chat/completions`), following the same fetch-based, no-new-dependency approach used for the Anthropic adapter.
**Priority**: High — this is the last piece needed for genuine multi-provider fallback (DEC-003/DEC-024) to actually work; today a Claude outage has no working fallback.

---

## IDEA-020: Multi-org provider configuration is last-write-wins on a shared provider instance

**Identified**: Session 10 (Persistence Layer + Founder Executive Assistant)
**Area**: AI Runtime / Provider Configuration
**Description**: `ProviderConfigRepository` persists per-organization provider config overrides (baseUrl/timeoutMs/maxRetries/rateLimitRpm) to the `Integration` model, and `ensureOrganizationReady()` applies an organization's override by re-registering the (process-wide, singleton) Anthropic provider with the merged config. Since the Provider Registry holds exactly one shared instance per provider ID, the *last* organization to become "ready" in a given process wins — there is no per-organization provider instance. This is fine for the current single-tenant deployment (4 Knotts only) but will silently misbehave the moment a second organization with a different provider config boots in the same process.
**Priority**: Medium — not a problem today; becomes one the moment Knottix hosts more than one organization with different provider settings. Fix by keying provider instances by `(providerId, organizationId)` in the registry, or by resolving config per-request instead of per-process.

---

## IDEA-021: Apply the Session 10 schema migration and exercise persistence against a live database

**Identified**: Session 10 (Persistence Layer + Founder Executive Assistant)
**Area**: Database / Persistence Layer
**Description**: `prisma/schema.prisma` was extended (new `PromptTemplateRevision`, `AIMemoryRevision`, `AIMemorySnapshot`, `AITool` models; new columns on `AIAgent`/`PromptTemplate`/`AIMemory`; `SettingScope.FEATURE`) and `prisma generate` succeeds, but no migration has been generated or applied against a real database (none is provisioned). Every persistence decorator built this session (`src/lib/{prompt,tools,agents,workflows}/persistence/`, `prisma-memory-store.ts`) has been verified only by TypeScript's type checker, never by an actual database round-trip. Once `DATABASE_URL` is set, run `prisma migrate dev`, then manually exercise `POST /api/agents/founder-assistant` and confirm rows actually land in `AIMemory`, `AIAgent`, `PromptTemplate`, `AITool`, and `AuditLog`.
**Priority**: High — this is the one thing that would fully close out Session 10's "end-to-end validation" claim; today it's validated at the type level and by code inspection, not by a live run. Also now covers Session 11's UI — see IDEA-024.

---

## IDEA-022: Dedicated My Files screen

**Identified**: Session 11 (Mission Control + Workspace UI)
**Area**: Employee Workspace
**Description**: `src/lib/db/queries/file.ts` (`listFilesForMember`) was written this session but has no consuming page — the mission asked for "My Files" in the Employee Experience but it was deprioritized to keep scope to a shippable MVP. Build a `/files` route listing a member's uploaded files (name, type, size, linked project, download link) using the existing `File` model and the already-written query.
**Priority**: Medium — the data layer is ready; this is pure UI work.

---

## IDEA-023: Bookmarks — no data model exists

**Identified**: Session 11 (Mission Control + Workspace UI)
**Area**: Employee Workspace
**Description**: The mission asked for a "Bookmarks" screen in the Employee Experience, but Knottix's Prisma schema has no concept of a user bookmarking an entity (project, task, document, memory entry, etc.) — there is no `Bookmark` model. Rather than fake this with client-only local storage or an empty page with no path forward, it was left out entirely this session. If bookmarks become a real requirement, add a small `Bookmark` model (`userId`, `entityType`, `entityId`, `createdAt`, unique on `[userId, entityType, entityId]`) following the same polymorphic-reference pattern already used by `Notification`/`Comment`/`Tag`, then build the query + page.
**Priority**: Low — no current user demand signal; purely speculative until requested.

---

## IDEA-024: Live-verify every Mission Control / Workspace screen against a real database

**Identified**: Session 11 (Mission Control + Workspace UI)
**Area**: UI / Database
**Description**: All 27 routes compile and type-check (`next build` succeeds), but with no `DATABASE_URL` provisioned, no page has actually rendered against real rows. Every query added or extended this session (`notification.ts`, `activity.ts`, `file.ts`, and the org-wide/assigned-to-member additions to `project.ts`/`task.ts`/`meeting.ts`/`workspace.ts`/`audit.ts`) needs to be exercised against seeded data to confirm the Prisma relation filters (e.g. `project: { workspace: { organizationId } }`, `assignments: { some: { memberId } }`) actually return the expected rows — these have only been verified by the TypeScript compiler agreeing the shapes line up, not by seeing real output.
**Priority**: High — same class of gap as IDEA-021, now covering the UI layer too. Should happen in the same pass once a database is provisioned.

---

## IDEA-025: Workspace switching requires re-authentication — not yet implemented

**Identified**: Session 11 (Mission Control + Workspace UI)
**Area**: Auth / Multi-workspace
**Description**: `WorkspaceSwitcher` (`src/components/layouts/WorkspaceSwitcher.tsx`) lists a user's real workspaces and shows which one is current, but selecting a different workspace only surfaces an inline notice — it does not actually switch, because `SessionUser.workspaceId` is baked into the JWT at login (same root cause as IDEA-002/IDEA-003 for organization switching). Implementing a real switch requires either a short-lived JWT with frequent refresh, or a database-backed "current workspace" preference read on every request instead of trusting the JWT claim.
**Priority**: Medium — same fix as IDEA-003, now confirmed to also block workspace switching, not just organization switching.

---

## IDEA-026: Register real Workflow definitions for each AI Employee's "Suggested Workflows"

**Identified**: Session 12 (AI Employee Platform)
**Area**: Workflow Engine / AI Employee Platform
**Description**: Each `AIEmployeeProfile` in `src/config/ai-employees.ts` lists `suggestedWorkflows` as plain descriptive strings (e.g. Project Manager AI: "Weekly risk scan", "Sprint planning draft"). The Workflow Engine (built in Sprint 2, persisted in Session 10) is fully capable of registering real `WorkflowDefinition`s with `agent` or `prompt` step types that invoke these employees — that wiring was not done this session to keep scope to definitions + directory + chat. A natural next step: register one real workflow per employee (e.g. a scheduled or manually-triggered "weekly risk scan" workflow whose step calls Project Manager AI and posts the result somewhere), replacing the descriptive string with an actual `workflowKey` the directory can link to and execute.
**Priority**: Medium — the Workflow Engine already supports this; it's product work, not infrastructure work.

---

## IDEA-027: Repository, Figma, and analytics integrations for Developer/Designer/Marketing AI

**Identified**: Session 12 (AI Employee Platform)
**Area**: Integrations / Tool Engine
**Description**: Developer AI, Designer AI, and Marketing AI's system prompts explicitly disclose that they have no live connection to a Git/CI system, Figma, or any analytics/ad platform (DEC-030) — their "repository analysis," "Figma-ready recommendations," and "analytics summaries" capabilities are currently conversational/reasoning-only, grounded in whatever the user pastes into the chat or what's recorded in organizational memory. The `Integration` model already supports `GITHUB` and other providers as a schema-level concept (unused). When a real need arises, add a Tool Engine tool per integration (e.g. `read_repository_file`, `list_recent_commits`) backed by an actual API client — this is new integration code, not new architecture, and should follow the same "real data only" discipline as every other tool built so far.
**Priority**: Low — no current integration credentials exist to back this; purely speculative until a real GitHub/Figma/analytics connection is configured.

---

## IDEA-028: Demo is running against empty states — provision the database before presenting

**Identified**: Session 13 (Premium visual polish pass)
**Area**: Database / Demo readiness
**Description**: Every screen restyled this session (Mission Control's hero/Today's Focus/Company Health/Knowledge Highlights, AI Directory, Projects/Tasks/Meetings/Knowledge tables and cards) reads through real query functions and the real Memory Engine — but with no `DATABASE_URL` provisioned, every one of them will render its (now much nicer-looking) empty state rather than actual organizational data. The visual work is real and complete; presenting it against an empty database undersells it and risks the audience seeing a product that looks unfinished rather than one that looks premium and populated.
**Priority**: High — directly blocks tomorrow's demo from showing what was actually built this session. Provisioning a database, running the seed script, and adding a handful of realistic projects/tasks/meetings/memory entries via the seed script or founder CLI would let the demo show the Mission Control hero, Today's Focus, and Knowledge Highlights widgets as designed.

---

## IDEA-029: Wire real Kernel/Memory/AI Runtime health into StatusStrip

**Identified**: Session 15 (Live-demo presentation polish)
**Area**: UI / System Health
**Description**: `StatusStrip` (`src/components/modules/system/StatusStrip.tsx`) shows Kernel Online, Memory Healthy, and AI Runtime Active as hardcoded `ok: true` pills — only the "Anthropic Connected" pill is a genuine signal (`Boolean(process.env.ANTHROPIC_API_KEY)`). A real check would call `getSystem()`/`ensureOrganizationReady()` the way `/settings/system` already does, but that requires a live database connection, which this session was explicitly built to avoid depending on. Once a database is provisioned, replace the three hardcoded pills with the same `system.kernel.lifecycle.current()` / `system.memoryEngine.getHealth()` / `system.aiRuntime.health.getAllHealth()` calls `/settings/system` uses, wrapped in `withDemo()` like every other Mission Control widget.
**Priority**: Medium — cosmetic honesty issue, not a functional gap; System Health (`/settings/system`) already shows the real numbers for anyone who clicks through.

---

## IDEA-030: Real password-reset flow behind "Forgot password?"

**Identified**: Session 15 (Login Experience redesign) — reaffirms IDEA-006
**Area**: Authentication
**Description**: The redesigned `LoginForm` (`src/app/(auth)/login/LoginForm.tsx`) has a "Forgot password?" affordance that expands an inline notice ("contact your workspace admin") rather than sending a reset email — there is still no real request→email→reset flow, exactly as IDEA-006 already tracked from Session 4. This entry exists to link the concrete UI surface (the button users will actually click during a demo) back to the unimplemented backend flow, so the two don't drift out of sync.
**Priority**: Medium — same priority as IDEA-006; internal tool can bootstrap/reset users via the founder CLI for now.

---

## IDEA-031: Decide the long-term fate of the Demo Mode login bypass

**Identified**: Session 15 (Demo Mode login bypass, DEC-033)
**Area**: Authentication / Demo Mode
**Description**: `getCurrentUser()` (`src/lib/auth/session.ts`) now grants a synthetic Founder session whenever `NEXT_PUBLIC_DEMO_MODE=true` and no real Auth.js session exists — built so a live demo works with zero database. Once a real database and a seeded founder user exist, decide whether this bypass should: (a) remain permanently as a "try Knottix without an account" path for future prospective users/investors, gated the same way, or (b) be restricted to non-production environments only (e.g. also require `NODE_ENV !== 'production'`), so a misconfigured production deploy with `NEXT_PUBLIC_DEMO_MODE=true` can never grant unauthenticated Founder access to real organizational data.
**Priority**: High before any production deployment — the bypass is safe today only because there is no real data behind it yet.

---

## IDEA-032: GitHub OAuth App connect flow (replacing the manual PAT)

**Identified**: Session 16 (GitHub Integration)
**Area**: Integrations / Authentication
**Description**: GitHub connects today via a user-pasted Personal Access Token (`GitHubConnectForm`, `src/lib/github/credentials.ts`) — `GitHubCredentials.type` is already `'pat' | 'oauth'` and `refreshToken`/`scope` fields exist unused, precisely so a real OAuth App flow can slot in later without a credentials-shape migration (DEC-034). Implementing it needs: a registered GitHub OAuth App (`GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`, already reserved in `.env.example`), a public callback URL this local/demo environment doesn't have, an `/api/integrations/github/callback` route, and a state-token CSRF check. A PAT remains a reasonable permanent option even after OAuth exists (some founders will prefer pasting a scoped token over an org-wide OAuth grant).
**Priority**: Low — the PAT flow is fully functional; OAuth is a UX nicety, not a capability gap.

---

## IDEA-033: Cache or persist GitHub API responses instead of fetching live on every request

**Identified**: Session 16 (GitHub Integration)
**Area**: Integrations / Performance
**Description**: Every GitHub-backed page (`repos/page.tsx`, the repository detail page) and every auto-invoked `github_*` tool call GitHub's REST API live, with only a 30-second in-process cache for `resolvePrimaryRepository()` (`src/lib/github/service.ts`) to bound repeated-tool-call cost within one AI Chat turn — there is no cross-request caching, and no local mirror of repository/PR/issue data. This is fine at demo scale (a handful of repos, a handful of founders) but will hit GitHub's 5000 req/hr authenticated rate limit under real team usage, especially since Developer AI auto-invokes 8 GitHub tools per chat turn. A future pass could add a short TTL cache (Next's `fetch` cache options, or a small Redis/in-memory layer) or a scheduled sync job that mirrors repository metadata into Postgres the way other business entities are mirrored, with GitHub as the source of truth and Postgres as a derived read cache — mirroring the Memory Engine's "PostgreSQL is source of truth, vector store is derived index" pattern (memory-system.md) applied to a third-party API instead of embeddings.
**Priority**: Low — no team is at that usage scale yet; revisit if Developer AI chat volume grows or repositories multiply.

---

## IDEA-034: Detect-inactive-repositories and weekly-summary are prompt-level reasoning, not dedicated tools — verify this holds up in practice

**Identified**: Session 16 (GitHub Integration)
**Area**: AI Employees / Tool Engine
**Description**: Developer AI's "Analyze repository activity," "Detect inactive repositories," "Weekly engineering summary," and "Release summary" capabilities (DEC-034) are implemented as prompt instructions telling the model to reason over the primitive `github_*` tool outputs already auto-resolved into context (commit dates, open PR/issue counts, latest release) — no dedicated `github_detect_inactive_repositories` or `github_weekly_summary` tool was built, per DEC-028's existing "no multi-turn function-calling loop" constraint and to avoid duplicating reasoning the model can already do over structured data. This has not been verified against a real model call (no `ANTHROPIC_API_KEY` configured in this environment) — once one is available, verify Developer AI actually produces a coherent inactive-repository list and weekly summary from the auto-resolved context, and add a dedicated aggregation tool if the model's reasoning proves unreliable at picking out "no commits in N days" style patterns from a flat commit list.
**Priority**: Medium — directly affects whether three of the seven newly-advertised Developer AI capabilities actually work as described; needs a real model call to confirm.

---

## IDEA-035: Verify AI-based Command Center classification against a real model call

**Identified**: Session 17 (Command Center)
**Area**: Command Center / AI Runtime
**Description**: `classifyCommand()` (`src/lib/command-center/classify.ts`) renders the `command-center-intent` prompt template and calls `aiRuntime.complete()` with the Haiku model whenever `!isDemoMode()`, falling back to the deterministic heuristic on any failure. Since this sandboxed environment has no `ANTHROPIC_API_KEY` configured, every live test this session exercised the heuristic-only path (Demo Mode) or the real-mode fallback-on-failure path (no key → provider unavailable → heuristic) — the actual AI classification branch, its pipe-delimited response parsing (`parseClassification()`), and its interaction with the deterministic tool/navigation resolver have not been observed against a real completion. Once a key is configured, verify: (a) the model reliably returns the exact `INTENT|EMPLOYEE|REASONING` format the prompt asks for, (b) classification quality actually improves over the heuristic for ambiguous commands the heuristic gets wrong, (c) latency is acceptable for a command-palette-speed interaction (Haiku should be fast, but this is unverified).
**Priority**: Medium — the Command Center is fully functional without this (heuristic-only), so it's a quality upgrade to verify, not a blocking gap.

---

## IDEA-036: Migrate "Workflow" intent from sequenced tool calls to real registered `WorkflowDefinition`s — RESOLVED (Session 19)

**Identified**: Session 17 (Command Center, DEC-035)
**Area**: Workflow Engine
**Description**: Commands classified as `workflow` intent (multiple tool-shaped clauses, e.g. "show my tasks and meetings today") currently execute by calling `toolEngine.execute()` sequentially in `src/lib/command-center/engine.ts` — the same primitive Tool intent uses, just looped, because the Workflow Engine has zero registered workflows and zero `tool`/`agent`/`prompt` step handlers registered anywhere in the codebase (only `condition`/`transform` are pre-registered by `createWorkflowExecutor()`). A more architecturally complete version would: (1) implement `registerStepHandler('tool', ...)` on the Workflow Engine so a step can invoke a named Tool Engine tool, (2) register a small library of real `WorkflowDefinition`s for common multi-tool commands, (3) have the Command Center's Workflow intent call `workflowEngine.execute({ workflowKey, ... })` instead of sequencing tool calls itself. This was deliberately deferred this session — see DEC-035 point 4 — as building three step handlers and workflow definitions from scratch was judged out of scope for "reuse what's built."
**Resolved**: Session 19 — the Goal Execution Engine mission needed exactly this, so `src/lib/workflows/step-handlers.ts`'s `registerCoreWorkflowStepHandlers()` implements real `tool`/`agent`/`prompt` step handlers (DEC-039), and `goal-engine/templates.ts` is the first library of real `WorkflowDefinition`-shaped graphs. The Command Center's own Workflow intent still sequences `toolEngine.execute()` calls directly in `command-center/engine.ts` rather than calling `workflowEngine.execute()` — migrating it is now a small, low-risk follow-up (the handlers it needs already exist), not the "build from scratch" this idea originally scoped. Tracked as a leaner follow-up rather than reopening this idea.
**Priority**: N/A — the blocking infrastructure gap is closed. Follow-up (migrating Command Center's own Workflow intent onto `workflowEngine.execute()`) is now Low priority — cosmetic architectural consistency, not a capability gap.

---

## IDEA-037: Real write/mutation tools for Projects, Tasks, and other business entities

**Identified**: Session 17 (Command Center)
**Area**: Tool Engine / Projects / Tasks
**Description**: The Command Center's Confirmation Card (DEC-035 point 5) is fully built and correctly triggers for write-shaped commands ("Create a project for ACCD", "Assign homepage redesign to Shubham"), but in real (non-Demo) mode it honestly reports "no tool is registered for this action yet" — there is still no `createProject`, `createTask`, `assignTask`, or any other mutation function anywhere in the codebase (confirmed via `src/lib/db/queries/project.ts`/`task.ts`, which only export `find`/`list`/`count` functions), and no write tool is registered in the Tool Engine. Building `create_project`/`assign_task`-style tools (permission-gated, audit-logged, wrapping new `src/lib/db/queries/*` mutation functions) would let the Confirmation Card execute something real instead of only being demonstrable in Demo Mode's simulated path. This is a real product gap independent of the Command Center — the `create-project`/`create-task` static commands in `navigation.ts` have pointed at `?new=1` query params with no consuming form since Session 11.
**Priority**: High — this is the most-requested-feeling capability gap ("just create the project") and blocks the Command Center's confirmation flow from ever doing something real outside Demo Mode.

---

## IDEA-038: WhatsApp Web selectors will break on redesign — no official automation API exists

**Identified**: Session 18 (Desktop Runtime)
**Area**: Desktop Runtime / Browser Automation
**Description**: `src/lib/desktop-runtime/browser/whatsapp.ts` drives the real WhatsApp Web client through `aria-label` attributes (`"Search input textbox"`, `"Type a message"`, `"Chat list"`) and `title`-attribute contact lookups — the most stable selectors WhatsApp Web's own accessibility markup provides, since there is no official WhatsApp automation API for personal/non-Business accounts. WhatsApp has redesigned this UI multiple times historically; any future redesign can silently break `whatsapp_find_contact`/`whatsapp_type_message`/`whatsapp_send_message` until the selectors are updated. This is the same maintenance burden every third-party WhatsApp Web automation tool accepts (e.g. `whatsapp-web.js`), not something unique to this implementation.
**Priority**: Medium — functional today (verified via the confirmation-flow test in Session 18), but should be periodically spot-checked, and a broken selector should fail loudly (a clear "contact not found" style error) rather than silently, which the current implementation already does via `isVisible()` checks before clicking.

---

## IDEA-039: Upgrade wake-phrase detection to a dedicated acoustic wake-word engine

**Identified**: Session 18 (Desktop Runtime — Voice Runtime)
**Area**: Voice Runtime
**Description**: "Hey Knottix" detection (`src/lib/desktop-runtime/voice/wake-word.ts`) works by transcribing every ~4-second rolling audio chunk via real STT (Deepgram/Whisper) and string-matching the phrase in the transcript — not a dedicated low-power acoustic wake-word model like Picovoice Porcupine. This means every "listening" cycle costs a real STT API call regardless of whether the user actually said the wake phrase, which is both slower (cloud round-trip latency before the wake word is even recognized) and costs money per idle listening cycle. A dedicated wake-word engine runs continuously on-device for near-zero cost and only triggers cloud STT after a real wake-word detection. Adding one is a genuine new dependency (native bindings, typically a paid Picovoice AccessKey) — deliberately not added this session to avoid a costly dependency decision without the user having asked for it specifically.
**Priority**: Low — functional as built; only matters if continuous voice listening sees real, sustained usage where the per-chunk STT cost becomes noticeable.

---

## IDEA-040: Derive `CONFIRMATION_REQUIRED_TOOLS` from the Tool Registry instead of hand-maintaining a parallel list

**Identified**: Session 18 (Desktop Runtime, DEC-038)
**Area**: Command Center
**Description**: `router.ts`'s `CONFIRMATION_REQUIRED_TOOLS` set (`close_app`, `git_commit`, `git_push`, `whatsapp_send_message`) must be manually kept in sync with each tool's own `metadata.requiresConfirmation: true` declaration — the two currently have no structural link, so a future tool that sets `requiresConfirmation` in its metadata but isn't also added to this set would silently execute in Demo Mode without ever showing the Confirmation Card (the exact bug DEC-038 just fixed, reintroduced by omission). A more robust design would expose a client-safe manifest of `{toolName, requiresConfirmation}` pairs — generated at build time from the real tool registrations, or hand-maintained but with a test that asserts every `requiresConfirmation: true` tool in the codebase also appears in `CONFIRMATION_REQUIRED_TOOLS` — so the two can't drift apart silently.
**Priority**: Medium — a real maintenance trap, but low likelihood of near-term impact since new mutating tools aren't added often; worth fixing before the mutating-tool surface grows much beyond today's four.

---

## IDEA-041: No live end-to-end verification of Playwright/WhatsApp/Instagram/voice against real accounts and hardware

**Identified**: Session 18 (Desktop Runtime)
**Area**: Desktop Runtime — verification gap
**Description**: This session verified real execution for clipboard read/write, screenshot capture, window focus, and local TTS (all run directly via PowerShell in the sandbox and confirmed working), plus the full Command Center intent-routing/confirmation/execution pipeline end-to-end in Demo Mode. It did **not** verify: (a) Playwright launching the persistent Chrome profile and actually driving WhatsApp Web/Instagram against a real logged-in account (no account was logged into the dedicated `~/Knottix/BrowserProfile` during this session), (b) real STT/TTS provider calls (no `DEEPGRAM_API_KEY`/`OPENAI_API_KEY`/`ELEVENLABS_API_KEY` configured in this environment), or (c) real microphone capture and the client-side wake-phrase loop (no audio input hardware exercised). All of this code is real and functional (no placeholders, no simulated branches outside Demo Mode), but "the code is correct" and "it was observed working end-to-end against real accounts/hardware" are different claims — this entry tracks closing that gap.
**Priority**: High — before relying on this for actual daily use, walk through: connecting a real STT/TTS key, logging into WhatsApp Web/Instagram in the Knottix browser profile via QR code, sending one real test message with confirmation, and testing the voice wake-phrase loop with a real microphone.
**Partial update (ad-hoc session, 2026-07-19)**: `whatsapp_find_contact`'s `SEARCH_BOX` selector (`'[aria-label="Search input textbox"]'`) was confirmed wrong against a real, already-logged-in WhatsApp Web session in the Knottix browser profile — live DOM inspection found the real element is `input[aria-label="Search or start a new chat"]`. Fixed in `src/lib/desktop-runtime/browser/whatsapp.ts`. `whatsapp_open` and the corrected `whatsapp_find_contact` were confirmed working live (real contact search succeeded). `whatsapp_type_message`/`whatsapp_preview_message`/`whatsapp_send_message` remain unverified against a real send — that walkthrough was interrupted by this session's Goal Execution Engine mission and not resumed. `MESSAGE_BOX` (`'[aria-label="Type a message"]'`) is also still unverified against the live DOM.

---

## IDEA-042: In-memory execution state (Workflow Engine + Goal Execution's demo store) doesn't survive a server restart or true multi-instance deployment

**Identified**: Session 19 (Goal Execution Engine)
**Area**: Workflow Engine / Goal Execution Engine
**Description**: `WorkflowStateManager` (live execution state) and Goal Execution's demo-mode execution store (`src/lib/goal-engine/engine.ts`'s `demoExecutions`) are both plain in-process `Map`s — a goal or workflow paused mid-execution (`WAITING_CONFIRMATION`) is lost if the server restarts before the user confirms. Real (non-demo) executions are partially covered by `WorkflowHistoryStore`'s fire-and-forget Prisma writes (`workflow-persistence.ts`), but those only persist *finished* executions (`record()` is called on completion/failure), never a live paused-mid-flight state — so "every execution should be resumable, if interrupted Knottix continues from the last successful task" (the mission's own Quality requirement) holds true only within one continuous server process today, not across a restart or a second server instance in a horizontally-scaled deployment. A real fix needs `WorkflowExecutor` to persist `WAITING_CONFIRMATION` state (and the paused `WorkflowContext`) to the database as it happens, and `resume()` to rehydrate from there instead of an in-memory `pausedExecutions` map.
**Priority**: Medium — not a problem for the current single-process dev/demo deployment; becomes a real gap the moment Knottix runs more than one server instance or needs to survive a redeploy mid-goal.

---

## IDEA-043: `globalThis`-anchored module state is the fix for Turbopack dev-mode module-instance isolation across different route files — apply consistently

**Identified**: Session 19 (Goal Execution Engine)
**Area**: Developer Experience / Next.js dev server
**Description**: Live-testing the Goal Execution Engine's confirm flow (`POST /api/goals` then `POST /api/goals/[executionId]/confirm`, two different `route.ts` files) failed with a real-DB error even in Demo Mode — traced to `src/lib/goal-engine/engine.ts`'s `demoExecutions` Map being a bare module-level `const`, which under Next.js 16's Turbopack dev server did not reliably share state between the two separate route bundles (each appeared to get its own module instance). Fixed by anchoring it to `globalThis` instead (`const demoExecutions = (globalThis.__knottixDemoGoalExecutions ??= new Map())` — the same pattern Prisma's own Next.js integration guide uses to survive HMR). This was confirmed to fix the observed failure. It is NOT yet confirmed whether `getSystem()`'s own `systemPromise` singleton (`src/lib/system/bootstrap.ts`) or `WorkflowExecutor`'s `pausedExecutions`/`stepHandlers` maps (created once inside the single `getSystem()` instance) are exposed to the same risk in practice — they've never been observed to fail this way in five prior sessions' live testing, but that may be because no prior test exercised true cross-route-file shared *mutable* state within one request lifecycle the way Goal Execution's pause/resume does.
**Priority**: Medium — worth a focused audit of every module-level `Map`/`Set`/counter in `src/lib/` that's relied on as a cross-request singleton, applying the same `globalThis` anchor wherever the risk is real, before this class of bug resurfaces in a harder-to-diagnose form.

---

## IDEA-044: Pre-existing duplicate DOM render on every dashboard page (not introduced by Goal Execution Engine)

**Identified**: Session 19 (Goal Execution Engine, live browser verification)
**Area**: Application Shell / rendering
**Description**: Live-testing `/goals` in the browser found TWO copies of the entire page tree in the DOM (two `<h1>Goals</h1>`, two of every form input) — one visible, one with `offsetParent === null` (hidden). The same was confirmed on the pre-existing `/agents` page (two `<h1>AI Directory</h1>`), ruling out anything introduced this session. This broke reliable browser-automation clicking/typing during verification (a click/type sequence targeting the accessibility tree's node sometimes landed on the hidden copy) but did not block real usage confirmed via direct `fetch()` calls and `get_page_text` snapshots, which showed the visible copy's content was always correct. Root cause not yet diagnosed — candidates include the custom `proxy.ts` (this Next 16 app's replacement for `middleware.ts`, per its own deprecation warning) double-invoking a request, or `PageTransition`'s `AnimatePresence` retaining an exiting page's tree longer than expected.
**Priority**: Medium — doesn't appear to affect what real users see or click (the visible copy is always correct), but is worth root-causing since it breaks browser automation/testing reliability and may indicate wasted render work on every navigation.

---

## IDEA-045: `website-plan` template's three agent steps reason independently, not as a hand-off pipeline

**Identified**: Session 19 (Goal Execution Engine)
**Area**: Goal Execution Engine
**Description**: `goal-engine/templates.ts`'s `websitePlan()` (Developer AI → Designer AI → Content AI) gives each employee the same original goal text rather than threading one step's real output into the next step's input — Developer AI's technical plan never actually informs Designer AI's design direction, even though the mission's own example diagram implies a real hand-off ("Generate UI ↓ Generate Components"). This was a deliberate, stated trade-off to avoid building a templating/variable-interpolation layer inside `AgentStepConfig.input` for this session — `AgentStepConfig.inputFromVariable` already supports reading a *flat string* variable as input, so wiring one step's `content` output into the next step's input needs only a small addition (a `transform` step between them copying `s1:output.content` into a plain variable), not new engine infrastructure.
**Priority**: Low — each employee's independent take is still a real, useful deliverable; sequencing them into a true hand-off pipeline is a small, well-scoped follow-up whenever the product need for it is confirmed.

---

## IDEA-046: No "QA" AI Employee exists — the mission named one, Knottix has seven, none titled QA

**Identified**: Session 19 (Goal Execution Engine)
**Area**: AI Employee Platform
**Description**: The mission's "Specialized AI Employees" section listed Founder → Project Manager → Developer → Designer → Marketing → Content → QA, each contributing "only when required." Knottix's seven registered employees (DEC-030) are Founder Executive Assistant, Developer AI, Designer AI, Project Manager AI, Marketing AI, Content AI, Sales AI — no QA employee exists, and "do not create a new AI" was an explicit, hard constraint this session. The Goal Execution Engine's own "self-verification" (DEC-039) is implemented instead as real tool re-checks (e.g. re-running `git_status` after a push) and step success/failure from the Workflow Executor itself — a structurally different (and arguably more honest) mechanism than "ask a QA employee if this looks right," which would just be another LLM call with no ground truth to check against. If a real QA-flavored employee is wanted later (e.g. reviewing a PR's diff, running a defined test suite via a new tool), it should be scoped and built deliberately, not invented implicitly to satisfy this mission's employee list.
**Priority**: Low — the current tool-based verification approach is functionally sound; a QA employee is a product decision, not a blocking gap.

---

## IDEA-047: `getSkillStats()`'s 300-row bound is a pragmatic default, not a real limit

**Identified**: Session 20 (Skill Registry)
**Area**: Skill Registry / Database
**Description**: `src/lib/db/queries/skill-stats.ts` fetches the most recent 300 `WorkflowExecution` rows per organization and filters client-side for the ones tagged with a given skill key, rather than a targeted database query filtered directly on the JSON `input.__skillKeys` field. This is fine at today's usage scale (a handful of founders, a handful of goals per day) but under real team-scale usage, a skill used less often than the 300-execution window covers would silently under-report its true usage/success history. A real fix would either add a proper indexed column (e.g. a join table `WorkflowExecutionSkill(workflowExecutionId, skillKey)`, populated at persistence time) or use Postgres's native JSON containment query (`input @> '{"__skillKeys": [...]}'`) instead of an in-process filter.
**Priority**: Low — no team is near this usage scale yet; revisit if goal execution volume grows, same class of deferral as IDEA-033 (GitHub caching).

---

## IDEA-048: Skill discovery doesn't yet break ties by real success-rate stats

**Identified**: Session 20 (Skill Registry)
**Area**: Skill Registry / Goal Execution Engine
**Description**: The mission asked that "Memory should prefer the highest-success skills over time." Today this is implemented at the informational layer only — `recallGoalHistory()` surfaces a track record ("these skills have run before: N succeeded, M failed") in `GoalPlan.reasoning`, visible to the user, but `SkillDiscovery.discover()`'s ranking is pure keyword-score — it does not re-rank or break ties using `getSkillStats()`'s real success-rate data. This wasn't a meaningful gap this session because the 17 registered skills have distinct enough keyword sets that ties essentially don't occur, but as the catalog grows and multiple skills could plausibly match the same clause, real success-weighted ranking (e.g. a small score bonus proportional to `successRate` for skills with enough history to be statistically meaningful) would make discovery genuinely adaptive rather than just informative.
**Priority**: Medium — becomes relevant exactly when the catalog grows enough for real keyword overlap between skills; not urgent at 17 skills.

---

## IDEA-049: Multi-skill goal composition doesn't thread one skill's real output into the next skill's input

**Identified**: Session 20 (Skill Registry)
**Area**: Goal Execution Engine
**Description**: `planner.ts`'s `composeFromSkills()` chains multiple matched skills' step graphs by wiring the previous skill's terminal step's `onSuccess` to the next skill's start — real sequencing, real dependency ordering — but each skill's `buildPlan()` is still only ever called with the ORIGINAL goal/clause text, never with a prior skill's actual output. A goal like "check git status and deploy if there are changes" can't today make the deploy skill's behavior depend on what the status check actually found — the same class of limitation IDEA-045 already flagged for the single `website-plan` skill's independent agent steps, now generalized to the composition layer itself. Closing this needs a small addition to `SkillPlanBuilder`'s signature (accepting prior steps' outputs, or a `transform` step inserted between skills copying a named output into a plain variable the next skill's `buildPlan` can read) — not new engine infrastructure, since `WorkflowContext.variables` and the `${step.id}:output` auto-stash already exist.
**Priority**: Low — every skill still runs and produces a real result; this is about making composed plans conditionally smarter, not about anything being broken today.

---

## IDEA-050: Verify the Skill Classifier's AI-upgrade path and the newly-registered skills' agent steps against a real model call

**Identified**: Session 20 (Skill Registry)
**Area**: Goal Execution Engine / AI Runtime
**Description**: `prompt.ts`'s `goal-engine-skill-classifier` template and its dynamic `{{skillList}}` rendering were verified only by code review and the heuristic-only Demo Mode path (no `ANTHROPIC_API_KEY` in this environment) — same standing caveat as IDEA-028/035/IDEA "Session 19" item 28. Once a real key is configured: confirm the model reliably returns comma-separated skill keys in the exact format the prompt asks for, confirm `parseSkillKeys()`'s validation against the live list correctly rejects a hallucinated key, and confirm the `engineering-summary`/`project-status-report`/`proposal-draft`/`content-draft`/`website-plan` skills' agent steps produce coherent real output when actually invoked (not just verified to call the right agent key).
**Priority**: Medium — same class of gap as every other AI-classification path in Knottix; the system is fully functional on the heuristic path without it.

---

## IDEA-051: Only the confirmation-pause instant is truly crash-recoverable — a step actively executing when the process dies is still lost

**Identified**: Session 21 (Task Sessions)
**Area**: Workflow Engine / Task Sessions
**Description**: DEC-041's rehydration fix makes a `WAITING_CONFIRMATION` execution fully recoverable after a restart, because pausing is the one moment nothing is actively running — the persisted `WorkflowExecutionState` is a complete, accurate snapshot. If the process crashes *while* a step's real handler is mid-flight (e.g., a `git_push` that's still running, an AI Employee call still streaming), that in-flight step is simply gone on restart — there is no checkpoint inside a step's own execution, and no automatic "was this actually applied?" reconciliation on restart (e.g., re-checking whether a commit already landed before retrying it). For read-only or idempotent steps this is harmless (a retry just re-runs cleanly); for a step like `git_push` a restart mid-push could theoretically leave ambiguity about whether the push succeeded before the crash. This is a real, currently-open gap in "the session must continue from the last successful step" — it holds for the step *boundaries*, not mid-step.
**Priority**: Medium — low likelihood (a crash has to land in the exact multi-second window a step is executing), but a real gap in the mission's own crash-recovery claim; a safe first mitigation would be making `git_push`/`git_commit` re-check real state (e.g. `git status`) before retrying rather than blindly re-running.

---

## IDEA-052: "Continue my objective" always starts a fresh round from the same text — no incremental planning aware of what prior rounds already did

**Identified**: Session 21 (Task Sessions)
**Area**: Task Sessions / Goal Execution Engine
**Description**: `continueTaskSession()`'s multi-round path calls `startGoal(session.objective, user)` again with the exact original objective string — it has no way to tell the planner "skills X and Y already ran successfully in round 1, only compose what's left." For an idempotent skill (e.g. `check-git-status`) re-running is harmless; for a skill with a real side effect (e.g. `deploy-project`, which commits and pushes again) a naive "continue" on an already-completed session could redundantly re-run real mutating steps. Building real incremental awareness would mean either summarizing prior rounds' outcomes into the objective text passed to `startGoal` (a prompt-level fix, no new engine) or teaching skill discovery to skip skills whose `skillKeys` already appear in a `COMPLETED` round for this session (a small addition to `composeFromSkills`) — deliberately not built this session to avoid scope creep into the Goal Engine's own composition logic.
**Priority**: Medium — matters most for objectives whose skills have real, non-idempotent side effects; today's behavior is honest (nothing hides that a fresh round re-plans from scratch) but not smart about avoiding redundant real work.

---

## IDEA-053: No live verification of Task Sessions (or crash recovery) against a real database and an actual process restart

**Identified**: Session 21 (Task Sessions)
**Area**: Task Sessions / Database
**Description**: Same standing environment constraint as every database-dependent feature since Session 10 — `DATABASE_URL` in this sandbox is still Prisma's default placeholder (`postgresql://johndoe:...@localhost:5432/mydb`), not a real connection. Everything in this session was verified by `tsc`/`next build` and code review only: `TaskSession` CRUD, the confirmation-pause persistence fix, `WorkflowExecutor.resume()`'s rehydration fallback, and — most importantly — the actual claim that a paused session survives a real server restart, has never been observed end to end (start a session → pause it → kill the Node process → restart it → confirm it resumes correctly). This is the single highest-value thing to verify once a real database exists, since it's the mission's central claim.
**Priority**: High — this is the one thing that would fully validate DEC-041's core claim; today it's validated by code inspection and the type system, not by an observed restart.

---

## IDEA-054: `findActiveTaskSessionByKeyword` has no disambiguation when two active sessions share a keyword

**Identified**: Session 21 (Task Sessions)
**Area**: Task Sessions / Command Center
**Description**: "Resume ACCD" resolves via a `contains`/case-insensitive match against `TaskSession.objective`, returning only the single most-recently-updated match (`src/lib/db/queries/task-session.ts`). If a founder has two active sessions both mentioning "ACCD" (e.g. "Build a website for ACCD" and "Deploy ACCD's staging environment"), the command silently acts on whichever was touched most recently rather than asking which one was meant. A real fix would have the Command Center's result surface "Found 2 matching sessions — which one?" when `findActiveTaskSessionByKeyword` (extended to return all matches, not just the top one) finds more than one, rather than silently picking.
**Priority**: Low — a real but narrow edge case; most founders won't have two simultaneously-active sessions with overlapping keywords.

---

## IDEA-055: No tool enumerates real Desktop State — the "desktop" collector only reports clipboard contents

**Identified**: Session 22 (Context Engine)
**Area**: Context Engine / Desktop Runtime
**Description**: The mission's "Desktop State" example implies something broader (running applications, window list) than what Knottix's Desktop Runtime can actually report — there is no tool that enumerates running processes or open windows (DEC-037 deliberately excluded raw OS-level introspection beyond `focus_window`/`switch_window`, which act on a named process, not list them). The `desktop` collector (`context-engine/collectors.ts`) honestly reports only the system clipboard via the real `clipboardRead()` tool — the closest genuine "what's happening on the desktop right now" signal available — rather than fabricating a broader desktop-state summary. A real fix would add a new, narrowly-scoped Desktop Runtime tool (e.g. `list_running_windows` via a PowerShell `Get-Process | Where-Object {$_.MainWindowTitle}` query, the same allowlisted-PowerShell-script pattern every other Desktop Runtime tool already uses) before the collector could honestly report more.
**Priority**: Low — the clipboard signal is real and occasionally useful; broader window enumeration is a genuine but narrow capability gap, not a blocking one.

---

## IDEA-056: Context collection happens after skill selection, not strictly before planning as the mission's pipeline diagram shows

**Identified**: Session 22 (Context Engine)
**Area**: Context Engine / Goal Execution Engine
**Description**: The mission's own diagram is `User Goal → Context Collection → Context Ranking → Goal Planning → Execution`. `startGoal()` actually runs `planGoal()` (skill discovery/composition) FIRST, and only calls `collectContext()` once the plan is confirmed real (not `unsupported`) — collected context currently only enriches already-selected 'agent' steps' inputs, it never influences WHICH skill gets chosen. This was a deliberate ordering choice (collecting real context for a goal that turns out unsupported would be pure waste), but it means the mission's literal pipeline order isn't implemented — context doesn't yet shape planning, only execution. Closing this for real would mean extending `SkillDiscovery.discover()` to accept a pre-collected context bundle and add a relevance bonus for skills whose keywords overlap with high-scoring context items (e.g. a project or GitHub repo already found relevant) — a natural, bounded extension, not a redesign.
**Priority**: Medium — today's system is honest about what it does (informational enrichment, not planning influence) and works correctly; this is about matching the mission's literal intent more closely, not fixing a defect.

---

## IDEA-057: `context:explain`'s subject extraction keeps trailing punctuation ("ACCD?" instead of "ACCD")

**Identified**: Session 22 (Context Engine)
**Area**: Command Center
**Description**: `router.ts`'s `context:explain` `extractParams` uses the same `extractAfterKeyword()` helper every other tool-keyword entry uses, which doesn't strip trailing punctuation — "What do you know about ACCD?" extracts the subject as `"accd?"`, not `"ACCD"`. Live-tested this session: the Command Center still classified and routed correctly (the trailing `?` doesn't break relevance scoring in a meaningful way, since `scoreRelevance()` strips non-word characters from query terms before matching), but the extracted `query` param shown in the plan is cosmetically off. A one-line fix: strip trailing `?`/`.`/`!` in `extractAfterKeyword()` or in this specific `extractParams` callback.
**Priority**: Low — cosmetic; verified not to affect actual context matching correctness.

---

## IDEA-058: No live verification of the Context Engine's real collectors against real Projects/Tasks/Meetings/Documents/GitHub/Memory data

**Identified**: Session 22 (Context Engine)
**Area**: Context Engine / Database
**Description**: Same standing constraint as every database-dependent feature since Session 10 (and explicitly Task Sessions in Session 21) — no real `DATABASE_URL` in this environment. This session verified: the Context Inspector page renders and correctly declines in Demo Mode; the Command Center correctly classifies and routes context questions to `context:explain`; Demo Mode goal execution (`take a screenshot`) correctly shows `contextUsed: []`, confirming the Demo Mode/real-mode branch didn't regress. What was NOT verified: any of the 13 collectors actually returning real, correctly-scored data against a live database — the ranking formula, the freshness decay, the trust weights, and the "Continue ACCD" automatic-detection behavior are all validated by code review and the type system only.
**Priority**: High — same priority class as IDEA-053 (Task Sessions); this is the natural next thing to verify once a real database exists, ideally in the same pass.

---

## IDEA-059: No live verification of the MCP Client Manager against a real MCP server or real database

**Identified**: Session 23 (MCP Integration)
**Area**: MCP / Database
**Description**: Same standing constraint as IDEA-053/058 — `npx prisma migrate status` in this environment fails with `P1001: Can't reach database server at localhost:5432`, confirmed again this session. What WAS live-verified this session (against the running dev server, `NEXT_PUBLIC_DEMO_MODE=true`): `/mcp` renders and honestly declines in Demo Mode; the Command Center correctly classifies all five of the mission's own example phrases ("Show connected MCP servers", "Refresh MCP servers", "What tools are available?", "Use the Figma MCP", "Why did you choose this MCP tool?") to their intended `mcp:*` tool steps and honestly reports Demo Mode unavailability for each — this live pass is what caught and fixed the two router bugs and one keyword-ordering bug documented in DEC-043 point 7. What was NOT verified: an actual MCP handshake, `listTools`/`listResources`/`listPrompts` against a real external server, real encrypted-token round-tripping, or the `mcp-resource` Context Engine collector against live server data — all validated by code review, `tsc --noEmit`, and `next build` only.
**Priority**: High — same priority class as IDEA-053/058; the natural next thing to verify once a real database (and a real MCP server to point at, e.g. a local filesystem or Figma MCP server) exist, ideally in the same pass as those.

---

## IDEA-060: `mcp:use` confirms a server is connected but doesn't execute a specific tool call inline

**Identified**: Session 23 (MCP Integration)
**Area**: Command Center / MCP
**Description**: "Use the Figma MCP" resolves to `mcp:use`, which reports whether the named server is connected and how many tools it exposes — it does not itself invoke any specific tool. This mirrors the mission's own phrasing literally (a general "use this server" intent, not "call this specific tool with these arguments"), and matches how `task_session:continue`/`context:explain` are also informational-or-orchestration steps rather than raw tool execution. A founder who wants to actually run one of that server's tools currently has to phrase a goal that names the tool/skill directly (e.g. a goal whose text matches the MCP-derived skill's own keywords) rather than chaining through `mcp:use`.
**Priority**: Low — the current behavior is honest about what it does; wiring `mcp:use` to also execute a named tool would need a second clause parsed out of the query (which tool, which arguments), which is exactly the "no safe generic multi-param extraction" limit `mcp/skills.ts`'s `buildSkillForTool()` already declines for the same reason.

---

## IDEA-061: `mcp_get_prompt` has no real caller yet — AI Employees can't decide mid-conversation to request one

**Identified**: Session 23 (MCP Integration)
**Area**: MCP / AI Employees
**Description**: `mcp/tools.ts`'s `mcp_get_prompt` is a real, callable Tool Engine tool (logged via the same `MCPCallLog` mechanism every MCP call uses), but nothing in the current AI Employee execution path lets a model decide mid-conversation to call it — this is the same standing gap IDEA-016 already tracks (no real tool-calling loop; an AI Employee's response is one `aiRuntime.complete()` call, not an agentic loop that can invoke tools and continue). The tool is reachable today only via an explicit 'tool'-type workflow step (a Skill or a hand-built goal plan), not spontaneously by an AI Employee reasoning about a user's question.
**Priority**: Medium — same priority class as IDEA-016 itself; this doesn't need a separate fix, it needs IDEA-016's fix, at which point `mcp_get_prompt` becomes usable with zero additional work.
