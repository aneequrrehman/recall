# @youcraft/recall-ai-sdk

Vercel AI SDK integration for [@youcraft/recall](https://github.com/youcraft/recall). Wrap any AI SDK model with automatic memory injection and extraction.

## Installation

```bash
npm install @youcraft/recall-ai-sdk @youcraft/recall ai
```

## Quick Start

```typescript
import { createRecall } from '@youcraft/recall-ai-sdk'
import { createMemory } from '@youcraft/recall'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'

// 1. Create your memory instance
const memory = createMemory({
  db: yourDatabaseAdapter,
  embeddings: yourEmbeddingsProvider,
  extractor: yourExtractorProvider,
})

// 2. Create the recall wrapper
const recall = createRecall({
  memory,
  onExtract: async ({ messages, userId }) => {
    // Optional: handle extraction (e.g., send to background job)
    await queue.send('memory.extract', { messages, userId })
  },
})

// 3. Wrap any AI SDK model
const { text } = await generateText({
  model: recall(openai('gpt-5-nano'), { userId: 'user_123' }),
  prompt: 'What do you remember about me?',
})

// Works with any provider
const { text: text2 } = await generateText({
  model: recall(anthropic('claude-sonnet-4-20250514'), { userId: 'user_123' }),
  prompt: 'Tell me more about my preferences.',
})
```

## How It Works

The `recall()` wrapper intercepts AI SDK calls and:

1. **Before generation**: Queries relevant memories and injects them into the system prompt
2. **After generation**: Calls your `onExtract` callback with the conversation

```
User Message
    ↓
[recall wrapper]
    ├─ Query memories by userId
    ├─ Inject <memories> block into system prompt
    ↓
[AI Model generates response]
    ↓
[recall wrapper]
    └─ Call onExtract({ messages, userId })
```

### Memory Injection Format

Memories are injected as a `<memories>` block at the start of the system prompt:

```
<memories>
- User prefers dark mode
- User is a software engineer
- User's favorite language is TypeScript
</memories>

You are a helpful assistant.
```

## API Reference

### `createRecall(config)`

Creates a recall wrapper function.

```typescript
const recall = createRecall({
  memory: MemoryClient,
  onExtract?: (params: ExtractParams) => Promise<void> | void,
})
```

#### Config Options

| Option      | Type           | Required | Description                                                           |
| ----------- | -------------- | -------- | --------------------------------------------------------------------- |
| `memory`    | `MemoryClient` | Yes      | Memory client from `@youcraft/recall`                                 |
| `onExtract` | `function`     | No       | Callback after each response. If not provided, extraction is skipped. |

#### ExtractParams

```typescript
interface ExtractParams {
  messages: LanguageModelV2Prompt // The conversation messages
  userId: string // The user ID
}
```

### `recall(model, options)`

Wraps an AI SDK model with memory capabilities.

```typescript
const wrappedModel = recall(model, {
  userId: string,
  limit?: number,
  threshold?: number,
})
```

#### Options

| Option      | Type     | Default  | Description                        |
| ----------- | -------- | -------- | ---------------------------------- |
| `userId`    | `string` | Required | User ID to scope memories          |
| `limit`     | `number` | `10`     | Maximum memories to inject         |
| `threshold` | `number` | -        | Minimum similarity threshold (0-1) |

## Usage with Streaming

Works seamlessly with `streamText`:

```typescript
import { streamText } from 'ai'

const result = streamText({
  model: recall(openai('gpt-5-nano'), { userId: 'user_123' }),
  system: 'You are a helpful assistant.',
  messages,
})

// onExtract is called after the stream completes
return result.toDataStreamResponse()
```

## Usage with Inngest (Background Extraction)

For production apps, extract memories in the background:

```typescript
import { inngest } from './inngest/client'

const recall = createRecall({
  memory,
  onExtract: async ({ messages, userId }) => {
    await inngest.send({
      name: 'memory/extract',
      data: { messages, userId },
    })
  },
})

// In your Inngest function
export const extractMemories = inngest.createFunction(
  { id: 'extract-memories' },
  { event: 'memory/extract' },
  async ({ event }) => {
    const { messages, userId } = event.data
    const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n')

    await memory.extract(conversation, { userId })
  }
)
```

## Provider Agnostic

The wrapper works with any Vercel AI SDK provider:

```typescript
// OpenAI
recall(openai('gpt-5-nano'), { userId })

// Anthropic
recall(anthropic('claude-sonnet-4-20250514'), { userId })

// Google
recall(google('gemini-1.5-pro'), { userId })

// Any LanguageModelV2
recall(yourCustomModel, { userId })
```

## Example

See the [with-inngest example](../../examples/with-inngest) for a complete Next.js app with:

- Two pages comparing manual vs wrapper approaches
- Background memory extraction with Inngest
- Real-time memory display panel

## License

MIT
