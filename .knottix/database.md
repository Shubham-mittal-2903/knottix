# Knottix — Database Design

## Engine

PostgreSQL (managed — Neon or Supabase). Extensions: pgvector.

## Architecture

Multi-organization, multi-workspace. Every business entity is scoped to an Organization or Workspace.

```
Organization
└── Workspaces
      └── Members (via org membership + workspace access)
             └── Roles (org-scoped, database-driven)
                    └── Permissions (granular, scopeable)
```

## Schema Domains

### 1. Organization & Workspace

**Organization** — Top-level tenant. Supports unlimited orgs.
- id, name, slug (unique), logo, domain (unique), description, metadata, status
- First org: "4 Knotts". Future: Judge, Mittal.website, KnottBox, client orgs.

**Workspace** — Subdivision within an org. Projects, clients, and work happen here.
- id, organizationId, name, slug, description, icon, metadata, status
- Unique constraint: (organizationId, slug)

### 2. Identity & Access

**User** — Global identity. Can belong to multiple organizations.
- id, email (unique), passwordHash, name, avatarUrl, phone, timezone, locale, status
- lastLoginAt, lastActiveAt, emailVerifiedAt

**Member** — User's membership in a specific Organization.
- id, userId, organizationId, roleId, departmentId, title, bio, status, joinedAt
- Unique constraint: (userId, organizationId)
- Many-to-many with Workspaces (workspace access)

**Role** — Organization-scoped. Database-driven, not hardcoded.
- id, organizationId, name, slug, description, systemRole (enum, nullable), isFounder, isDefault, level, metadata
- Unique constraint: (organizationId, slug)
- isFounder = true → bypasses all permission checks

**Permission** — Global permission definitions.
- id, key (unique, e.g., "projects:read"), resource, action, description
- Unique constraint: (resource, action)

**RolePermission** — Links roles to permissions with scope.
- id, roleId, permissionId, scope (PermissionScope enum), scopeId (nullable), conditions (Json)
- Unique constraint: (roleId, permissionId, scope, scopeId)
- Scopes: ORGANIZATION, WORKSPACE, DEPARTMENT, TEAM, RESOURCE

### 3. Teams & Departments

**Department** — Org-scoped, supports hierarchy (parentId self-reference).
- id, organizationId, name, slug, description, headId, parentId

**Team** — Belongs to a Department.
- id, departmentId, name, slug, description, leadId

**TeamMember** — Junction: Member ↔ Team with isLead flag.
- Unique constraint: (teamId, memberId)

### 4. Projects & Tasks

**Project** — Workspace-scoped. Optionally linked to Client.
- id, workspaceId, clientId, title, slug, description, status, priority, startDate, dueDate, completedAt, budget, currency

**ProjectMember** — Junction: Member ↔ Project with role string.
- Unique constraint: (projectId, memberId)

**Task** — Belongs to Project. Supports subtasks (parentId self-reference).
- id, projectId, parentId, title, description, status, priority, dueDate, startDate, completedAt, estimatedHours, actualHours, position

**TaskAssignment** — Junction: Task ↔ Member (multiple assignees).
- Unique constraint: (taskId, memberId)

### 5. Clients & Meetings

**Client** — Workspace-scoped.
- id, workspaceId, name, slug, industry, website, contactName, contactEmail, contactPhone, address, notes, status

**Meeting** — Workspace-scoped. Links to Project and/or Client.
- id, workspaceId, projectId, clientId, title, description, status, startTime, endTime, location, meetingUrl, notes, summary, attendees (Json)

### 6. Knowledge & Documents

**KnowledgeCategory** — Workspace-scoped, hierarchical.
- id, workspaceId, parentId, name, slug, description, icon, position

**Knowledge** — Workspace-scoped. Vector-ready (embedding field).
- id, workspaceId, categoryId, title, content, contentHtml, summary, sourceType, sourceId, embedding (vector(1536)), metadata

**Document** — Workspace-scoped. Version chain (parentId).
- id, workspaceId, projectId, title, slug, content, contentHtml, status, version, parentId

**File** — Uploaded by Member. Links to Project/Task/Document.
- id, memberId, projectId, taskId, documentId, filename, originalName, mimeType, size, url, thumbnailUrl, version, parentId, status

### 7. Comments, Tags & Labels

**Comment** — By Member. Links to Project/Task/Document. Supports replies (parentId).
- id, memberId, projectId, taskId, documentId, parentId, content

**Tag** — Organization-scoped. Many-to-many with Project, Task, Client, Knowledge, Document.
- id, organizationId, name, slug, color

**Label** — Workspace-scoped. Many-to-many with Project, Task.
- id, workspaceId, name, slug, color, description

### 8. Notifications & Activity

**Notification** — User-scoped. Polymorphic entity reference.
- id, userId, type, title, body, entityType, entityId, actionUrl, read, readAt

**Activity** — Organization-scoped activity feed.
- id, organizationId, actorId, type, entityType, entityId, entityName, description, metadata

### 9. Audit & Security

**AuditLog** — Organization-scoped. Every sensitive action traced.
- id, organizationId, actorId, action, entityType, entityId, entityName, before (Json), after (Json), metadata, ipAddress, userAgent

**APIKey** — Organization-scoped. Hash stored, prefix for lookup.
- id, organizationId, name, keyHash (unique), keyPrefix, scopes, expiresAt, lastUsedAt, revokedAt

### 10. Integrations & Settings

**Integration** — Organization-scoped. One per provider per org.
- id, organizationId, provider, name, status, config, credentials, scopes, webhookUrl, webhookSecret, lastSyncAt, syncError
- Providers: GitHub, Figma, Google, Meta, Slack, Discord, WhatsApp, Razorpay, Stripe, Cloudflare, Vercel, Render, Firebase, OpenAI, Claude, Gemini, Custom

**Setting** — Flexible key-value with scope.
- id, scope (SettingScope enum), scopeId, key, value (Json), description, isEncrypted, userId
- Scopes: ORGANIZATION, WORKSPACE, USER, AI, NOTIFICATION, BRAND, INTEGRATION, SECURITY, BILLING

### 11. AI Foundation

**AIAgent** — Organization-scoped agent definitions.
- id, organizationId, key, name, description, systemPrompt, model, modelTier, maxTokens, temperature, tools (Json), contextSources, modules, allowedRoles, status

**AIMemory** — Long-term memory. Vector-ready.
- id, organizationId, workspaceId, memberId, type, sourceType, sourceId, content, summary, importance, tags, embedding (vector(1536)), expiresAt

**Conversation** — Workspace-scoped. Member ↔ Agent.
- id, workspaceId, memberId, agentId, title, module, status

**ConversationMessage** — Messages within conversation.
- id, conversationId, role, content, model, tokensIn, tokensOut, latencyMs, toolCalls, toolResults

**PromptTemplate** — Organization-scoped prompt library.
- id, organizationId, agentId, name, slug, description, content, variables (Json), category, version, isActive

### 12. Automation & Workflows

**Automation** — Organization-scoped. Trigger-based.
- id, organizationId, name, slug, trigger (enum), triggerConfig, actions (Json), conditions, status, lastRunAt, runCount, errorCount

**Workflow** — Organization-scoped. Definition-based.
- id, organizationId, name, slug, definition (Json), status, version

**WorkflowExecution** — Execution history.
- id, workflowId, status, input, output, error, startedAt, completedAt, durationMs

## Universal Fields

Every table includes:
- `id` — UUID primary key
- `createdAt` — timestamp, auto-set
- `updatedAt` — timestamp, auto-updated
- `createdBy` — UUID string (nullable), references actor
- `updatedBy` — UUID string (nullable), references actor

Soft-delete enabled models also include:
- `deletedAt` — nullable timestamp
- `deletedBy` — nullable UUID string

## Rules

1. All timestamps are UTC.
2. Soft-delete on business entities. Hard-delete only via Founder with audit log.
3. No cascade deletes on business entities. Junction tables cascade on parent delete.
4. jsonb metadata fields for truly flexible data only.
5. UUID primary keys everywhere.
6. Organization/Workspace slug uniqueness enforced at database level.
