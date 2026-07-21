# Knottix

**4 Knotts Central Intelligence System**

Internal AI-powered operating system for managing projects, clients, creative workflows, team coordination, financial oversight, and institutional memory.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v4 + shadcn/ui + Framer Motion
- **Database**: PostgreSQL + Prisma
- **AI**: Multi-provider (Claude primary)
- **State**: Zustand + TanStack Query

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in real values in .env

# Run development server
npm run dev
```

Dev server runs on [http://localhost:3950](http://localhost:3950).

## Project Structure

See `.knottix/architecture.md` for the full specification.

## Foundation

All architectural decisions, design tokens, permissions, database schema, and development rules live in `.knottix/`. These files are the single source of truth for the entire project.
