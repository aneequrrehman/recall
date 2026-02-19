<p align="center">
  <img src=".github/assets/banner.svg" alt="Recall — AI memory layer that lives in your stack">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@youcraft/recall"><img src="https://img.shields.io/npm/v/@youcraft/recall.svg?style=flat-square" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@youcraft/recall"><img src="https://img.shields.io/npm/dm/@youcraft/recall.svg?style=flat-square" alt="npm downloads" /></a>
  <a href="https://github.com/aneequrrehman/recall/actions"><img src="https://img.shields.io/github/actions/workflow/status/aneequrrehman/recall/ci.yml?branch=main&style=flat-square" alt="CI status" /></a>
</p>

<p align="center">
Composable building blocks for adding persistent memory to AI applications.<br/>
LLM-powered fact extraction, intelligent deduplication, vector search, and <strong>queryable structured memory</strong> — all in your existing database.
</p>

---

## Quick Start

```bash
pnpm add @youcraft/recall @youcraft/recall-adapter-sqlite \
  @youcraft/recall-embeddings-openai @youcraft/recall-extractor-openai
```

```typescript
import { createMemory } from '@youcraft/recall'
import { sqliteAdapter } from '@youcraft/recall-adapter-sqlite'
import { openaiEmbeddings } from '@youcraft/recall-embeddings-openai'
import { openaiExtractor } from '@youcraft/recall-extractor-openai'

const memory = createMemory({
  db: sqliteAdapter({ filename: 'memories.db' }),
  embeddings: openaiEmbeddings({ apiKey: process.env.OPENAI_API_KEY! }),
  extractor: openaiExtractor({ apiKey: process.env.OPENAI_API_KEY! }),
})

// Extract memories from a conversation
await memory.extract(
  `User: I'm a software engineer working at Acme Corp.
   Assistant: Nice! What kind of projects do you work on?
   User: Mostly backend stuff in TypeScript.`,
  { userId: 'user_123' }
)

// Query relevant memories
const memories = await memory.query('What does the user do for work?', {
  userId: 'user_123',
  limit: 5,
})
// => [{ content: "User is a software engineer at Acme Corp", ... }]
```

---

## Why Recall?

Most apps today already have their own infrastructure — background jobs, vector databases, workflow engines, and code to store and retrieve embeddings. **Why deploy yet another service just for memory?**

Recall takes a different approach: **composable building blocks** that fit into your existing stack.

```
┌─────────────────────────────────────────────────────┐
│              Your Existing Infrastructure           │
│  ┌───────────┐  ┌───────────┐  ┌─────────────────┐  │
│  │ Background│  │  Vector   │  │    Database     │  │
│  │   Jobs    │  │  Search   │  │ (Postgres/etc)  │  │
│  └─────┬─────┘  └─────┬─────┘  └────────┬────────┘  │
│        │              │                 │           │
│        └──────────────┼─────────────────┘           │
│                       │                             │
│               ┌───────▼───────┐                     │
│               │    Recall     │  ← just a library   │
│               └───────────────┘                     │
└─────────────────────────────────────────────────────┘
```

### Building Blocks, Not a Service

Recall is a **library you import**, not a service you deploy. Pick the pieces you need:

- **Choose your database** — SQLite for local dev, Postgres for production, MySQL if that's what you have
- **Choose your embeddings** — OpenAI, Cohere, Voyage, or bring your own
- **Choose your extractor** — GPT, Claude, or implement the interface
- **Use your existing workflows** — Inngest, Vercel Workflow DevKit, or any background job system

### Two Flavors of Memory

|                 | Core Memory                   | Structured Memory                  |
| --------------- | ----------------------------- | ---------------------------------- |
| **Package**     | `@youcraft/recall`            | `@youcraft/recall-structured`      |
| **Storage**     | Vector similarity search      | SQL tables with schemas            |
| **Best for**    | Fuzzy recall, semantic search | Precise queries, analytics         |
| **Query style** | "What does the user like?"    | "How much did I spend last month?" |
| **Status**      | Stable                        | Experimental                       |

**Structured Memory** lets you define Zod schemas and query memories with SQL precision — perfect for tracking payments, workouts, medications, or any structured data.

---

## Features

- **LLM-powered extraction** — Automatically extract facts from conversations
- **Intelligent consolidation** — Deduplicate memories with ADD/UPDATE/DELETE/NONE decisions
- **Vector similarity search** — Find relevant memories using embeddings
- **Pluggable architecture** — Swap databases, embedding providers, and extractors
- **TypeScript-first** — Full type safety with comprehensive interfaces
- **Zero lock-in** — All data stays in your infrastructure

## How Memory Consolidation Works

When you call `extract()`, Recall doesn't just blindly insert new memories. It uses a two-step LLM process:

1. **Extract** — LLM identifies facts from the conversation
2. **Consolidate** — For each fact, Recall:
   - Searches for similar existing memories
   - Asks the LLM to decide: `ADD`, `UPDATE`, `DELETE`, or `NONE`
   - Executes the decision

```
New fact: "User's name is John Doe"
Existing: [{ id: "abc", content: "User's name is John" }]

LLM Decision: UPDATE (merge into "User's name is John Doe")
```

This prevents duplicate memories and keeps your memory store clean.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Application                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     @youcraft/recall (core)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   extract() │  │   query()   │  │  list/get/update/delete │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │                   │                     │
          ▼                   ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│    Extractor    │  │   Embeddings    │  │   Database Adapter  │
│ OpenAI/Anthropic│  │ OpenAI/Cohere/  │  │ SQLite/PostgreSQL/  │
│                 │  │ Voyage          │  │ MySQL               │
└─────────────────┘  └─────────────────┘  └─────────────────────┘
```

## API Reference

```typescript
// Extract and store memories from text (with automatic consolidation)
await memory.extract(text, { userId })

// Find relevant memories using vector similarity
await memory.query(context, { userId, limit?, threshold? })

// CRUD operations
await memory.list(userId)                          // List all memories
await memory.get(id)                               // Get single memory
await memory.update(id, { content?, metadata? })   // Update memory
await memory.delete(id)                            // Delete memory
await memory.clear(userId)                         // Clear all user memories
```

## Packages

### Core

| Package                                                       | Description                                                 |
| ------------------------------------------------------------- | ----------------------------------------------------------- |
| [`@youcraft/recall`](./packages/core)                         | Core memory client with extract, query, and CRUD operations |
| [`@youcraft/recall-structured`](./packages/recall-structured) | Schema-based structured memory with Zod validation          |
| [`@youcraft/recall-client`](./packages/client)                | Client SDK for hosted Recall API                            |

### Database Adapters

| Package                                                                | Description                              |
| ---------------------------------------------------------------------- | ---------------------------------------- |
| [`@youcraft/recall-adapter-sqlite`](./packages/adapter-sqlite)         | SQLite adapter using better-sqlite3      |
| [`@youcraft/recall-adapter-postgresql`](./packages/adapter-postgresql) | PostgreSQL adapter with pgvector support |
| [`@youcraft/recall-adapter-mysql`](./packages/adapter-mysql)           | MySQL adapter using mysql2               |

### Embeddings Providers

| Package                                                              | Description                  |
| -------------------------------------------------------------------- | ---------------------------- |
| [`@youcraft/recall-embeddings-openai`](./packages/embeddings-openai) | OpenAI text-embedding models |
| [`@youcraft/recall-embeddings-cohere`](./packages/embeddings-cohere) | Cohere embed models          |
| [`@youcraft/recall-embeddings-voyage`](./packages/embeddings-voyage) | Voyage AI embeddings         |

### Extractors

| Package                                                                  | Description                  |
| ------------------------------------------------------------------------ | ---------------------------- |
| [`@youcraft/recall-extractor-openai`](./packages/extractor-openai)       | GPT-based fact extraction    |
| [`@youcraft/recall-extractor-anthropic`](./packages/extractor-anthropic) | Claude-based fact extraction |

### Integrations

| Package                                                | Description                                    |
| ------------------------------------------------------ | ---------------------------------------------- |
| [`@youcraft/recall-ai-sdk`](./packages/ai-sdk)         | Vercel AI SDK integration                      |
| [`@youcraft/recall-mcp`](./packages/mcp)               | MCP tool definitions                           |
| [`@youcraft/recall-mcp-server`](./packages/mcp-server) | Standalone MCP server for Claude, Cursor, etc. |

## Examples

| Example                                                         | Description                                       |
| --------------------------------------------------------------- | ------------------------------------------------- |
| [`with-inngest`](./examples/with-inngest)                       | Next.js chatbot with background memory extraction |
| [`with-inngest-structured`](./examples/with-inngest-structured) | Structured memory with Inngest workflows          |
| [`with-wdk`](./examples/with-wdk)                               | Vercel Workflow DevKit integration                |
| [`with-client`](./examples/with-client)                         | Using the Recall client SDK                       |

## Documentation

Visit [recall-docs-sand.vercel.app](https://recall-docs-sand.vercel.app/) for full documentation:

- [Quick Start Guide](https://recall-docs-sand.vercel.app/quickstart)
- [Core Concepts](https://recall-docs-sand.vercel.app/concepts)
- [Structured Memory](https://recall-docs-sand.vercel.app/structured)
- [Database Adapters](https://recall-docs-sand.vercel.app/database-adapters)
- [Tutorials](https://recall-docs-sand.vercel.app/tutorials/nextjs-chatbot)

## License

MIT
