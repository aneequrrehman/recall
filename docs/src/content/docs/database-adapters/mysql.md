---
title: MySQL Adapter
description: Store memories in MySQL
---

The MySQL adapter stores memories in a MySQL database using the `mysql2` driver with connection pooling.

## Installation

```bash
npm install @youcraft/recall-adapter-mysql
```

## Usage

```typescript
import { createMemory } from '@youcraft/recall'
import { mysqlAdapter } from '@youcraft/recall-adapter-mysql'

const db = mysqlAdapter({
  connection: process.env.DATABASE_URL!,
})

const memory = createMemory({ db, embeddings, extractor })
```

## Configuration

| Option       | Type                    | Default      | Description                                    |
| ------------ | ----------------------- | ------------ | ---------------------------------------------- |
| `connection` | `string \| PoolOptions` | **required** | Connection string or mysql2 PoolOptions object |
| `tableName`  | `string`                | `"memories"` | Name of the table to store memories            |

## Examples

### Connection string

```typescript
const db = mysqlAdapter({
  connection: 'mysql://user:password@localhost:3306/mydb',
})
```

### Pool configuration

```typescript
const db = mysqlAdapter({
  connection: {
    host: 'localhost',
    port: 3306,
    database: 'mydb',
    user: 'user',
    password: 'password',
    connectionLimit: 10,
  },
})
```

### Custom table name

```typescript
const db = mysqlAdapter({
  connection: process.env.DATABASE_URL!,
  tableName: 'user_memories',
})
```

## Schema

The adapter automatically creates this table structure:

```sql
CREATE TABLE IF NOT EXISTS memories (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  embedding JSON NOT NULL,
  metadata JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_user_id (user_id)
);
```

## Performance Considerations

- **Connection pooling**: Uses mysql2's built-in connection pool
- **Vector search**: Uses JavaScript-based cosine similarity
- **JSON storage**: Embeddings stored as native MySQL JSON type
- **Timestamps**: Uses DATETIME(3) for millisecond precision
