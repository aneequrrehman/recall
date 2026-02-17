---
title: with-wdk
description: Chat application using Recall Core with Vercel Workflow DevKit (WDK) for background memory extraction.
---

A complete Next.js chat application that demonstrates Recall Core with [Vercel Workflow DevKit (WDK)](https://useworkflow.dev) for background memory extraction.

## Features

- Chat interface with OpenAI GPT
- Automatic memory extraction via WDK workflows
- Real-time memory display panel
- SQLite persistence
- AI SDK wrapper for simplified integration

## Prerequisites

- Node.js 18+
- pnpm
- OpenAI API key

## Setup

### 1. Install dependencies

```bash
cd examples/with-wdk
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

```bash
pnpm dev
```

### 4. Open the app

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/          # Chat endpoint
│   │   └── memories/      # List memories endpoint
│   └── page.tsx
├── components/
│   ├── chat-interface.tsx
│   └── memories-panel.tsx
├── lib/
│   └── memory.ts          # Recall instance + AI SDK wrapper
└── workflows/
    └── extract-memories.ts  # WDK workflow
```

## How It Works

### Memory Instance

```typescript
// src/lib/memory.ts
import { createMemory } from '@youcraft/recall'
import { createRecall } from '@youcraft/recall-ai-sdk'
import { start } from 'workflow/api'
import { extractMemories } from '@/workflows/extract-memories'

export const memory = createMemory({
  db: sqliteAdapter({ filename: 'recall.db' }),
  extractor: openaiExtractor({ apiKey: process.env.OPENAI_API_KEY! }),
  embeddings: openaiEmbeddings({ apiKey: process.env.OPENAI_API_KEY! }),
})

export const recall = createRecall({
  memory,
  onExtract: async ({ messages, userId }) => {
    // Trigger WDK workflow for background processing
    await start(extractMemories, [userId, messages])
  },
})
```

### Chat Endpoint

```typescript
// src/app/api/chat/route.ts
import { recall } from '@/lib/memory'

const result = streamText({
  model: recall(openai('gpt-5-nano'), { userId: USER_ID }),
  system: 'You are a helpful assistant.',
  messages: convertToModelMessages(messages),
})
```

### WDK Workflow

WDK uses directives (`"use workflow"` and `"use step"`) to define durable workflows:

```typescript
// src/workflows/extract-memories.ts
import { memory } from '../lib/memory'

async function formatConversation(messages: Message[]) {
  'use step'
  return messages.map(m => `${m.role}: ${m.content}`).join('\n')
}

async function extractMemoriesFromConversation(conversation: string, userId: string) {
  'use step'
  return memory.extract(conversation, { userId })
}

export async function extractMemories(userId: string, messages: Message[]) {
  'use workflow'

  const conversation = await formatConversation(messages)
  const memories = await extractMemoriesFromConversation(conversation, userId)

  return { memoriesExtracted: memories.length }
}
```

## Next.js Configuration

WDK requires wrapping your Next.js config:

```typescript
// next.config.ts
import { withWorkflow } from 'workflow/next'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
}

export default withWorkflow(nextConfig)
```

## Learn More

- [Recall Core Documentation](/quickstart)
- [WDK Documentation](https://useworkflow.dev/docs)
- [Vercel AI SDK](https://sdk.vercel.ai)
