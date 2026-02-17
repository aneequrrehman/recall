# CLAUDE.md

This file provides guidance for AI assistants working with the Recall codebase.

## Project Overview

Recall is a memory layer for AI applications that runs inside your stack. Unlike hosted memory services, Recall stores memories in your existing database with zero vendor lock-in. It provides:

- LLM-powered fact extraction from conversations
- Intelligent memory consolidation (ADD/UPDATE/DELETE/NONE decisions)
- Vector similarity search using embeddings
- Pluggable architecture for databases, embeddings, and extractors

## Repository Structure

This is a **pnpm monorepo** using **Turborepo** for build orchestration.

```
recall/
├── packages/           # Published npm packages
│   ├── core/           # @youcraft/recall - Core memory client
│   ├── adapter-sqlite/ # @youcraft/recall-adapter-sqlite
│   ├── adapter-postgresql/ # @youcraft/recall-adapter-postgresql
│   ├── adapter-mysql/  # @youcraft/recall-adapter-mysql
│   ├── embeddings-openai/ # @youcraft/recall-embeddings-openai
│   ├── embeddings-cohere/ # @youcraft/recall-embeddings-cohere
│   ├── extractor-openai/ # @youcraft/recall-extractor-openai
│   ├── extractor-anthropic/ # @youcraft/recall-extractor-anthropic
│   ├── ai-sdk/         # @youcraft/recall-ai-sdk - Vercel AI SDK integration
│   ├── mcp/            # @youcraft/recall-mcp - MCP tool definitions
│   ├── mcp-server/     # @youcraft/recall-mcp-server - MCP server
│   └── recall-structured/ # @youcraft/recall-structured - Schema-based memory
├── apps/
│   └── web/            # Next.js dashboard app with auth & API
├── examples/
│   ├── with-inngest/   # Inngest background extraction example
│   ├── with-inngest-structured/ # Structured memory with Inngest
│   └── with-wdk/       # Vercel Workflow DevKit example
├── docs/               # Astro documentation site
├── package.json        # Root package.json with workspace scripts
├── pnpm-workspace.yaml # Workspace configuration
├── turbo.json          # Turborepo task configuration
└── vitest.workspace.ts # Vitest workspace configuration
```

## Key Packages

### Core (`packages/core`)

The main memory client. Exports:

- `createMemory(config)` - Factory function returning a memory client
- `MemoryClient` - Type for the returned client
- `inMemoryAdapter` - In-memory adapter for testing
- Core types: `Memory`, `DatabaseAdapter`, `EmbeddingsProvider`, `ExtractorProvider`

### Database Adapters

All adapters implement `DatabaseAdapter` interface:

- `adapter-sqlite` - Uses `better-sqlite3`, stores embeddings as JSON
- `adapter-postgresql` - Uses `pg`, designed for pgvector
- `adapter-mysql` - Uses `mysql2`

### Embeddings Providers

All implement `EmbeddingsProvider` interface:

- `embeddings-openai` - OpenAI text-embedding models
- `embeddings-cohere` - Cohere embed models

### Extractor Providers

All implement `ExtractorProvider` interface with optional `consolidate()`:

- `extractor-openai` - GPT-based fact extraction
- `extractor-anthropic` - Claude-based fact extraction

### AI SDK Integration (`packages/ai-sdk`)

Wraps Vercel AI SDK models with memory capabilities:

```typescript
const recall = createRecall({ memory, onExtract })
const model = recall(anthropic('claude-sonnet-4-20250514'), { userId })
```

### Structured Memory (`packages/recall-structured`)

Schema-based memory with Zod validation. Supports:

- Pure classification
- Data extraction
- Intent processing (query/insert/update/delete)
- Agent with CRUD tools

## Core Memory Extraction & Processing

### Overview

The core memory system uses a two-phase LLM approach:

1. **Extraction** - Extract discrete facts from conversation text
2. **Consolidation** - For each fact, decide how to merge with existing memories

### Extraction Phase

When `memory.extract(text, { userId })` is called:

```
Input Text → LLM Extraction → Array of Facts
```

The extractor uses structured output (Zod schema) to extract atomic facts:

```typescript
// Extraction prompt focuses on:
// - Personal preferences, facts, relationships, goals
// - User's name (high priority)
// - Persistent information (not transient queries)
// - Third-person format: "User's name is John", "User lives in NYC"

const extracted = await extractor.extract(text)
// Returns: [{ content: "User likes TypeScript" }, { content: "User works at Acme" }]
```

### Consolidation Phase

For each extracted fact, the system prevents duplicates:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  New Fact       │────▶│  Embed & Search  │────▶│  Similar        │
│  "Name is John" │     │  (top 5)         │     │  Memories       │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                        ┌──────────────────┐              │
                        │  UUID → Integer  │◀─────────────┘
                        │  Mapping         │
                        └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │  LLM Decision    │
                        │  ADD/UPDATE/     │
                        │  DELETE/NONE     │
                        └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │  Execute Action  │
                        └──────────────────┘
```

### Consolidation Actions

| Action     | When Used                                | Example                                             |
| ---------- | ---------------------------------------- | --------------------------------------------------- |
| **ADD**    | New information not in existing memories | "User works at Google" (no job info exists)         |
| **UPDATE** | Enriches or corrects existing memory     | "Name is John Doe" updates "Name is John"           |
| **DELETE** | New info contradicts existing            | "User no longer works at Google" deletes job memory |
| **NONE**   | Fact already exists (duplicate)          | "Name is John" when already stored                  |

### UUID-to-Integer Mapping (Anti-Hallucination)

LLMs tend to hallucinate or modify UUIDs. The system maps real UUIDs to simple integers:

```typescript
// Before sending to LLM:
// Real: [{ id: "550e8400-e29b-...", content: "Name is John" }]
// Sent: [{ id: "0", content: "Name is John" }]

const idMapping: Record<string, string> = {}
existingMemories.map((m, idx) => {
  idMapping[String(idx)] = m.id // "0" -> "550e8400-e29b-..."
  return { id: String(idx), content: m.content }
})

// After LLM responds with id: "0", map back:
const realId = idMapping[decision.id] // "550e8400-e29b-..."
```

### Complete Flow (packages/core/src/memory.ts)

```typescript
async extract(text: string, options: ExtractOptions): Promise<Memory[]> {
  // 1. Extract facts from text
  const extracted = await extractor.extract(text)

  for (const item of extracted) {
    // 2. Generate embedding for the fact
    const embedding = await embeddings.embed(item.content)

    // 3. Find similar existing memories
    const similar = await db.queryByEmbedding(embedding, userId, 5)

    // 4. Map UUIDs to integers
    const idMapping: Record<string, string> = {}
    const existingMemories = similar.map((m, idx) => {
      idMapping[String(idx)] = m.id
      return { id: String(idx), content: m.content }
    })

    // 5. Get consolidation decision from LLM
    const decision = await extractor.consolidate(item.content, existingMemories)

    // 6. Map integer ID back to UUID
    if (decision.id && decision.id in idMapping) {
      decision.id = idMapping[decision.id]
    }

    // 7. Execute the decision
    switch (decision.action) {
      case 'ADD':    await db.insert(...)
      case 'UPDATE': await db.update(decision.id, ...)
      case 'DELETE': await db.delete(decision.id)
      case 'NONE':   // Skip - already exists
    }
  }
}
```

## Structured Memory Processing

### Overview

Structured memory (`@youcraft/recall-structured`) provides schema-based memory with:

- **Predefined Zod schemas** - Define what data you want to track
- **Intent detection** - LLM determines insert/query/update/delete/none
- **Automatic extraction** - LLM extracts field values from natural language
- **SQL query generation** - For query intents, generates and executes SQL

### Intent Types

| Intent     | Description           | Example Input                    |
| ---------- | --------------------- | -------------------------------- |
| **insert** | Log new data          | "Paid Jayden $150 for training"  |
| **query**  | Ask about data        | "How much have I paid Jayden?"   |
| **update** | Modify existing       | "Actually I paid $200, not $150" |
| **delete** | Remove data           | "Delete that last payment"       |
| **none**   | Doesn't match schemas | "I love pizza"                   |

### Processing Flow

```
┌─────────────────┐
│  User Input     │
│  "Paid $150..." │
└────────┬────────┘
         │
┌────────▼────────┐
│ Intent Processor│
│ (LLM)           │
└────────┬────────┘
         │
    ┌────┴────┬─────────┬─────────┐
    │         │         │         │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│INSERT │ │ QUERY │ │UPDATE │ │DELETE │
└───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘
    │         │         │         │
┌───▼───┐ ┌───▼─────┐ ┌─▼───────┐ ┌▼────────┐
│Extract│ │Generate │ │Find by  │ │Find by  │
│Fields │ │SQL      │ │criteria │ │criteria │
└───┬───┘ └───┬─────┘ └─┬───────┘ └┬────────┘
    │         │         │          │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│Validate│ │Execute│ │Update │ │Delete │
│& Insert│ │Query  │ │Record │ │Record │
└────────┘ └───────┘ └───────┘ └───────┘
```

### Schema Definition

```typescript
import { z } from 'zod'
import { createStructuredMemory } from '@youcraft/recall-structured'

const memory = createStructuredMemory({
  db: 'memory.db',
  llm: { apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-5-nano' },
  schemas: {
    payments: {
      description: 'Track payments and expenses',
      schema: z.object({
        recipient: z.string(),
        amount: z.number(),
        description: z.string().optional(),
        date: z.string(),
      }),
    },
    workouts: {
      description: 'Track exercise and workouts',
      schema: z.object({
        type: z.string(),
        duration: z.number().optional(),
        distance: z.number().optional(),
        date: z.string(),
      }),
    },
  },
})
```

### Process Method

```typescript
// INSERT - extracts fields and stores
const result = await memory.process('Paid Jayden $150 for training', { userId: 'user_1' })
// { matched: true, schema: 'payments', action: 'insert',
//   data: { recipient: 'Jayden', amount: 150, description: 'training', date: '2024-01-15' } }

// QUERY - generates and executes SQL
const result = await memory.process('How much have I paid Jayden?', { userId: 'user_1' })
// { matched: true, schema: 'payments', action: 'query',
//   sql: 'SELECT SUM(amount) FROM payments WHERE user_id = ? AND recipient = ?',
//   result: 150 }

// UPDATE - finds record and updates
const result = await memory.process('Actually I paid Jayden $200', { userId: 'user_1' })
// { matched: true, schema: 'payments', action: 'update', id: '...',
//   data: { amount: 200 } }

// DELETE - finds and removes
const result = await memory.process('Delete that payment to Jayden', { userId: 'user_1' })
// { matched: true, schema: 'payments', action: 'delete', id: '...' }
```

### Match Criteria for UPDATE/DELETE

For update and delete operations, the LLM extracts criteria to find the target record:

```typescript
interface RecordMatchCriteria {
  field: string // e.g., "recipient"
  value: string // e.g., "Jayden"
  recency: 'most_recent' | 'today' | 'this_week' | 'any'
}

// "Delete that last payment" → recency: 'most_recent'
// "Update today's workout" → recency: 'today'
// "Change the payment to Jayden" → field: 'recipient', value: 'Jayden'
```

### Handlers (Optional Callbacks)

```typescript
const memory = createStructuredMemory({
  // ... config
  handlers: {
    payments: {
      onInsert: async (data, ctx) => {
        // Called after insert - sync to external system
        await externalAPI.createPayment(data)
      },
      onUpdate: async (id, data, ctx) => {
        await externalAPI.updatePayment(id, data)
      },
      onDelete: async (id, ctx) => {
        await externalAPI.deletePayment(id)
      },
    },
  },
})
```

### Classification Rules

The intent processor follows strict rules:

**Should Match (INSERT):**

- Concrete events: "Paid Jayden $150", "Ran 5km this morning"
- Currently happening: "Taking 500mg ibuprofen twice daily"

**Should NOT Match:**

- Intentions: "I should work out more"
- Questions: "How much did I pay?" (this is QUERY, not INSERT)
- Opinions: "I hate running"
- General statements: "Money is tight this month"

## Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Run tests once (no watch)
pnpm test:run

# Type checking
pnpm typecheck

# Development mode (watch)
pnpm dev

# Publish packages
pnpm publish-packages
```

### Package-specific commands

Each package supports:

```bash
pnpm build     # Build with tsup
pnpm dev       # Watch mode
pnpm test      # Run vitest in watch mode
pnpm test:run  # Run vitest once
pnpm typecheck # TypeScript check
```

## Code Conventions

### TypeScript

- Target: ES2022
- Module: ESNext with bundler resolution
- Strict mode enabled
- All packages use tsup for building (CJS + ESM dual output)

### Package Structure

```
packages/[name]/
├── src/
│   ├── index.ts        # Public exports only
│   ├── [main-file].ts  # Implementation
│   ├── types.ts        # Type definitions (if needed)
│   └── __tests__/      # Vitest tests
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts    # Optional, uses workspace config
```

### Export Pattern

Packages use explicit exports in `index.ts`:

```typescript
export { functionName, type TypeName } from './module'
```

### Naming Conventions

- Packages: `@youcraft/recall-[type]-[provider]`
  - adapters: `@youcraft/recall-adapter-[db]`
  - embeddings: `@youcraft/recall-embeddings-[provider]`
  - extractors: `@youcraft/recall-extractor-[provider]`
- Factory functions: `create[Thing]()` (e.g., `createMemory`, `createRecall`)
- Adapter functions: `[db]Adapter()` (e.g., `sqliteAdapter`)

### Interface Pattern

Provider interfaces follow this pattern:

```typescript
export interface DatabaseAdapter {
  insert(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<Memory>
  update(id: string, data: Partial<...>): Promise<Memory>
  delete(id: string): Promise<void>
  get(id: string): Promise<Memory | null>
  list(userId: string, options?: ListOptions): Promise<Memory[]>
  count(userId: string): Promise<number>
  clear(userId: string): Promise<void>
  queryByEmbedding(embedding: number[], userId: string, limit: number): Promise<Memory[]>
}
```

## Testing

### Test Framework

- Vitest with workspace configuration
- Tests in `src/__tests__/*.test.ts`
- Mock providers for unit testing

### Test Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('featureName', () => {
  beforeEach(() => {
    // Reset state
  })

  it('does something specific', async () => {
    // Arrange
    const mockDep = vi.fn().mockResolvedValue(...)

    // Act
    const result = await functionUnderTest(...)

    // Assert
    expect(result).toEqual(...)
    expect(mockDep).toHaveBeenCalledWith(...)
  })
})
```

## Apps

### Web Dashboard (`apps/web`)

Next.js 16 app with:

- NextAuth.js authentication
- Drizzle ORM with PostgreSQL
- Vercel Workflow DevKit integration
- API routes for memory CRUD
- Playground for testing memory extraction

## Common Tasks

### Adding a New Adapter

1. Create `packages/adapter-[name]/`
2. Implement `DatabaseAdapter` interface
3. Export factory function: `[name]Adapter(config): DatabaseAdapter`
4. Add to `vitest.workspace.ts`

### Adding a New Provider

1. Create `packages/[type]-[provider]/`
2. Implement the appropriate interface
3. Export factory function with config type
4. Add tests with mocked API calls

### Running the Web App

```bash
cd apps/web
cp .env.example .env.local
# Add required env vars
pnpm dev
```

## Dependencies

### Key Dependencies

- `better-sqlite3` - SQLite for adapters
- `openai` - OpenAI API client
- `ai` - Vercel AI SDK
- `zod` - Schema validation (recall-structured)

### Peer Dependencies

Packages declare peer dependencies for flexibility:

- Database drivers (`better-sqlite3`, `pg`, `mysql2`)
- AI SDKs (`ai`, `openai`)
- Core package (`@youcraft/recall`)

## Environment Variables

Common variables used across packages:

- `OPENAI_API_KEY` - For OpenAI embeddings/extractor
- `ANTHROPIC_API_KEY` - For Anthropic extractor
- `COHERE_API_KEY` - For Cohere embeddings
- `DATABASE_URL` - For PostgreSQL adapter
