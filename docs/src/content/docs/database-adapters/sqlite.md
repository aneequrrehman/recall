---
title: SQLite Adapter
description: Store memories in SQLite with better-sqlite3
---

The SQLite adapter stores memories in a local SQLite database using [better-sqlite3](https://github.com/WiseLibs/better-sqlite3). It's perfect for development, prototyping, and applications that don't need a separate database server.

## Installation

```bash
npm install @youcraft/recall-adapter-sqlite
```

## Usage

```typescript
import { createMemory } from '@youcraft/recall'
import { sqliteAdapter } from '@youcraft/recall-adapter-sqlite'

const db = sqliteAdapter({
  filename: 'recall.db',
})

const memory = createMemory({ db, embeddings, extractor })
```

## Configuration

| Option     | Type     | Default       | Description                                                                   |
| ---------- | -------- | ------------- | ----------------------------------------------------------------------------- |
| `filename` | `string` | `"recall.db"` | Path to the SQLite database file. Use `":memory:"` for an in-memory database. |

## Examples

### File-based database

```typescript
const db = sqliteAdapter({
  filename: './data/memories.db',
})
```

### In-memory database

Useful for testing or ephemeral sessions:

```typescript
const db = sqliteAdapter({
  filename: ':memory:',
})
```

## How It Works

The adapter automatically:

- Creates the `memories` table if it doesn't exist
- Uses WAL mode for better concurrent read performance
- Stores embeddings as JSON strings
- Performs cosine similarity search in JavaScript (suitable for small-to-medium datasets)

## Schema

The adapter creates this table structure:

```sql
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
```

## Performance Considerations

- **Vector search**: Performed in JavaScript using cosine similarity. Works well for up to ~10,000 memories per user.
- **For larger datasets**: Consider PostgreSQL with pgvector for native vector operations.
- **WAL mode**: Enabled by default for better read concurrency.
