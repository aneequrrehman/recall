---
title: Quickstart
description: Add memory to your AI app in 5 minutes
---

Build a chatbot that remembers users across conversations. We'll use the Vercel AI SDK with Next.js, but Recall works with any framework.

## 1. Install Packages

```bash
npm install @youcraft/recall @youcraft/recall-ai-sdk \
  @youcraft/recall-adapter-sqlite @youcraft/recall-embeddings-openai \
  @youcraft/recall-extractor-openai ai @ai-sdk/openai
```

## 2. Create Memory Instance

```typescript
// lib/memory.ts
import { createMemory } from '@youcraft/recall'
import { createRecall } from '@youcraft/recall-ai-sdk'
import { sqliteAdapter } from '@youcraft/recall-adapter-sqlite'
import { openaiEmbeddings } from '@youcraft/recall-embeddings-openai'
import { openaiExtractor } from '@youcraft/recall-extractor-openai'

export const memory = createMemory({
  db: sqliteAdapter({ filename: 'memories.db' }),
  embeddings: openaiEmbeddings({ apiKey: process.env.OPENAI_API_KEY! }),
  extractor: openaiExtractor({ apiKey: process.env.OPENAI_API_KEY! }),
})

export const recall = createRecall({ memory })
```

## 3. Create Chat Endpoint

```typescript
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai'
import { streamText, convertToModelMessages } from 'ai'
import { recall } from '@/lib/memory'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: recall(openai('gpt-5-nano'), { userId: 'user_123' }),
    system: 'You are a helpful assistant.',
    messages: convertToModelMessages(messages),
  })

  return result.toDataStreamResponse()
}
```

**That's it.** Your chatbot now:

- Queries relevant memories before each response
- Injects them into the system prompt automatically

## 4. Add Memory Extraction

Memory extraction can be slow since it involves an LLM call. To avoid delaying responses, offload extraction to a background job using something like [Inngest](https://inngest.com):

```typescript
// lib/memory.ts
export const recall = createRecall({
  memory,
  onExtract: async ({ messages, userId }) => {
    await inngest.send({
      name: 'memory/extract',
      data: { messages, userId },
    })
  },
})
```

:::tip
For quick testing, you can call `memory.extract(conversation, { userId })` directly in `onExtract` instead of using a background job.
:::

## What Gets Extracted?

When a user says:

> "I'm a software engineer at Acme Corp. I mostly work with TypeScript on backend services."

Recall extracts:

- User is a software engineer
- User works at Acme Corp
- User works with TypeScript
- User focuses on backend services

These are stored as separate, queryable memories.

## What Gets Injected?

When the user asks something, relevant memories are injected into the prompt:

```
<memories>
- User is a software engineer at Acme Corp
- User works with TypeScript
- User focuses on backend services
</memories>

You are a helpful assistant.
```

The AI now has context without you managing it manually.

## Memory Consolidation

Recall is smart about updates. If you already have "User's name is John" and extract "User's full name is John Doe", it **updates** the existing memory instead of creating a duplicate.

```typescript
// First conversation
await memory.extract('User: My name is John', { userId })
// Stores: "User's name is John"

// Later conversation
await memory.extract('User: My full name is John Doe', { userId })
// Updates to: "User's name is John Doe"
```

## Core API

Need more control? Use the core API directly:

```typescript
import { memory } from '@/lib/memory'

// Extract memories from text
await memory.extract(conversation, { userId: 'user_123' })

// Query with natural language
const relevant = await memory.query('What does the user do?', {
  userId: 'user_123',
  limit: 5,
})

// CRUD operations
const all = await memory.list('user_123')
const one = await memory.get('memory_id')
await memory.update('memory_id', { content: 'Updated' })
await memory.delete('memory_id')
await memory.clear('user_123')
```

## Next Steps

- **[AI SDK Integration](/integrations/ai-sdk)** — Full API reference and advanced options
- **[Examples](https://github.com/youcraftinc/recall/tree/main/examples)** — Complete working examples on GitHub
