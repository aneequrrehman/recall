---
title: OpenAI Embeddings
description: Generate embeddings using OpenAI's text-embedding models
---

The OpenAI embeddings provider converts text into vectors using OpenAI's text-embedding models.

## Installation

```bash
npm install @youcraft/recall-embeddings-openai
```

## Usage

```typescript
import { createMemory } from '@youcraft/recall'
import { openaiEmbeddings } from '@youcraft/recall-embeddings-openai'

const embeddings = openaiEmbeddings({
  apiKey: process.env.OPENAI_API_KEY!,
})

const memory = createMemory({ db, embeddings, extractor })
```

## Configuration

| Option   | Type     | Default                    | Description            |
| -------- | -------- | -------------------------- | ---------------------- |
| `apiKey` | `string` | **required**               | Your OpenAI API key    |
| `model`  | `string` | `"text-embedding-3-small"` | Embedding model to use |

## Models

| Model                    | Dimensions | Description                    |
| ------------------------ | ---------- | ------------------------------ |
| `text-embedding-3-small` | 1536       | Fast and cost-effective        |
| `text-embedding-3-large` | 3072       | Higher quality, more expensive |

## Examples

### Using the large model

```typescript
const embeddings = openaiEmbeddings({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'text-embedding-3-large',
})
```
