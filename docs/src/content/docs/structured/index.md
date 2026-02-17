---
title: Structured Memory
description: Track structured data with predefined schemas. Let the LLM handle detection and CRUD.
---

**Recall Structured** complements Recall Core by adding schema-based memory. While Recall Core stores unstructured facts, Recall Structured lets you define **schemas** for specific data you want to track—and the LLM automatically detects, extracts, and manages that data.

```typescript
import { createStructuredMemory } from '@youcraft/recall-structured'
import { z } from 'zod'

const memory = createStructuredMemory({
  db: 'memory.db',
  llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY },
  schemas: {
    payments: {
      description: 'Financial transactions made by the user',
      schema: z.object({
        recipient: z.string(),
        amount: z.number(),
        description: z.string().optional(),
      }),
    },
  },
})

// User says: "Paid Jayden $150 for MMA training"
const result = await memory.process(userMessage, { userId: 'user_123' })
// → { matched: true, schema: 'payments', action: 'insert', data: { recipient: 'Jayden', amount: 150, description: 'MMA training' } }
```

## Recall Core + Recall Structured

Recall Core and Recall Structured are designed to **work together**, providing a complete memory system for LLMs. They handle different types of information:

| Aspect         | Recall Core                 | Recall Structured            |
| -------------- | --------------------------- | ---------------------------- |
| **Data model** | Unstructured facts          | Predefined schemas           |
| **Storage**    | Vector embeddings           | SQLite tables                |
| **Retrieval**  | Semantic search             | SQL queries                  |
| **Use case**   | "User likes coffee"         | "Paid $150 to Jayden"        |
| **Querying**   | Natural language similarity | Aggregations, filters, joins |

**Use Recall Core** for general facts and preferences—things that don't fit a strict schema.

**Use Recall Structured** for specific, queryable data like:

- Payments and expenses
- Workouts and health metrics
- Medications and supplements
- Tasks and todos
- Any data that benefits from SQL queries

**Use both together** for a powerful memory system that remembers preferences _and_ tracks structured data.

## Why Structured Memory?

### 1. Precise Queries

With Recall Core, you get similarity search:

```typescript
// Recall Core
await memory.query('How much did I pay Jayden?')
// → ["User paid Jayden $150 for training", "User paid Jayden $100 last month"]
// You still need to parse and sum these yourself
```

With structured memory, you get SQL-powered queries:

```typescript
// Recall Structured
await memory.query('How much have I paid Jayden total?', { userId })
// → 250 (actual number, computed via SUM())
```

### 2. Data Integrity

Zod schemas validate data before storage:

```typescript
schema: z.object({
  recipient: z.string(), // Required
  amount: z.number(), // Must be a number
  date: z.string().optional(), // Optional
})
```

Invalid data is rejected, not silently stored.

### 3. Explicit Record Operations

Recall Core consolidates facts semantically—merging similar information automatically. Recall Structured gives you explicit control over individual records:

```typescript
// User: "Actually, change that payment to $200"
// → Finds the specific record by criteria, updates it

// User: "Delete my last workout"
// → Finds the exact record, removes it
```

Each record has an ID, timestamps, and can be updated or deleted precisely.

### 4. Multi-hop Agent

Complex operations like "Update my last payment to Jayden to $200" require:

1. Search for payments to Jayden
2. Find the most recent one
3. Update the amount

Recall Structured handles this automatically with a multi-hop agent.

## How It Works

Recall Structured uses a **two-phase architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Phase 1: EXTRACTION                         │
│    • Detect intent (insert/update/delete/query)                 │
│    • Match to schema                                            │
│    • Extract field values                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
     ┌─────────┐        ┌──────────┐       ┌───────────────┐
     │ INSERT  │        │  QUERY   │       │ UPDATE/DELETE │
     │  Done   │        │   Done   │       │   Phase 2     │
     └─────────┘        └──────────┘       └───────────────┘
                                                  │
                                                  ▼
                    ┌─────────────────────────────────────────────┐
                    │            Phase 2: AGENT                    │
                    │    • Search for matching records             │
                    │    • Perform update/delete                   │
                    │    • Multi-hop tool calls                    │
                    └─────────────────────────────────────────────┘
```

**Phase 1** handles simple operations directly. **Phase 2** uses a multi-hop agent for complex operations that need to search before modifying.

## Key Features

- **Schema-based** — Define your data model with Zod
- **Intent detection** — Automatically classify insert/update/delete/query
- **Data extraction** — Parse natural language into structured fields
- **SQL queries** — Ask questions, get computed answers
- **Multi-hop agent** — Handle complex update/delete operations
- **Handlers** — React to data changes (sync to external DBs, trigger workflows)

## Get Started

1. **[Quickstart](/structured/quickstart)** — Set up structured memory in 5 minutes
2. **[Core Concepts](/structured/concepts)** — Understand schemas, extraction, and consolidation
3. **[Multi-hop Agent](/structured/agent)** — How complex operations work
4. **[API Reference](/structured/api)** — Full API documentation
