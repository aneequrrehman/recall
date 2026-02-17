# Recall Structured Memory Example

This example demonstrates `@youcraft/recall-structured` - a structured memory system that automatically detects and tracks data in SQL tables.

## What it does

Unlike vector-based memory which stores everything as statements, this system:

1. **Classifies messages** - Determines if data should be tracked structurally (payments, workouts) or as facts (preferences, relationships)
2. **Creates schemas automatically** - When patterns are detected, creates SQL tables dynamically
3. **Answers aggregation queries** - "How much have I paid Jayden?" returns precise SQL results, not vector similarity

## Try it

1. Copy `.env.example` to `.env` and add your OpenAI API key
2. Install dependencies: `pnpm install`
3. Run the dev server: `pnpm dev`
4. In another terminal, run Inngest: `pnpm dev:inngest`
5. Open http://localhost:3001

## Example conversation

```
You: Paid Jayden $100 for MMA training
AI: Got it, I've noted that payment.

You: Paid Jayden $150 for personal training
AI: Tracked. [Table created: payments]

You: Paid Jayden $200 for sparring session
AI: Added to your payments.

You: How much have I paid Jayden total?
AI: You've paid Jayden $450 total.
```

## Architecture

- **Chat API** (`/api/chat`) - Streams responses, queries memories for context
- **Inngest Function** - Background processing of messages through classifier
- **Structured Panel** - Shows created tables and recent data
- **SQLite Databases**:
  - `recall.db` - Vector-based memories (facts, preferences)
  - `recall_structured.db` - Structured tables (payments, workouts)
