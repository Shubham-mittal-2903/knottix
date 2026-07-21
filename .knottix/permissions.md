# Knottix — Permissions & Role-Based Access Control

## Design Principle

Permissions are **database-driven, multi-scoped, and enforced server-side**. No permission is hardcoded into business logic. The client renders what the role allows; the server rejects what it doesn't. Never trust the client.

## Architecture

```
Organization
└── Role (org-scoped, configurable)
      └── RolePermission (links role to permission with scope)
            └── Permission (global definition: resource + action)
```

## Permission Model

Permissions are defined globally in the `Permission` table as `resource:action` pairs.

### Resources
`command`, `projects`, `clients`, `creative`, `finance`, `team`, `memory`, `agents`, `settings`, `audit`, `integrations`, `automations`, `workflows`, `api_keys`, `billing`

### Actions
`read`, `create`, `update`, `delete`, `manage`, `export`, `import`, `execute`

### Examples
`projects:read`, `projects:create`, `clients:delete`, `finance:manage`, `agents:execute`, `audit:read`, `settings:manage`

## Scoped Permissions

Each `RolePermission` has a `scope` that determines granularity:

| Scope | Meaning |
|-------|---------|
| ORGANIZATION | Permission applies across the entire organization |
| WORKSPACE | Permission applies within a specific workspace |
| DEPARTMENT | Permission applies within a specific department |
| TEAM | Permission applies within a specific team |
| RESOURCE | Permission applies to a specific entity (e.g., one project) |

The `scopeId` field on `RolePermission` references the scoped entity when scope is not ORGANIZATION.

## Default System Roles

These are created when an organization is provisioned. They can be modified or extended.

| System Role | Level | Founder? | Description |
|-------------|-------|----------|-------------|
| FOUNDER | 100 | Yes | Unrestricted. Bypasses all permission checks. |
| ADMINISTRATOR | 90 | No | Full management. Cannot modify founder-level settings. |
| CREATIVE_HEAD | 80 | No | Manages creative pipeline, reviews, client communication. |
| DESIGNER | 50 | No | Assigned projects, design assets, reviews. |
| DEVELOPER | 50 | No | Assigned projects, system config, agent config. |
| INTERN | 20 | No | Assigned tasks only, limited uploads. |
| GUEST | 10 | No | Read-only on explicitly shared resources. |

Roles are fully configurable per organization. New roles can be created with any combination of permissions.

## Founder Bypass

The `Role.isFounder` flag grants unrestricted access. When `isFounder = true`:
- All permission checks return true
- All navigation items are visible
- All API routes are accessible
- No row-level filtering applied

This is checked in the permission evaluation function, NOT hardcoded per-route.

## Permission Enforcement Layers

### Layer 1: Middleware (route-level)
Next.js middleware checks session → member → role → permissions for the requested route module. Unauthorized requests redirect to `/unauthorized` or return 403.

### Layer 2: Server Action / API (operation-level)
Every server action and API route validates:
- Is the user authenticated?
- Does their role have the required permission for this operation?
- Does the scope allow this operation in this context (org/workspace/team)?

### Layer 3: Data Query (row-level)
Prisma queries include permission-based WHERE clauses:
- Founder: no filter
- Scoped roles: filter by workspace, department, team, or assignment

### Layer 4: UI (presentation-level)
Components check the user's permissions array to show/hide UI elements. This is convenience — not security.

## Adding New Roles

1. Create a new Role record in the organization
2. Assign permissions via RolePermission records
3. No code changes required — the system reads permissions from the database

## Adding New Permissions

1. Add a Permission record with the new `resource:action` key
2. Assign to relevant roles via RolePermission
3. Add the permission check to the relevant server action/route

## Audit

- All permission-denied events are logged to AuditLog
- All role changes are logged to AuditLog
- All permission assignment changes are logged to AuditLog
