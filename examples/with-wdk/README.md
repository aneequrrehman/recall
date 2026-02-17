# Recall Example with Vercel Workflow (WDK)

This example demonstrates how to use `@youcraft/recall` with [Vercel Workflow DevKit (WDK)](https://useworkflow.dev) for background memory extraction.

## Features

- Chat interface with AI (OpenAI GPT)
- Automatic memory extraction via WDK workflows
- Real-time memory display panel
- SQLite persistence

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables:

```bash
cp .env.example .env.local
# Add your OPENAI_API_KEY
```

3. Run the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## How It Works

1. **Chat**: User sends a message through the chat interface
2. **Memory Query**: Before responding, the AI queries relevant memories for context
3. **AI Response**: The AI responds with personalized context from memories
4. **Background Extraction**: After the response, a WDK workflow extracts new memories from the conversation

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/        # Chat endpoint
│   │   └── memories/    # Memories list endpoint
│   ├── styles/          # Global styles
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── chat-interface.tsx
│   └── memories-panel.tsx
├── lib/
│   ├── memory.ts        # Recall memory instance
│   └── utils.ts
└── workflows/
    └── extract-memories.ts  # WDK workflow for memory extraction
```

## Key Code

The chat endpoint uses the `recall()` wrapper from `@youcraft/recall-ai-sdk`:

```typescript
// src/app/api/chat/route.ts
import { recall } from '@/lib/memory'

const result = streamText({
  model: recall(openai('gpt-5-nano'), { userId: USER_ID }),
  system: 'You are a helpful assistant.',
  messages: convertToModelMessages(messages),
})
```

The `recall()` wrapper automatically:

1. Queries relevant memories based on the user's message
2. Injects them into the system prompt
3. Triggers the WDK workflow for memory extraction after response

## Learn More

- [Recall Documentation](https://recall.youcraft.dev)
- [WDK Documentation](https://useworkflow.dev/docs)
- [Vercel AI SDK](https://sdk.vercel.ai)
