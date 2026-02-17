---
title: Persistent Memory with Vercel AI SDK
description: Add persistent memory to any Vercel AI SDK application with Recall. Works with OpenAI, Anthropic, and any AI SDK provider.
---

The Vercel AI SDK is the most popular way to build AI applications in JavaScript. This tutorial shows how to add persistent memory to any AI SDK application with just a few lines of code.

## How It Works

Recall provides a model wrapper that intercepts AI SDK calls to:

1. **Before generation**: Query relevant memories and inject them into the prompt
2. **After generation**: Extract new facts and store them for future use

```typescript
// Without memory
streamText({ model: openai('gpt-4o'), messages })

// With memory - that's it!
streamText({ model: recall(openai('gpt-4o'), { userId }), messages })
```

## Quick Setup

### 1. Install Packages

```bash
npm install @youcraft/recall @youcraft/recall-ai-sdk \
  @youcraft/recall-adapter-sqlite @youcraft/recall-embeddings-openai \
  @youcraft/recall-extractor-openai
```

### 2. Create Memory Instance

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

### 3. Wrap Your Model

```typescript
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { recall } from '@/lib/memory'

const result = streamText({
  model: recall(openai('gpt-4o-mini'), { userId: 'user_123' }),
  messages: [{ role: 'user', content: 'Hello!' }],
})
```

## Works with Any Provider

Recall wraps the model, not the provider. Use it with any AI SDK provider:

```typescript
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'

// OpenAI
recall(openai('gpt-4o'), { userId })

// Anthropic
recall(anthropic('claude-sonnet-4-20250514'), { userId })

// Google
recall(google('gemini-1.5-pro'), { userId })
```

## Configuration Options

### Memory Query Options

Control how memories are retrieved:

```typescript
const result = streamText({
  model: recall(openai('gpt-4o'), {
    userId: 'user_123',
    // Maximum memories to inject
    limit: 10,
    // Minimum similarity threshold (0-1)
    threshold: 0.7,
  }),
  messages,
})
```

### Custom System Prompt Integration

By default, memories are prepended to your system prompt:

```
<memories>
- User's name is Alex
- User prefers dark mode
- User is a software engineer
</memories>

Your actual system prompt here...
```

Customize this with `formatMemories`:

```typescript
export const recall = createRecall({
  memory,
  formatMemories: memories => {
    if (memories.length === 0) return ''

    return `## What I Know About This User
${memories.map(m => `- ${m.content}`).join('\n')}

Use this information to personalize your response.`
  },
})
```

### Background Extraction

Memory extraction can be slow. Offload it to avoid blocking responses:

```typescript
export const recall = createRecall({
  memory,
  onExtract: async ({ messages, userId }) => {
    // Option 1: Inngest
    await inngest.send({
      name: 'memory/extract',
      data: { messages, userId },
    })

    // Option 2: BullMQ
    await memoryQueue.add('extract', { messages, userId })

    // Option 3: Simple async (fire-and-forget)
    setImmediate(async () => {
      const text = messages.map(m => `${m.role}: ${m.content}`).join('\n')
      await memory.extract(text, { userId })
    })
  },
})
```

### Disable Auto-Extraction

If you want to control extraction manually:

```typescript
export const recall = createRecall({
  memory,
  autoExtract: false, // Don't extract automatically
})

// Extract manually when you want
await memory.extract(conversationText, { userId })
```

## Full Example: Multi-User Chat API

```typescript
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { recall, memory } from '@/lib/memory'

export async function POST(req: Request) {
  const { messages, userId } = await req.json()

  if (!userId) {
    return new Response('userId is required', { status: 400 })
  }

  const result = streamText({
    model: recall(openai('gpt-4o-mini'), {
      userId,
      limit: 5,
    }),
    system: `You are a helpful personal assistant. Be friendly and remember
what users tell you about themselves.`,
    messages,
  })

  return result.toDataStreamResponse()
}

// Optional: Endpoint to view a user's memories
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return new Response('userId is required', { status: 400 })
  }

  const memories = await memory.list(userId)
  return Response.json(memories)
}
```

## Streaming vs Non-Streaming

Recall works with all AI SDK functions:

```typescript
// Streaming
const result = streamText({
  model: recall(openai('gpt-4o'), { userId }),
  messages,
})

// Non-streaming
const result = await generateText({
  model: recall(openai('gpt-4o'), { userId }),
  messages,
})

// Object generation
const result = await generateObject({
  model: recall(openai('gpt-4o'), { userId }),
  schema: mySchema,
  messages,
})
```

## Using with useChat Hook

The `useChat` hook works seamlessly:

```tsx
'use client'
import { useChat } from 'ai/react'

export default function Chat({ userId }: { userId: string }) {
  const { messages, input, handleSubmit, handleInputChange } = useChat({
    body: { userId }, // Pass userId to the API
  })

  return (
    <form onSubmit={handleSubmit}>
      {messages.map(m => (
        <div key={m.id}>{m.content}</div>
      ))}
      <input value={input} onChange={handleInputChange} />
    </form>
  )
}
```

## Direct Memory Operations

Access the memory API directly when needed:

```typescript
import { memory } from '@/lib/memory'

// Query memories by semantic similarity
const relevant = await memory.query('user preferences', {
  userId: 'user_123',
  limit: 5,
})

// List all memories
const all = await memory.list('user_123')

// CRUD operations
await memory.update('memory_id', { content: 'Updated fact' })
await memory.delete('memory_id')
await memory.clear('user_123') // Delete all user memories
```

## Common Patterns

### Per-Conversation Memory

For chatbots where each conversation is separate:

```typescript
const result = streamText({
  model: recall(openai('gpt-4o'), {
    userId: `${userId}_${conversationId}`,
  }),
  messages,
})
```

### Shared Team Memory

For team workspaces where memory is shared:

```typescript
const result = streamText({
  model: recall(openai('gpt-4o'), {
    userId: `team_${teamId}`,
  }),
  messages,
})
```

### Hierarchical Memory

Combine personal and team memories:

```typescript
// Query both personal and team memories
const personalMemories = await memory.query(query, { userId })
const teamMemories = await memory.query(query, { userId: `team_${teamId}` })
const combined = [...personalMemories, ...teamMemories]
```

## Next Steps

- [Next.js Chatbot Tutorial](/tutorials/nextjs-chatbot) — Complete example with UI
- [Background Extraction](/examples/with-inngest) — Production-ready pattern
- [Structured Memory](/structured) — For precise data tracking
