---
title: OpenAI Extractor
description: Extract memories using OpenAI GPT models
---

The OpenAI extractor uses GPT models to identify and extract facts from conversations, and to make consolidation decisions (ADD, UPDATE, DELETE, or NONE) when new facts are extracted.

## Installation

```bash
npm install @youcraft/recall-extractor-openai
```

## Usage

```typescript
import { createMemory } from '@youcraft/recall'
import { openaiExtractor } from '@youcraft/recall-extractor-openai'

const extractor = openaiExtractor({
  apiKey: process.env.OPENAI_API_KEY!,
})

const memory = createMemory({ db, embeddings, extractor })
```

## Configuration

| Option   | Type     | Default        | Description                                   |
| -------- | -------- | -------------- | --------------------------------------------- |
| `apiKey` | `string` | **required**   | Your OpenAI API key                           |
| `model`  | `string` | `"gpt-5-nano"` | Model to use for extraction and consolidation |

## Examples

### Custom model

```typescript
const extractor = openaiExtractor({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-5-nano',
})
```

## Implementation Details

The OpenAI extractor uses structured outputs with Zod schemas to ensure reliable JSON responses for both extraction and consolidation operations.
