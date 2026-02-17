---
title: Embeddings
description: Convert text to vectors for semantic search
---

Embeddings providers convert text into vectors for semantic similarity search. When you extract a memory or run a query, the embeddings provider generates vectors that capture the meaning of the text.

## Available Providers

| Provider                     | Package                              | Description                         |
| ---------------------------- | ------------------------------------ | ----------------------------------- |
| [OpenAI](/embeddings/openai) | `@youcraft/recall-embeddings-openai` | text-embedding-3-small/large        |
| [Cohere](/embeddings/cohere) | `@youcraft/recall-embeddings-cohere` | embed-english/multilingual-v3.0     |
| [Voyage](/embeddings/voyage) | `@youcraft/recall-embeddings-voyage` | voyage-3, code, finance, law models |

## What Embeddings Do

Embeddings transform text into numerical vectors that capture semantic meaning:

```
"User loves TypeScript"  →  [0.023, -0.041, 0.018, ...]  (1536 dimensions)
```

Similar meanings produce similar vectors, enabling semantic search:

```typescript
// Query: "What programming languages?"
// Finds: "User loves TypeScript" (high similarity)
// Even though "programming languages" ≠ "TypeScript"
```

## How It Works

When you extract or query memories:

1. **Extraction**: Each memory's content is converted to a vector and stored
2. **Query**: Your query text is converted to a vector
3. **Search**: The database finds memories with the most similar vectors

This enables semantic search—finding memories by meaning, not just keywords.

## Choosing a Provider

| Factor         | OpenAI                       | Cohere                            | Voyage                       |
| -------------- | ---------------------------- | --------------------------------- | ---------------------------- |
| Models         | text-embedding-3-small/large | embed-v3.0 (english/multilingual) | voyage-3, code, finance, law |
| Dimensions     | 1536 / 3072                  | 384 / 1024                        | 512 / 1024                   |
| Multilingual   | Limited                      | Native support                    | Dedicated model              |
| Batch size     | 2048                         | 96                                | 128                          |
| Specialization | General                      | Multilingual                      | Code, finance, legal         |

Choose based on:

- **Existing API access**: Use what you already have
- **Language support**: Cohere for multilingual applications
- **Domain**: Voyage for code, finance, or legal applications
- **Dimensions**: Smaller = faster search, larger = better quality
- **Cost**: Compare pricing for your volume

## Building a Custom Provider

Implement the `EmbeddingsProvider` interface:

```typescript
import type { EmbeddingsProvider } from '@youcraft/recall'

export function customEmbeddings(config: YourConfig): EmbeddingsProvider {
  const dimensions = 1536 // Your model's output dimensions

  return {
    dimensions,

    async embed(text: string): Promise<number[]> {
      // Call your embedding API/model
      // Return a single vector

      const response = await yourAPI.embed(text)
      return response.embedding
    },

    async embedBatch(texts: string[]): Promise<number[][]> {
      // Embed multiple texts efficiently
      // Return array of vectors in same order as input

      const response = await yourAPI.embedBatch(texts)
      return response.embeddings
    },
  }
}
```

### Implementation Notes

1. **Dimensions**: Must match your model's output size. Used by database adapters for schema creation.

2. **Batch processing**: Implement `embedBatch` for efficiency. If your API doesn't support batching, fall back to sequential calls:

```typescript
async embedBatch(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(text => this.embed(text)))
}
```

3. **Rate limiting**: Handle API rate limits in your implementation. Consider adding retry logic with exponential backoff.

4. **Consistency**: Always use the same model for a given database. Mixing embedding models will produce poor search results.
