# @youcraft/recall-embeddings-openai

OpenAI embeddings provider for [@youcraft/recall](../core). Generates vector embeddings using OpenAI's embedding models.

## Installation

```bash
pnpm add @youcraft/recall-embeddings-openai
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
openaiEmbeddings({
  apiKey: 'sk-...', // Required: OpenAI API key
  model: 'text-embedding-3-small', // Optional: embedding model
})
```

### Options

| Option   | Type     | Default                    | Description                |
| -------- | -------- | -------------------------- | -------------------------- |
| `apiKey` | `string` | Required                   | Your OpenAI API key        |
| `model`  | `string` | `'text-embedding-3-small'` | The embedding model to use |

## Supported Models

| Model                    | Dimensions | Description                    |
| ------------------------ | ---------- | ------------------------------ |
| `text-embedding-3-small` | 1536       | Fast, cost-effective (default) |
| `text-embedding-3-large` | 3072       | Higher quality, more expensive |
| `text-embedding-ada-002` | 1536       | Legacy model                   |

## API

The provider implements the `EmbeddingsProvider` interface:

```typescript
interface EmbeddingsProvider {
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
  dimensions: number
}
```

### `embed(text)`

Generate an embedding for a single text string.

```typescript
const embedding = await embeddings.embed('User likes pizza')
// => [0.123, -0.456, 0.789, ...]
```

### `embedBatch(texts)`

Generate embeddings for multiple texts in a single API call.

```typescript
const embeddings = await embeddings.embedBatch(['User likes pizza', 'User works at Acme'])
// => [[0.123, ...], [0.456, ...]]
```

### `dimensions`

The dimensionality of the embedding vectors.

```typescript
console.log(embeddings.dimensions) // 1536 for text-embedding-3-small
```

## Cost Optimization

The `text-embedding-3-small` model is recommended for most use cases:

- **~5x cheaper** than `text-embedding-3-large`
- **Comparable quality** for similarity search tasks
- **Faster** response times

Use `text-embedding-3-large` only when you need maximum quality and can afford the extra cost.

## License

MIT
