---
title: Database Adapters
description: Store memories in your preferred database
---

Database adapters handle where memories are stored. Each adapter implements the same interface, so you can switch databases without changing your application code.

## Available Adapters

| Adapter                                     | Package                               | Description                                  |
| ------------------------------------------- | ------------------------------------- | -------------------------------------------- |
| [SQLite](/database-adapters/sqlite)         | `@youcraft/recall-adapter-sqlite`     | Local file-based storage with better-sqlite3 |
| [PostgreSQL](/database-adapters/postgresql) | `@youcraft/recall-adapter-postgresql` | PostgreSQL with connection pooling           |
| [MySQL](/database-adapters/mysql)           | `@youcraft/recall-adapter-mysql`      | MySQL with connection pooling                |

## What Adapters Do

Every database adapter handles:

- **Storage**: Persisting memories with their embeddings and metadata
- **Retrieval**: Finding memories by ID or listing all memories for a user
- **Vector search**: Finding similar memories using cosine similarity
- **CRUD operations**: Create, read, update, and delete memories

## Choosing an Adapter

| Use Case                        | Recommended                    |
| ------------------------------- | ------------------------------ |
| Development / Prototyping       | SQLite                         |
| Production (small-medium scale) | PostgreSQL or MySQL            |
| Serverless / Edge               | SQLite (with file persistence) |
| Existing infrastructure         | Match your current database    |

## Building a Custom Adapter

You can create your own database adapter by implementing the `DatabaseAdapter` interface:

```typescript
import type { DatabaseAdapter, Memory, ListOptions } from '@youcraft/recall'

export function customAdapter(config: YourConfig): DatabaseAdapter {
  return {
    async insert(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<Memory> {
      // Generate ID, set timestamps, store in your database
      // Return the complete Memory object
    },

    async update(
      id: string,
      data: Partial<Pick<Memory, 'content' | 'embedding' | 'metadata'>>
    ): Promise<Memory> {
      // Update the memory and return the updated object
    },

    async delete(id: string): Promise<void> {
      // Remove the memory from storage
    },

    async get(id: string): Promise<Memory | null> {
      // Return the memory or null if not found
    },

    async list(userId: string, options?: ListOptions): Promise<Memory[]> {
      // Return all memories for the user
      // Support optional limit and offset for pagination
    },

    async count(userId: string): Promise<number> {
      // Return total number of memories for the user
    },

    async clear(userId: string): Promise<void> {
      // Delete all memories for the user
    },

    async queryByEmbedding(embedding: number[], userId: string, limit: number): Promise<Memory[]> {
      // Find the most similar memories using vector similarity
      // Return top N results sorted by similarity
    },
  }
}
```

### Key Implementation Notes

1. **ID Generation**: Use UUIDs or your database's native ID generation
2. **Timestamps**: Set `createdAt` on insert, update `updatedAt` on every change
3. **Vector Search**: Implement cosine similarity for `queryByEmbedding`
4. **Embeddings Storage**: Store as JSON or use native vector types if available

### Cosine Similarity

For vector search, you'll need to compute cosine similarity:

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
```

For production use with large datasets, consider databases with native vector support like PostgreSQL with pgvector.
