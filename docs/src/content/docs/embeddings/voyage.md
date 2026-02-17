---
title: Voyage Embeddings
description: Generate embeddings using Voyage AI's embedding models
---

The Voyage embeddings provider converts text into vectors using Voyage AI's embedding models. Voyage offers state-of-the-art embeddings with specialized models for code, finance, and legal domains.

## Installation

```bash
npm install @youcraft/recall-embeddings-voyage
```

## Usage

```typescript
import { createMemory } from '@youcraft/recall'
import { voyageEmbeddings } from '@youcraft/recall-embeddings-voyage'

const embeddings = voyageEmbeddings({
  apiKey: process.env.VOYAGE_API_KEY!,
})

const memory = createMemory({ db, embeddings, extractor })
```

## Configuration

| Option      | Type     | Default           | Description               |
| ----------- | -------- | ----------------- | ------------------------- |
| `apiKey`    | `string` | **required**      | Your Voyage API key       |
| `model`     | `string` | `"voyage-3-lite"` | Embedding model to use    |
| `inputType` | `string` | `"document"`      | Input type for embeddings |

## Models

| Model                   | Dimensions | Description                                |
| ----------------------- | ---------- | ------------------------------------------ |
| `voyage-3-large`        | 1024       | Highest quality general-purpose embeddings |
| `voyage-3`              | 1024       | High quality general-purpose embeddings    |
| `voyage-3-lite`         | 512        | Fast, efficient general-purpose embeddings |
| `voyage-code-3`         | 1024       | Optimized for code retrieval               |
| `voyage-finance-2`      | 1024       | Optimized for finance domain               |
| `voyage-law-2`          | 1024       | Optimized for legal domain                 |
| `voyage-multilingual-2` | 1024       | Multilingual support                       |

## Examples

### High quality embeddings

```typescript
const embeddings = voyageEmbeddings({
  apiKey: process.env.VOYAGE_API_KEY!,
  model: 'voyage-3-large',
})
```

### Code retrieval

```typescript
const embeddings = voyageEmbeddings({
  apiKey: process.env.VOYAGE_API_KEY!,
  model: 'voyage-code-3',
})
```

### Domain-specific models

```typescript
// For finance applications
const embeddings = voyageEmbeddings({
  apiKey: process.env.VOYAGE_API_KEY!,
  model: 'voyage-finance-2',
})

// For legal applications
const embeddings = voyageEmbeddings({
  apiKey: process.env.VOYAGE_API_KEY!,
  model: 'voyage-law-2',
})
```

## Input Types

Voyage models support different input types optimized for specific use cases:

| Type       | Use Case                                     |
| ---------- | -------------------------------------------- |
| `document` | Embedding documents to be searched (default) |
| `query`    | Embedding search queries                     |

For memory storage and retrieval, `document` is typically the best choice.

## Batch Processing

The provider automatically handles Voyage's batch size limit (128 texts per request):

```typescript
// Handled automatically - splits into batches of 128
await embeddings.embedBatch(texts) // Works with any size array
```
