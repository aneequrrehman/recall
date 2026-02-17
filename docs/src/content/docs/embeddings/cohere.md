---
title: Cohere Embeddings
description: Generate embeddings using Cohere's embed models
---

The Cohere embeddings provider converts text into vectors using Cohere's embed-v3.0 models. These models offer strong multilingual support and efficient embedding dimensions.

## Installation

```bash
npm install @youcraft/recall-embeddings-cohere
```

## Usage

```typescript
import { createMemory } from '@youcraft/recall'
import { cohereEmbeddings } from '@youcraft/recall-embeddings-cohere'

const embeddings = cohereEmbeddings({
  apiKey: process.env.COHERE_API_KEY!,
})

const memory = createMemory({ db, embeddings, extractor })
```

## Configuration

| Option      | Type     | Default                      | Description               |
| ----------- | -------- | ---------------------------- | ------------------------- |
| `apiKey`    | `string` | **required**                 | Your Cohere API key       |
| `model`     | `string` | `"embed-english-light-v3.0"` | Embedding model to use    |
| `inputType` | `string` | `"search_document"`          | Input type for embeddings |

## Models

| Model                           | Dimensions | Description                                |
| ------------------------------- | ---------- | ------------------------------------------ |
| `embed-english-v3.0`            | 1024       | High quality English embeddings            |
| `embed-english-light-v3.0`      | 384        | Fast, efficient English embeddings         |
| `embed-multilingual-v3.0`       | 1024       | High quality multilingual (100+ languages) |
| `embed-multilingual-light-v3.0` | 384        | Fast multilingual embeddings               |

## Examples

### High quality English

```typescript
const embeddings = cohereEmbeddings({
  apiKey: process.env.COHERE_API_KEY!,
  model: 'embed-english-v3.0',
})
```

### Multilingual support

```typescript
const embeddings = cohereEmbeddings({
  apiKey: process.env.COHERE_API_KEY!,
  model: 'embed-multilingual-v3.0',
})
```

## Input Types

Cohere models support different input types optimized for specific use cases:

| Type              | Use Case                                     |
| ----------------- | -------------------------------------------- |
| `search_document` | Embedding documents to be searched (default) |
| `search_query`    | Embedding search queries                     |
| `classification`  | Text classification tasks                    |
| `clustering`      | Clustering similar texts                     |

For memory storage and retrieval, `search_document` is typically the best choice.

## Batch Processing

The provider automatically handles Cohere's batch size limit (96 texts per request):

```typescript
// Handled automatically - splits into batches of 96
await embeddings.embedBatch(texts) // Works with any size array
```
