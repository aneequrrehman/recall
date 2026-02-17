---
title: Add Memory to Your Next.js Chatbot
description: Build a Next.js chatbot that remembers users across conversations using Recall and the Vercel AI SDK.
---

Build a production-ready chatbot that remembers your users. By the end of this tutorial, your chatbot will extract facts from conversations, store them persistently, and use them to personalize future responses.

## What You'll Build

A Next.js chatbot that:

- Remembers user preferences, facts, and context across sessions
- Extracts memories automatically using LLMs
- Retrieves relevant memories for each conversation
- Uses background jobs to avoid slowing down responses

## Prerequisites

- Node.js 18+
- OpenAI API key
- Basic familiarity with Next.js

## Step 1: Create a New Next.js Project

```bash
npx create-next-app@latest recall-chatbot --typescript --tailwind --app
cd recall-chatbot
```

## Step 2: Install Dependencies

```bash
npm install @youcraft/recall @youcraft/recall-ai-sdk \
  @youcraft/recall-adapter-sqlite @youcraft/recall-embeddings-openai \
  @youcraft/recall-extractor-openai ai @ai-sdk/openai
```

## Step 3: Set Up Environment Variables

Create `.env.local`:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

## Step 4: Create the Memory Instance

Create `lib/memory.ts`:

```typescript
import { createMemory } from '@youcraft/recall'
import { createRecall } from '@youcraft/recall-ai-sdk'
import { sqliteAdapter } from '@youcraft/recall-adapter-sqlite'
import { openaiEmbeddings } from '@youcraft/recall-embeddings-openai'
import { openaiExtractor } from '@youcraft/recall-extractor-openai'

// Create the memory instance with all providers
export const memory = createMemory({
  db: sqliteAdapter({ filename: 'memories.db' }),
  embeddings: openaiEmbeddings({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'text-embedding-3-small',
  }),
  extractor: openaiExtractor({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o-mini',
  }),
})

// Create the Recall wrapper for AI SDK
export const recall = createRecall({
  memory,
  // Extract memories after each conversation
  onExtract: async ({ messages, userId }) => {
    // For production, use a background job (Inngest, BullMQ, etc.)
    // For this tutorial, we'll extract synchronously
    const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n')

    await memory.extract(conversation, { userId })
  },
})
```

## Step 5: Create the Chat API Route

Create `app/api/chat/route.ts`:

```typescript
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { recall } from '@/lib/memory'

export async function POST(req: Request) {
  const { messages, userId = 'default-user' } = await req.json()

  // The recall wrapper automatically:
  // 1. Queries relevant memories for this user
  // 2. Injects them into the system prompt
  // 3. Triggers onExtract after the response
  const result = streamText({
    model: recall(openai('gpt-4o-mini'), { userId }),
    system: `You are a helpful assistant. Use the memories provided to personalize your responses.`,
    messages,
  })

  return result.toDataStreamResponse()
}
```

## Step 6: Create the Chat UI

Create `app/page.tsx`:

```tsx
'use client'

import { useChat } from 'ai/react'
import { useState } from 'react'

export default function Chat() {
  const [userId] = useState('user_' + Math.random().toString(36).slice(2, 9))

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    body: { userId },
  })

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p>Start chatting! I'll remember what you tell me.</p>
            <p className="text-sm mt-2">Try: "My name is Alex and I love TypeScript"</p>
          </div>
        )}

        {messages.map(message => (
          <div
            key={message.id}
            className={`p-4 rounded-lg ${
              message.role === 'user' ? 'bg-blue-100 ml-12' : 'bg-gray-100 mr-12'
            }`}
          >
            <p className="text-sm font-medium mb-1">
              {message.role === 'user' ? 'You' : 'Assistant'}
            </p>
            <p>{message.content}</p>
          </div>
        ))}

        {isLoading && (
          <div className="bg-gray-100 p-4 rounded-lg mr-12 animate-pulse">Thinking...</div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Say something..."
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
```

## Step 7: Run Your Chatbot

```bash
npm run dev
```

Open http://localhost:3000 and try these conversations:

**First conversation:**

> "Hi! My name is Alex and I'm a software engineer working on AI projects."

**Later conversation:**

> "What kind of projects would be good for me to work on?"

The assistant will remember you're Alex, a software engineer interested in AI!

## How It Works

### Memory Extraction

When you say "My name is Alex and I'm a software engineer", Recall extracts:

- "User's name is Alex"
- "User is a software engineer"
- "User works on AI projects"

### Memory Retrieval

On each new message, Recall:

1. Embeds the user's message
2. Finds similar memories via vector search
3. Injects them into the system prompt

### Memory Consolidation

If you later say "Actually, I'm a senior software engineer now", Recall **updates** the existing memory rather than creating duplicates.

## Production Tips

### Use Background Jobs for Extraction

Memory extraction involves an LLM call and can take 1-2 seconds. Don't block your response:

```typescript
// With Inngest
import { inngest } from '@/lib/inngest'

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

### Use PostgreSQL for Production

SQLite is great for development, but use PostgreSQL with pgvector for production:

```bash
npm install @youcraft/recall-adapter-postgresql pg pgvector
```

```typescript
import { postgresAdapter } from '@youcraft/recall-adapter-postgresql'

const memory = createMemory({
  db: postgresAdapter({
    connectionString: process.env.DATABASE_URL!,
    usePgVector: true,
  }),
  // ...
})
```

### Add User Authentication

Replace the random userId with your actual user ID from authentication:

```typescript
import { auth } from '@/lib/auth' // Your auth solution

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Use the authenticated user ID
  const result = streamText({
    model: recall(openai('gpt-4o-mini'), { userId: session.user.id }),
    // ...
  })
}
```

## Next Steps

- [Structured Memory](/structured) — For precise data like expenses, workouts, medications
- [Background Extraction with Inngest](/examples/with-inngest) — Production-ready example
- [PostgreSQL Adapter](/database-adapters/postgresql) — Scale to production
