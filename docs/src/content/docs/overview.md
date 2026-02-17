---
title: Overview
description: Add persistent memory to your AI apps in minutes
---

**Recall** gives your AI applications persistent memory. Extract facts from conversations, store them in your database, and retrieve relevant context automatically.

```typescript
import { createMemory } from '@youcraft/recall'

const memory = createMemory({ db, embeddings, extractor })

// Extract facts from conversations
await memory.extract(conversation, { userId: 'user_123' })

// Query relevant memories
const memories = await memory.query('user preferences', { userId: 'user_123' })
```

## How It Works

```
Conversation                    Extracted Facts
─────────────                   ─────────────────
"My name is Sarah"          →   "User's name is Sarah"
"I work at Acme Corp"       →   "User works at Acme Corp"
"I love TypeScript"         →   "User loves TypeScript"
```

When you need context, query with natural language:

```typescript
const memories = await memory.query('What programming languages?', { userId })
// → ["User loves TypeScript"]
```

**Consolidation** is the magic. When you extract "User's name is John Doe" but already have "User's name is John", Recall updates the existing memory instead of creating a duplicate.

## Next Steps

- **[Quickstart](/quickstart)** — Build a memory-enabled chatbot in 5 minutes
- **[Core Concepts](/concepts)** — Learn how extraction and consolidation work
- **[Packages](/packages)** — All packages and what they do
