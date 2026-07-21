# Knottix — Coding Rules

## Language & Types

- TypeScript strict mode everywhere. No `any`. No `@ts-ignore` without a linked issue.
- Use `interface` for object shapes, `type` for unions and intersections.
- All function parameters and return types explicitly typed. Rely on inference only for local variables.
- Enums live in Prisma schema. Application code uses the generated types.

## File Naming

- Components: `PascalCase.tsx`
- Utilities/libs: `kebab-case.ts`
- Pages/routes: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` (Next.js conventions)
- Types: `types.ts` within the relevant directory
- Constants: `constants.ts`
- Barrel exports (`index.ts`) allowed only in `types/` and `constants/`. Import from actual file elsewhere.

## Component Rules

- Server Components by default. Add `"use client"` only when the component needs browser APIs, state, or event handlers.
- No prop drilling beyond 2 levels. Use composition or context.
- No inline styles. Tailwind only.
- No `useEffect` for data fetching. Use server components or server actions.
- Component files contain ONE exported component. Helpers stay in the same file only if they're under 10 lines and used nowhere else.

## Imports

- Absolute imports via `@/` alias pointing to `src/`.
- Order: React/Next → external libs → internal libs → components → types → styles.
- No circular imports. Lint enforced.

## State Management

- Server state: server components + server actions for initial data.
- Client cache/mutations: TanStack Query for server state synchronization.
- Client state: Zustand for cross-component UI state (sidebar, modals, command palette). Local state via `useState`/`useReducer`.
- No Redux.

## Error Handling

- Server actions return `{ success: boolean; data?: T; error?: string }`. No thrown errors for business logic.
- Use `error.tsx` boundaries for unexpected crashes.
- Log errors server-side with structured context (user, action, entity). No `console.log` in production code.

## Database

- All queries go through Prisma. No raw SQL unless Prisma cannot express the query.
- Queries live in `lib/db/` organized by domain (e.g., `lib/db/projects.ts`).
- Every query function takes `userId` and applies role-based filtering internally.

## AI Integration

- All AI calls route through `lib/ai/`. No direct SDK imports in components or routes.
- System prompts live in `lib/ai/prompts/` as template functions, not hardcoded strings.
- Every AI call logs: model, tokens, latency, user, module. No silent calls.

## Security

- No API keys in client code. Environment variables accessed only in server code.
- All user input sanitized before database writes.
- All file uploads validated (type, size) server-side before storage.
- CSRF protection via Next.js server actions (built-in).

## Performance

- Images: next/image with explicit dimensions. No unoptimized images.
- Dynamic imports for heavy client components.
- Database queries: select only needed fields. No `SELECT *` equivalent in Prisma (use `select` or `include` explicitly).

## Git

- Commit messages: `type: description` (feat, fix, refactor, chore, docs)
- One logical change per commit.
- No committed `.env` files. `.env.example` with dummy values only.
