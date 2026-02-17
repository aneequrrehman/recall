---
title: with-inngest-structured
description: Chat application using Recall Structured with Inngest for schema-based memory extraction.
---

A complete Next.js chat application that demonstrates Recall Structured with [Inngest](https://inngest.com) for schema-based memory extraction and CRUD operations.

## Features

- Chat interface with OpenAI GPT
- Schema-based memory with Zod validation
- Full CRUD operations (insert, update, delete, query)
- Multi-hop agent for complex operations
- Two-phase architecture (extraction + consolidation)
- SQLite persistence

## Prerequisites

- Node.js 18+
- pnpm
- OpenAI API key
- Inngest CLI (for local development)

## Setup

### 1. Install dependencies

```bash
cd examples/with-inngest-structured
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Add your OpenAI API key to `.env`:

```
OPENAI_API_KEY=sk-proj-your-key-here
```

### 3. Start the development server

In one terminal, start the Next.js app:

```bash
pnpm dev
```

In another terminal, start the Inngest dev server:

```bash
pnpm dev:inngest
```

### 4. Open the app

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/          # Chat endpoint
│   │   ├── inngest/       # Inngest webhook
│   │   └── records/       # List records endpoint
│   └── page.tsx
├── components/
│   ├── chat-interface.tsx
│   └── records-panel.tsx
└── lib/
    ├── structured-memory.ts  # Schema definitions
    └── inngest/
        ├── client.ts
        └── functions.ts      # Two-phase processing
```

## How It Works

### Define Schemas

```typescript
// src/lib/structured-memory.ts
import { createStructuredMemory } from '@youcraft/recall-structured'
import { z } from 'zod'

export const structuredMemory = createStructuredMemory({
  db: 'structured.db',
  llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY },
  schemas: {
    payments: {
      description: 'Financial transactions and payments made by the user',
      schema: z.object({
        recipient: z.string().describe('Who received the payment'),
        amount: z.number().describe('Payment amount in dollars'),
        description: z.string().optional().describe('What the payment was for'),
      }),
    },
    workouts: {
      description: 'Exercise and fitness activities',
      schema: z.object({
        type: z.string().describe('Type of workout'),
        duration: z.number().optional().describe('Duration in minutes'),
        notes: z.string().optional(),
      }),
    },
  },
})
```

### Two-Phase Processing

The Inngest function implements a two-phase approach:

```typescript
// src/lib/inngest/functions.ts
export const processStructuredMemory = inngest.createFunction(
  { id: 'process-structured-memory' },
  { event: 'chat/message.completed' },
  async ({ event, step }) => {
    const { userId, message } = event.data

    // PHASE 1: Extract structured data
    const extraction = await step.run('extract', async () => {
      return structuredMemory.process(message, { userId })
    })

    // For INSERT/QUERY - extraction handles it
    if (extraction.action === 'insert' || extraction.action === 'query') {
      return extraction
    }

    // PHASE 2: For UPDATE/DELETE - use multi-hop agent
    if (extraction.action === 'update' || extraction.action === 'delete') {
      const agent = createStructuredMemoryAgent({ structuredMemory })
      const result = await step.run('agent-process', async () => {
        return agent.process(model, message, {
          userId,
          extractedContext: extraction,
        })
      })
      return result
    }
  }
)
```

### Example Interactions

**Insert:**

```
User: "Paid Jayden $150 for MMA training"
→ Detects: payments schema, insert action
→ Extracts: { recipient: "Jayden", amount: 150, description: "MMA training" }
→ Inserts record
```

**Update:**

```
User: "Actually, change that payment to $200"
→ Detects: payments schema, update action
→ Agent searches for recent payment
→ Updates amount to 200
```

**Query:**

```
User: "How much have I paid Jayden total?"
→ Detects: payments schema, query action
→ Runs SQL aggregation
→ Returns: "You've paid Jayden $350 total"
```

**Delete:**

```
User: "Delete my last workout"
→ Detects: workouts schema, delete action
→ Agent finds most recent workout
→ Deletes the record
```

## Learn More

- [Recall Structured Documentation](/structured)
- [Two-Phase Architecture](/structured/concepts#two-phase-architecture)
- [Multi-hop Agent](/structured/agent)
- [Inngest Documentation](https://inngest.com/docs)
