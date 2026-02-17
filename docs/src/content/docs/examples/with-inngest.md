---
title: with-inngest
description: Chat application using Recall Core with Inngest for background memory extraction.
---

A complete Next.js chat application that demonstrates Recall Core with [Inngest](https://inngest.com) for background memory extraction.

## Features

- Chat interface with OpenAI GPT
- Automatic memory extraction via Inngest functions
- Real-time memory display panel
- SQLite persistence
- AI SDK wrapper for simplified integration

## Prerequisites

- Node.js 18+
- pnpm
- OpenAI API key
- Inngest CLI (for local development)

## Setup

### 1. Install dependencies

```bash
cd examples/with-inngest
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
│   │   ├── chat/          # Manual memory handling
│   │   ├── ai-sdk/        # AI SDK wrapper approach
│   │   ├── inngest/       # Inngest webhook endpoint
│   │   └── memories/      # List memories endpoint
│   └── page.tsx
├── components/
│   ├── chat-interface.tsx
│   └── memories-panel.tsx
└── lib/
    ├── memory.ts          # Recall instance + AI SDK wrapper
    └── inngest/
        ├── client.ts      # Inngest client
        └── functions.ts   # Memory extraction function
```

## How It Works

### Memory Instance

```typescript
// src/lib/memory.ts
import { createMemory } from '@youcraft/recall'
import { createRecall } from '@youcraft/recall-ai-sdk'

export const memory = createMemory({
  db: sqliteAdapter({ filename: 'recall.db' }),
  extractor: openaiExtractor({ apiKey: process.env.OPENAI_API_KEY! }),
  embeddings: openaiEmbeddings({ apiKey: process.env.OPENAI_API_KEY! }),
})

export const recall = createRecall({
  memory,
  onExtract: async ({ messages, userId }) => {
    await inngest.send({
      name: 'chat/message.completed',
      data: { userId, messages },
    })
  },
})
```

### Chat Endpoint

The example includes two chat endpoints:

**`/api/chat`** — Manual approach with explicit memory handling

**`/api/ai-sdk`** — Simplified approach using the `recall()` wrapper:

```typescript
// src/app/api/ai-sdk/route.ts
import { recall } from '@/lib/memory'

const result = streamText({
  model: recall(openai('gpt-5-nano'), { userId: USER_ID }),
  system: 'You are a helpful assistant.',
  messages: convertToModelMessages(messages),
})
```

### Inngest Function

```typescript
// src/lib/inngest/functions.ts
export const extractMemories = inngest.createFunction(
  { id: 'extract-memories' },
  { event: 'chat/message.completed' },
  async ({ event, step }) => {
    const { userId, messages } = event.data

    const conversation = await step.run('format-conversation', async () => {
      return messages.map(m => `${m.role}: ${m.content}`).join('\n')
    })

    const memories = await step.run('extract-memories', async () => {
      return memory.extract(conversation, { userId })
    })

    return { memoriesExtracted: memories.length }
  }
)
```

## Learn More

- [Recall Core Documentation](/quickstart)
- [Inngest Documentation](https://inngest.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai)
