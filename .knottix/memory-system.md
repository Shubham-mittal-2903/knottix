# Knottix — Memory System

## Purpose

Knottix remembers everything. The memory system is the institutional brain of 4 Knotts — every client interaction, project decision, creative direction, financial event, and team conversation is captured, indexed, and retrievable.

This is what separates Knottix from every other tool. The system accumulates intelligence over time.

## Architecture

```
Data Event → Memory Writer → PostgreSQL (structured) + Vector Store (embeddings) → Memory Reader → AI Context / Search UI
```

### Dual Storage

| Store | What | How Retrieved |
|-------|------|---------------|
| PostgreSQL (MemoryEntry table) | Full content, metadata, source links, tags | Keyword search, filters, direct lookup |
| Vector Store (Qdrant/pgvector) | Embeddings of content | Semantic similarity search |

Every memory entry exists in BOTH stores. PostgreSQL is the source of truth; the vector store is a derived search index.

## Memory Sources

| Source Type | Trigger | Example |
|-------------|---------|---------|
| PROJECT | Project created, updated, completed | "Project X for Client Y started on date Z with budget W" |
| CLIENT | Client profile changes, new communication | "Client requested rush delivery, prefers minimal design" |
| CONVERSATION | AI conversation produces useful output | Agent-generated brief, analysis result |
| AGENT | Agent run completes | "Finance analysis showed 30% revenue increase in Q2" |
| MANUAL | User explicitly saves a memory | "Client's CEO prefers blue tones, mentioned in call on date" |
| SYSTEM | System events worth remembering | "Team member X onboarded as Designer on date" |

## Memory Entry Structure

```
MemoryEntry {
  id
  content         // human-readable text
  embedding       // vector representation
  source_type     // PROJECT, CLIENT, CONVERSATION, AGENT, MANUAL, SYSTEM
  source_id       // FK to originating entity (nullable)
  tags            // searchable labels
  metadata        // { module, project_id, client_id, ... } flexible context
  created_by      // who/what created this
  created_at
  expires_at      // nullable — most memories are permanent
}
```

## Retrieval Modes

### 1. Semantic Search
User or agent asks a question → query is embedded → nearest neighbors returned from vector store → ranked by relevance.

Used by: AI agents building context, Memory module search UI.

### 2. Filtered Query
Structured filters: by source_type, tags, date range, module, client, project.

Used by: Memory module browse UI, audit/review.

### 3. Contextual Auto-Fetch
When a user is in a module (e.g., viewing Client X), the system automatically retrieves top-N relevant memories for that context and makes them available to AI agents.

No user action required. The AI just "knows" relevant history.

## Embedding Strategy

- **Model**: Use the AI provider's embedding endpoint (e.g., Voyage AI, OpenAI text-embedding-3-small, or a local model)
- **Chunking**: Memories are typically short (1-3 paragraphs). No chunking needed for most entries. For long agent outputs, chunk at paragraph boundaries with overlap.
- **Dimensions**: Match vector store config (e.g., 1536 for OpenAI, 1024 for Voyage)
- **Re-embedding**: If embedding model changes, batch re-embed all entries. Migration script required.

## Write Rules

1. **Automatic capture**: Project and client lifecycle events write memories automatically. No user action needed.
2. **Conversation capture**: AI responses are NOT auto-saved. Only explicitly useful outputs (briefs, analyses, reports) are saved — either by user action ("save this") or agent decision.
3. **Deduplication**: Before writing, check for semantic similarity > 0.95 with existing entries in the same source scope. If found, update instead of creating a duplicate.
4. **No deletion**: Memories are never deleted through normal operation. Founder can purge via Settings. Expired entries are hidden but not removed.

## Read Rules

1. **Role-scoped**: A user can only retrieve memories their role permits access to. A DESIGN_INTERN cannot search finance-tagged memories.
2. **Recency bias**: When relevance scores are close, prefer recent memories.
3. **Source attribution**: Every retrieved memory shows its source type and date. The user always knows where information came from.

## Memory in AI Context

When an agent runs, memory is injected into the prompt as:

```
[RELEVANT CONTEXT]
- (2026-06-15, CLIENT) Client prefers minimal aesthetics, mentioned in kickoff call
- (2026-06-20, PROJECT) Project scope expanded to include social media templates
- (2026-07-01, AGENT) Last month's revenue analysis showed 15% growth
[END CONTEXT]
```

Max context tokens allocated to memory: configurable per agent (default 2000 tokens).
