# @youcraft/recall

Core memory client for AI applications. This package provides the main `createMemory` function and all the TypeScript interfaces for building memory-enabled AI apps.

## Installation

```bash
pnpm add @youcraft/recall
```

You'll also need to install providers for embeddings, extraction, and database storage:

```bash
pnpm add @youcraft/recall-embeddings-openai @youcraft/recall-extractor-openai @youcraft/recall-adapter-sqlite
```

## Usage

```typescript
import { createMemory, inMemoryAdapter } from '@youcraft/recall'
import { openaiEmbeddings } from '@youcraft/recall-embeddings-openai'
import { openaiExtractor } from '@youcraft/recall-extractor-openai'

const memory = createMemory({
  db: inMemoryAdapter(), // or sqliteAdapter() for persistence
  embeddings: openaiEmbeddings({ apiKey: process.env.OPENAI_API_KEY! }),
  extractor: openaiExtractor({ apiKey: process.env.OPENAI_API_KEY! }),
})

// Extract memories from text
const extracted = await memory.extract('User: My name is Alice and I work at Acme Corp.', {
  userId: 'user_123',
})

// Query relevant memories
const memories = await memory.query("What is the user's name?", {
  userId: 'user_123',
  limit: 5,
})
```

## API

### `createMemory(config)`

Creates a memory client with the provided configuration.

```typescript
const memory = createMemory({
  db: DatabaseAdapter, // Required: storage adapter
  embeddings: EmbeddingsProvider, // Required: embedding provider
  extractor: ExtractorProvider, // Required: fact extractor
})
```

### Memory Client Methods

#### `extract(text, options)`

Extract and store memories from text. Automatically consolidates with existing memories to prevent duplicates.

```typescript
await memory.extract('User said they love pizza', {
  userId: 'user_123',
  source: 'chat', // Optional: source identifier
  sourceId: 'msg_456', // Optional: source record ID
})
```

#### `query(context, options)`

Find relevant memories using vector similarity search.

```typescript
const memories = await memory.query('What food does the user like?', {
  userId: 'user_123',
  limit: 10, // Optional: max results (default: 10)
  threshold: 0.7, // Optional: minimum similarity score
})
```

#### `list(userId)`

List all memories for a user.

```typescript
const allMemories = await memory.list('user_123')
```

#### `get(id)`

Get a single memory by ID.

```typescript
const memory = await memory.get('memory_id')
```

#### `update(id, data)`

Update a memory's content or metadata.

```typescript
await memory.update('memory_id', {
  content: 'Updated content',
  metadata: { updated: true },
})
```

#### `delete(id)`

Delete a single memory.

```typescript
await memory.delete('memory_id')
```

#### `clear(userId)`

Delete all memories for a user.

```typescript
await memory.clear('user_123')
```

## Types

This package exports all TypeScript interfaces:

```typescript
import type {
  Memory,
  MemoryMetadata,
  MemoryConfig,
  DatabaseAdapter,
  EmbeddingsProvider,
  ExtractorProvider,
  ExtractedMemory,
  ConsolidationDecision,
  ConsolidationMemory,
  QueryOptions,
  ExtractOptions,
} from '@youcraft/recall'
```

## Built-in Adapters

### `inMemoryAdapter()`

A simple in-memory adapter for testing and development. Data is not persisted.

```typescript
import { inMemoryAdapter } from '@youcraft/recall'

const memory = createMemory({
  db: inMemoryAdapter(),
  // ...
})
```

## Creating Custom Adapters

Implement the `DatabaseAdapter` interface:

```typescript
interface DatabaseAdapter {
  insert(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<Memory>
  update(
    id: string,
    data: Partial<Pick<Memory, 'content' | 'embedding' | 'metadata'>>
  ): Promise<Memory>
  delete(id: string): Promise<void>
  get(id: string): Promise<Memory | null>
  list(userId: string): Promise<Memory[]>
  clear(userId: string): Promise<void>
  queryByEmbedding(embedding: number[], userId: string, limit: number): Promise<Memory[]>
}
```

## License

MIT
