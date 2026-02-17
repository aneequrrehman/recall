---
title: PostgreSQL Adapter
description: Store memories in PostgreSQL
---

The PostgreSQL adapter stores memories in a PostgreSQL database using the `pg` driver with connection pooling.

## Installation

```bash
npm install @youcraft/recall-adapter-postgresql
```

## Usage

```typescript
import { createMemory } from '@youcraft/recall'
import { postgresqlAdapter } from '@youcraft/recall-adapter-postgresql'

const db = postgresqlAdapter({
  connection: process.env.DATABASE_URL!,
})

const memory = createMemory({ db, embeddings, extractor })
```

## Configuration

| Option       | Type                   | Default      | Description                               |
| ------------ | ---------------------- | ------------ | ----------------------------------------- |
| `connection` | `string \| PoolConfig` | **required** | Connection string or pg PoolConfig object |
| `tableName`  | `string`               | `"memories"` | Name of the table to store memories       |

## Examples

### Connection string

```typescript
const db = postgresqlAdapter({
  connection: 'postgresql://user:password@localhost:5432/mydb',
})
```

### Pool configuration

```typescript
const db = postgresqlAdapter({
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'mydb',
    user: 'user',
    password: 'password',
    max: 20, // Maximum pool size
  },
})
```

### Custom table name

```typescript
const db = postgresqlAdapter({
  connection: process.env.DATABASE_URL!,
  tableName: 'user_memories',
})
```

## Schema

The adapter automatically creates this table structure:

```sql
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
```

## Performance Considerations

- **Connection pooling**: The adapter uses `pg.Pool` for efficient connection management
- **Vector search**: Currently uses JavaScript-based cosine similarity
- **For native vector search**: Consider using pgvector extension for better performance at scale
- **Indexing**: User ID index is created automatically for efficient filtering
