# @youcraft/recall-extractor-openai

OpenAI-based memory extractor and consolidator for [@youcraft/recall](../core). Extracts facts from conversations and intelligently consolidates them with existing memories.

## Installation

```bash
pnpm add @youcraft/recall-extractor-openai
```

## Usage

```typescript
import { createMemory } from '@youcraft/recall'
import { sqliteAdapter } from '@youcraft/recall-adapter-sqlite'
import { openaiEmbeddings } from '@youcraft/recall-embeddings-openai'
import { openaiExtractor } from '@youcraft/recall-extractor-openai'

const memory = createMemory({
  db: sqliteAdapter({ filename: 'memories.db' }),
  embeddings: openaiEmbeddings({ apiKey: process.env.OPENAI_API_KEY! }),
  extractor: openaiExtractor({ apiKey: process.env.OPENAI_API_KEY! }),
})
```

## Configuration

```typescript
openaiExtractor({
  apiKey: 'sk-...', // Required: OpenAI API key
  model: 'gpt-5-nano', // Optional: model for extraction
})
```

### Options

| Option   | Type     | Default        | Description                                       |
| -------- | -------- | -------------- | ------------------------------------------------- |
| `apiKey` | `string` | Required       | Your OpenAI API key                               |
| `model`  | `string` | `'gpt-5-nano'` | The model to use for extraction and consolidation |

## How It Works

### 1. Fact Extraction

When you call `memory.extract()`, the extractor identifies discrete facts from the conversation:

```typescript
await memory.extract(
  `User: I'm Alice and I work at Acme Corp as a software engineer.
   Assistant: Nice to meet you, Alice!`,
  { userId: 'user_123' }
)

// Extracted facts:
// - "User's name is Alice"
// - "User works at Acme Corp"
// - "User is a software engineer"
```

The extraction prompt focuses on:

- Personal information (name, location, job)
- Preferences and opinions
- Goals and intentions
- Relationships
- Experiences

### 2. Memory Consolidation

For each extracted fact, the extractor searches for similar existing memories and decides what to do:

| Action   | When Used                                | Example                                           |
| -------- | ---------------------------------------- | ------------------------------------------------- |
| `ADD`    | New information not in existing memories | "User likes sushi" (no existing food preferences) |
| `UPDATE` | Enriches or corrects existing memory     | "John Doe" updates "John"                         |
| `DELETE` | Contradicts existing memory              | "No longer works at Acme" deletes "Works at Acme" |
| `NONE`   | Already captured (duplicate)             | "User's name is Alice" already exists             |

### Consolidation Example

```
New fact: "User's name is John Doe"
Existing memories: [{ id: "abc", content: "User's name is John" }]

LLM Decision: UPDATE
- id: "abc"
- content: "User's name is John Doe"

Result: Memory "abc" is updated with merged content
```

## API

The provider implements the `ExtractorProvider` interface:

```typescript
interface ExtractorProvider {
  extract(text: string): Promise<ExtractedMemory[]>
  consolidate?(
    newFact: string,
    existingMemories: ConsolidationMemory[]
  ): Promise<ConsolidationDecision>
}
```

### `extract(text)`

Extract facts from text. Returns an array of extracted memories.

```typescript
const facts = await extractor.extract('User said they love TypeScript')
// => [{ content: "User loves TypeScript" }]
```

### `consolidate(newFact, existingMemories)`

Decide how to handle a new fact given existing similar memories.

```typescript
const decision = await extractor.consolidate("User's name is John Doe", [
  { id: 'abc-123', content: "User's name is John" },
])
// => { action: "UPDATE", id: "abc-123", content: "User's name is John Doe" }
```

## LLM Calls

Each `memory.extract()` call makes **two LLM calls per extracted fact**:

1. **Extraction call** — Identifies facts from the input text
2. **Consolidation call** — Decides ADD/UPDATE/DELETE/NONE for each fact

For a conversation that yields 3 facts, that's 4 LLM calls total (1 extraction + 3 consolidation).

## Cost Optimization

- Use `gpt-5-nano` (default) for cost-effective extraction
- Consider batching conversations before extraction
- The consolidation step is skipped when no similar memories exist (saves 1 LLM call)

## Customization

The extraction and consolidation prompts are optimized for general-purpose memory extraction. For domain-specific use cases, you may want to create a custom extractor that implements the `ExtractorProvider` interface.

## License

MIT
