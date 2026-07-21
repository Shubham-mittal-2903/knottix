# Knottix — Architecture

## Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 15 (App Router) | RSC, server actions, middleware-level auth, layouts |
| UI Framework | Tailwind CSS v4 + Framer Motion | Utility-first + premium animations |
| Component System | shadcn/ui (base-nova) + custom extensions | Accessible primitives, Knottix-themed |
| Backend | Next.js API routes + server actions | Unified codebase, no separate backend |
| Database | PostgreSQL (Neon/Supabase) | Relational integrity for business data |
| ORM | Prisma | Type-safe queries, migrations, schema as code |
| Vector Store | Qdrant (or pgvector) | Semantic memory, RAG retrieval |
| Auth | NextAuth.js v5 (Auth.js) | Role-based sessions, credential + magic link |
| AI Engine | Multi-provider (Claude primary, OpenAI/Gemini fallback) | Provider-agnostic architecture, no vendor lock |
| File Storage | Cloudflare R2 or S3-compatible | Assets, uploads, exports |
| Realtime | Server-Sent Events (SSE) | AI streaming, live notifications |
| Deployment | Vercel (frontend) + managed DB | Zero-ops for a small team |

## Application Structure

```
knottix/
├── .knottix/                    # Foundation docs (this folder)
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/              # Auth pages (login, invite)
│   │   ├── (dashboard)/         # Main authenticated layout
│   │   │   ├── command/         # Command center (home)
│   │   │   ├── projects/        # Project management
│   │   │   ├── clients/         # Client intelligence
│   │   │   ├── creative/        # Creative workspace
│   │   │   ├── finance/         # Financial oversight
│   │   │   ├── team/            # Team & roles
│   │   │   ├── memory/          # Knowledge base & recall
│   │   │   ├── agents/          # AI agent hub
│   │   │   └── settings/        # System config
│   │   ├── api/                 # API routes
│   │   └── layout.tsx           # Root layout
│   ├── components/
│   │   ├── ui/                  # Design system primitives
│   │   ├── modules/             # Module-specific components
│   │   └── layouts/             # Shell, sidebar, topbar
│   ├── lib/
│   │   ├── ai/                  # AI engine (providers, router, streaming)
│   │   ├── db/                  # Prisma client, queries
│   │   ├── auth/                # Auth config, role guards
│   │   ├── memory/              # Memory system (store, retrieve, embed)
│   │   ├── agents/              # Agent definitions, orchestration
│   │   └── utils/               # Shared utilities
│   ├── hooks/                   # React hooks
│   ├── types/                   # TypeScript types
│   ├── stores/                  # Zustand stores
│   ├── services/                # API service layer
│   ├── config/                  # Site config, navigation
│   ├── constants/               # Roles, modules, static data
│   └── styles/                  # Global styles, design tokens
├── prisma/
│   └── schema.prisma            # Database schema
├── public/                      # Static assets
└── config/                      # Environment configs
```

## Module System

Knottix is built as interconnected modules, not isolated pages. Every module can:

- Read/write to the shared memory system
- Invoke AI agents relevant to its domain
- Respect role-based visibility rules
- Emit events other modules can consume

### Core Modules

| Module | Purpose |
|--------|---------|
| Command Center | Dashboard home — overview, quick actions, AI assistant |
| Projects | Project lifecycle — briefs, tasks, timelines, deliverables |
| Clients | Client profiles, history, communication log, intelligence |
| Creative | Design assets, review workflows, brand libraries |
| Finance | Revenue, expenses, invoices, payment tracking |
| Team | Members, roles, permissions, workload |
| Memory | Searchable knowledge base — semantic + keyword retrieval |
| Agents | AI agent configuration, execution logs, custom agents |
| Settings | System config, integrations, preferences |

## Data Flow

```
User Action → Role Gate → Module Logic → AI Engine (if needed) → Database → Memory Index → Response
```

Every write operation that produces meaningful information is indexed into the memory system automatically. The AI engine has read access to memory for context-aware responses.

## Key Architectural Rules

1. **No microservices.** Monolith-first. Split only when measured performance demands it.
2. **shadcn/ui is the component base.** Custom components extend shadcn primitives. No other UI frameworks.
3. **AI calls are server-side only.** No API keys on the client. Ever.
4. **Database is the source of truth.** Memory/vector store is a derived index, not primary storage.
5. **Every module is behind role middleware.** No client-side-only permission checks.
