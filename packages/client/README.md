# @youcraft/recall-client

Official client SDK for [Recall](https://recall.youcraft.dev).

## Installation

```bash
npm install @youcraft/recall-client
```

## Usage

```typescript
import { RecallClient } from '@youcraft/recall-client'

const recall = new RecallClient({
  apiKey: process.env.RECALL_API_KEY,
})

// Query memories
const { memories } = await recall.query('user preferences')

// Extract memories from conversation
await recall.extract({
  messages: [{ role: 'user', content: 'I love hiking' }],
})

// List all memories
const { memories, hasMore } = await recall.list({ limit: 20 })

// Get, delete, clear
await recall.get('memory-id')
await recall.delete('memory-id')
await recall.clear()
```

## Vercel AI SDK Integration

```typescript
import { createRecall } from '@youcraft/recall-client/ai-sdk'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'

const recall = createRecall({
  apiKey: process.env.RECALL_API_KEY,
})

const { text } = await generateText({
  model: recall(anthropic('claude-sonnet-4-20250514')),
  prompt: 'What do you remember about me?',
})
```

## Self-Hosted

```typescript
const recall = new RecallClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://your-instance.com',
})
```

## License

MIT
