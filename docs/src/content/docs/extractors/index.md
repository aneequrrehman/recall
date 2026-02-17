---
title: Extractors
description: Extract and consolidate memories using LLMs
---

Extractors identify important facts from conversations using LLMs. They also handle consolidation—deciding whether to ADD, UPDATE, DELETE, or ignore a new fact based on existing memories.

## Available Extractors

| Extractor                          | Package                                | Description                        |
| ---------------------------------- | -------------------------------------- | ---------------------------------- |
| [OpenAI](/extractors/openai)       | `@youcraft/recall-extractor-openai`    | GPT models with structured outputs |
| [Anthropic](/extractors/anthropic) | `@youcraft/recall-extractor-anthropic` | Claude models with tool use        |

## What Extractors Do

Extractors perform two key operations:

### 1. Extraction

Convert conversations into discrete, memorable facts:

```
Input: "Hi, I'm Sarah and I work at Acme Corp"

Extracted:
- "User's name is Sarah"
- "User works at Acme Corp"
```

### 2. Consolidation

Decide how new facts relate to existing memories:

| Action     | When                 | Example                                                         |
| ---------- | -------------------- | --------------------------------------------------------------- |
| **ADD**    | New information      | "User likes hiking" (no existing memory about hobbies)          |
| **UPDATE** | Enriches existing    | "User's name is Sarah Johnson" updates "User's name is Sarah"   |
| **DELETE** | Contradicts existing | "User no longer works at Acme" invalidates "User works at Acme" |
| **NONE**   | Already known        | "User's name is Sarah" when already stored                      |

## Choosing an Extractor

Both extractors follow the same extraction rules and produce similar results. Choose based on:

- **Existing API access**: Use whichever API you already have
- **Cost**: Compare pricing for your expected volume
- **Latency**: Test with your use case if latency-sensitive
- **Model preference**: Each provider offers different model options

## Building a Custom Extractor

Implement the `ExtractorProvider` interface to create your own:

```typescript
import type {
  ExtractorProvider,
  ExtractedMemory,
  ConsolidationDecision,
  ConsolidationMemory,
} from '@youcraft/recall'

export function customExtractor(config: YourConfig): ExtractorProvider {
  return {
    async extract(text: string): Promise<ExtractedMemory[]> {
      // Use your LLM to extract facts from the text
      // Return array of { content: string } objects

      return [{ content: "User's name is John" }, { content: 'User works at Acme Corp' }]
    },

    async consolidate(
      newFact: string,
      existingMemories: ConsolidationMemory[]
    ): Promise<ConsolidationDecision> {
      // Compare newFact against existingMemories
      // Return one of: ADD, UPDATE, DELETE, or NONE

      // Example: Always add if no existing memories
      if (existingMemories.length === 0) {
        return { action: 'ADD', content: newFact }
      }

      // Use your LLM to decide the action
      // ...

      return { action: 'ADD', content: newFact }
    },
  }
}
```

### Extraction Guidelines

When building an extractor, follow these rules:

1. **Atomic facts**: Each memory should be a single, discrete piece of information
2. **Third person**: Write as "User's name is..." not "My name is..."
3. **Persistent info**: Skip transient queries, focus on lasting facts
4. **Priority topics**: Names, preferences, relationships, goals, location, job, interests

### Consolidation Logic

The consolidation function receives:

- `newFact`: The newly extracted fact
- `existingMemories`: Array of `{ id, content }` for similar existing memories

Return one of:

- `{ action: 'ADD', content: string }` — Store as new memory
- `{ action: 'UPDATE', id: string, content: string }` — Update existing memory
- `{ action: 'DELETE', id: string }` — Remove existing memory
- `{ action: 'NONE' }` — Skip, already captured

The `consolidate` method is optional. If not implemented, all extracted facts are added as new memories.
