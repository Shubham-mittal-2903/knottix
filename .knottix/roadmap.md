# Knottix — Roadmap

## Phase 0: Foundation (Current)
- [x] Project vision defined
- [x] Architecture documented
- [x] Database schema designed
- [x] Permission model defined
- [x] Coding and development rules established
- [x] UI design system documented
- [x] AI agent system designed
- [x] Memory system designed
- [x] Initialize Next.js 15 project with full config (TypeScript, Tailwind v4, shadcn/ui, ESLint, Prettier, Husky)
- [x] Create complete folder structure per architecture.md
- [x] Install all dependencies (Prisma, Framer Motion, TanStack Query, Zustand, Zod, RHF, Lucide)
- [x] Create app route structure (auth group, dashboard group, 9 module pages)
- [x] Create types, constants, config, hooks, providers
- [x] Apply Knottix dark theme via CSS custom properties
- [x] Verify dev server boots clean (port 3955)
- [x] Implement full Prisma schema — 37 models, 30 enums, multi-org architecture
- [x] Database-driven RBAC — Permission, RolePermission, 5-tier scoping
- [x] Update types, constants, navigation for multi-org + DB-driven permissions
- [ ] Provision PostgreSQL database
- [ ] Generate initial migration
- [x] Create seed script (default org, workspace, roles, permissions)
- [x] Implement auth (NextAuth v5 + role system)

## Phase 1: Shell & Auth
- [ ] Application shell (sidebar, topbar, content area)
- [ ] Login page (credential-based)
- [ ] Session management
- [ ] Role-based middleware
- [ ] Route protection
- [ ] User profile page
- [ ] Team management (FOUNDER only — invite, assign roles)

## Phase 2: Core Modules
- [ ] Command Center (dashboard home)
- [ ] Projects module (CRUD, task management, assignment)
- [ ] Clients module (CRUD, profile, history)
- [ ] Creative module (asset upload, version tracking, review rounds)

## Phase 3: AI Engine
- [ ] Multi-provider AI engine (`lib/ai/`)
- [ ] Agent router and orchestration
- [ ] System prompts for core agents
- [ ] Streaming responses (SSE)
- [ ] Command palette with AI input
- [ ] Agent run logging

## Phase 4: Memory System
- [ ] Memory entry model and CRUD
- [ ] Automatic memory capture (project/client events)
- [ ] Embedding pipeline (write)
- [ ] Semantic search (read)
- [ ] Contextual auto-fetch for agents
- [ ] Memory module UI (search, browse, manage)

## Phase 5: Finance & Reports
- [ ] Finance module (invoices, expenses, tracking)
- [ ] Report generation agent
- [ ] Dashboard analytics (revenue, project stats)

## Phase 6: Polish & Expansion
- [ ] Notification system
- [ ] Audit log viewer (FOUNDER)
- [ ] Custom agent builder (FOUNDER)
- [ ] Scheduled/autopilot agents
- [ ] Integration hooks (email, calendar)
- [ ] Performance optimization pass

## Milestones

| Milestone | Target | Definition of Done |
|-----------|--------|-------------------|
| M0: Foundation | 2026-07-09 | All `.knottix/` docs created, project initialized, enterprise data layer complete |
| M1: Working Shell | TBD | Auth + shell + role-based routing live |
| M2: Core Modules | TBD | Projects, Clients, Creative fully functional |
| M3: Intelligence | TBD | AI agents + memory system operational |
| M4: Full System | TBD | All modules live, daily-driveable by the team |
