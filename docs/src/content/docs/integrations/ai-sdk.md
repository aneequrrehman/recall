---
title: Vercel AI SDK
description: Automatic memory for any AI SDK model
---

The `@youcraft/recall-ai-sdk` package wraps any Vercel AI SDK model with automatic memory injection and extraction. No manual prompt engineering required.

## Installation

```bash
npm install @youcraft/recall-ai-sdk @youcraft/recall ai
```

## Basic Usage

```typescript
import { createRecall } from '@youcraft/recall-ai-sdk'
import { createMemory } from '@youcraft/recall'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

// Create memory instance
const memory = createMemory({ db, embeddings, extractor })

// Create recall wrapper
const recall = createRecall({ memory })

// Use with any model
const { text } = await generateText({
  model: recall(openai('gpt-5-nano'), { userId: 'user_123' }),
  prompt: 'What do you remember about me?',
})
```

:::note
This also works with `streamText`. When streaming, extraction happens after the stream completes.
:::

## Provider Support

Works with any Vercel AI SDK provider:

```typescript
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'

// OpenAI
recall(openai('gpt-5-nano'), { userId })

// Anthropic
recall(anthropic('claude-sonnet-4-20250514'), { userId })

// Google
recall(google('gemini-1.5-pro'), { userId })
```

## Memory Extraction

Memory extraction can be slow since it involves an LLM call. To avoid delaying your responses, offload extraction to a background job:

```typescript
import { inngest } from './inngest'

const recall = createRecall({
  memory,
  onExtract: async ({ messages, userId }) => {
    // Send to background job
    await inngest.send({
      name: 'memory/extract',
      data: { messages, userId },
    })
  },
})
```

Then process in your Inngest function:

```typescript
export const extractMemories = inngest.createFunction(
  { id: 'extract-memories' },
  { event: 'memory/extract' },
  async ({ event, step }) => {
    const { messages, userId } = event.data

    const conversation = await step.run('format', () =>
      messages.map(m => `${m.role}: ${m.content}`).join('\n')
    )

    await step.run('extract', () => memory.extract(conversation, { userId }))
  }
)
```

:::tip
For quick testing, you can call `memory.extract(conversation, { userId })` directly in `onExtract` instead of using a background job.
:::

## How Injection Works

The wrapper intercepts the AI SDK call and:

1. **Extracts context** from the last user message
2. **Queries** similar memories for that user
3. **Injects** them into the system prompt

### Injection Format

Memories are prepended to your system prompt:

```
<memories>
- User is a software engineer
- User prefers TypeScript
- User works at Acme Corp
</memories>

You are a helpful assistant.
```

If you don't provide a system prompt, the memories block becomes the system prompt.

## Limiting Memory Injection

Control how many memories are injected:

```typescript
// Inject at most 5 memories
recall(model, { userId, limit: 5 })

// Only inject highly relevant memories
recall(model, { userId, threshold: 0.8 })
```

## Without onExtract

If you don't provide `onExtract`, no extraction happens. This is useful if you want injection only, or handle extraction separately:

```typescript
const recall = createRecall({ memory })

// Memories are injected, but nothing is extracted
const { text } = await generateText({
  model: recall(openai('gpt-5-nano'), { userId }),
  prompt: 'What do you know about me?',
})

// Extract manually elsewhere
await memory.extract(conversation, { userId })
```

## See Also

- [Quickstart](/quickstart) — Build a chatbot in 5 minutes
- [GitHub Examples](https://github.com/youcraftinc/recall/tree/main/examples/with-inngest) — Full working example with Inngest
