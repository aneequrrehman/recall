---
title: Anthropic Extractor
description: Extract memories using Anthropic Claude models
---

The Anthropic extractor uses Claude models to identify and extract facts from conversations, and to make consolidation decisions (ADD, UPDATE, DELETE, or NONE) when new facts are extracted.

## Installation

```bash
npm install @youcraft/recall-extractor-anthropic
```

## Usage

```typescript
import { createMemory } from '@youcraft/recall'
import { anthropicExtractor } from '@youcraft/recall-extractor-anthropic'

const extractor = anthropicExtractor({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const memory = createMemory({ db, embeddings, extractor })
```

## Configuration

| Option   | Type     | Default                     | Description                                   |
| -------- | -------- | --------------------------- | --------------------------------------------- |
| `apiKey` | `string` | **required**                | Your Anthropic API key                        |
| `model`  | `string` | `"claude-3-5-haiku-latest"` | Model to use for extraction and consolidation |

## Examples

### Custom model

```typescript
const extractor = anthropicExtractor({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-sonnet-4-20250514',
})
```

## Implementation Details

The Anthropic extractor uses Claude's native tool use capability for structured outputs, ensuring reliable JSON responses for both extraction and consolidation operations.
