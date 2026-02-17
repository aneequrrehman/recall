# Recall + Inngest Example

A Next.js chatbot that demonstrates how to use Recall with [Inngest](https://inngest.com) for background memory extraction.

## What This Example Shows

- **Real-time chat** with AI (using Vercel AI SDK)
- **Background memory extraction** via Inngest functions
- **Memory-aware responses** that use past context
- **SQLite persistence** for local development

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Chat UI       │────▶│   /api/chat     │────▶│   OpenAI        │
│   (React)       │     │   (streaming)   │     │   (GPT)       │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 │ onFinish
                                 ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   Inngest       │────▶│   Recall        │
                        │   (background)  │     │   (extract)     │
                        └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │   SQLite        │
                                                │   (recall.db)   │
                                                └─────────────────┘
```

## How It Works

1. **User sends message** → Chat API receives it
2. **Query memories** → Recall finds relevant past context
3. **AI responds** → Response includes memory context in system prompt
4. **Trigger extraction** → Inngest event fires on completion
5. **Background processing** → Inngest function extracts and consolidates memories
6. **Next message** → Memories are available for future queries

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- OpenAI API key

### Setup

1. **Install dependencies**

```bash
pnpm install
```

2. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-...
```

3. **Run the development server**

```bash
pnpm dev
```

4. **Open the Inngest Dev Server** (in a separate terminal)

```bash
npx inngest-cli@latest dev
```

5. **Open the app**

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Chat UI
│   ├── api/
│   │   ├── chat/route.ts     # Chat endpoint (streaming)
│   │   └── inngest/route.ts  # Inngest webhook
├── components/
│   └── chat-interface.tsx    # Chat component
└── lib/
    ├── memory.ts             # Recall client setup
    └── inngest/
        ├── client.ts         # Inngest client
        └── functions.ts      # Memory extraction function
```

## Key Files

### `src/lib/memory.ts`

Sets up the Recall memory client:

```typescript
import { createMemory } from '@youcraft/recall'
import { sqliteAdapter } from '@youcraft/recall-adapter-sqlite'
import { openaiEmbeddings } from '@youcraft/recall-embeddings-openai'
import { openaiExtractor } from '@youcraft/recall-extractor-openai'

export const memory = createMemory({
  db: sqliteAdapter({ filename: 'recall.db' }),
  extractor: openaiExtractor({ apiKey: process.env.OPENAI_API_KEY! }),
  embeddings: openaiEmbeddings({ apiKey: process.env.OPENAI_API_KEY! }),
})
```

### `src/lib/inngest/functions.ts`

Background function that extracts memories:

```typescript
export const extractMemories = inngest.createFunction(
  { id: 'extract-memories' },
  { event: 'chat/message.completed' },
  async ({ event }) => {
    const { userId, messages } = event.data

    // Format conversation and extract memories
    const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n')
    const extracted = await memory.extract(conversation, { userId })

    return { memoriesExtracted: extracted.length }
  }
)
```

### `src/app/api/chat/route.ts`

Chat endpoint that queries memories and triggers extraction:

```typescript
export async function POST(req: Request) {
  const { messages } = await req.json()

  // Query relevant memories
  const memories = await memory.query(lastUserMessage, { userId, limit: 5 })

  // Include memories in system prompt
  const result = streamText({
    model: openai('gpt-5-nano'),
    system: `You are a helpful assistant.\n\nRelevant memories:\n${memories.map(m => `- ${m.content}`).join('\n')}`,
    messages,
    onFinish: async ({ text }) => {
      // Trigger background extraction
      await inngest.send({
        name: 'chat/message.completed',
        data: { userId, messages: [...messages, { role: 'assistant', content: text }] },
      })
    },
  })

  return result.toDataStreamResponse()
}
```

## Viewing Memories

The SQLite database is stored at `recall.db` in the project root. You can inspect it with any SQLite client:

```bash
sqlite3 recall.db "SELECT content FROM memories"
```

## Learn More

- [Recall Documentation](https://github.com/youcraftinc/recall)
- [Inngest Documentation](https://inngest.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)

## License

MIT
