# @youcraft/recall-adapter-sqlite

SQLite database adapter for [@youcraft/recall](../core). Provides persistent storage for memories using SQLite with [better-sqlite3](https://github.com/WiseLibs/better-sqlite3).

## Installation

```bash
pnpm add @youcraft/recall-adapter-sqlite
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
sqliteAdapter({
  filename: 'memories.db', // Path to SQLite database file (default: 'recall.db')
})
```

### Options

| Option     | Type     | Default       | Description                                                                   |
| ---------- | -------- | ------------- | ----------------------------------------------------------------------------- |
| `filename` | `string` | `'recall.db'` | Path to the SQLite database file. Use `':memory:'` for an in-memory database. |

## Database Schema

The adapter automatically creates the following schema:

```sql
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding TEXT NOT NULL,  -- JSON array of floats
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_memories_user_id ON memories(user_id);
```

## Vector Search

This adapter performs vector similarity search in JavaScript using cosine similarity. For each query:

1. All memories for the user are loaded from SQLite
2. Cosine similarity is calculated between the query embedding and each memory
3. Results are sorted by similarity and limited

For production workloads with large memory stores, consider using a dedicated vector database adapter (coming soon: pgvector, Pinecone).

## WAL Mode

The adapter enables SQLite's Write-Ahead Logging (WAL) mode for better concurrent read/write performance:

```sql
PRAGMA journal_mode = WAL
```

## Example: Custom Database Path

```typescript
// Store in a specific directory
sqliteAdapter({ filename: '/var/data/app/memories.db' })

// In-memory database (for testing)
sqliteAdapter({ filename: ':memory:' })

// Relative path
sqliteAdapter({ filename: './data/memories.db' })
```

## License

MIT
