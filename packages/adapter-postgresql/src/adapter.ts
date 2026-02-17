import { Pool, type PoolConfig } from 'pg'
import { randomUUID } from 'node:crypto'
import type { DatabaseAdapter, ListOptions, Memory } from '@youcraft/recall'

export interface PgVectorConfig {
  /**
   * Vector dimensions (must match your embeddings model)
   * @example 1536 for OpenAI text-embedding-3-small
   */
  dimensions: number
  /**
   * Index type for vector similarity search
   * - 'hnsw': Hierarchical Navigable Small World (faster queries, more memory)
   * - 'ivfflat': Inverted File Flat (slower queries, less memory)
   * - 'none': No index (not recommended for production)
   * @default "hnsw"
   */
  indexType?: 'hnsw' | 'ivfflat' | 'none'
  /**
   * Distance metric for similarity search
   * - 'cosine': Cosine distance (most common for text embeddings)
   * - 'l2': Euclidean distance
   * - 'inner': Inner product (negative dot product)
   * @default "cosine"
   */
  distanceMetric?: 'cosine' | 'l2' | 'inner'
}

export interface PostgreSQLAdapterConfig {
  /**
   * PostgreSQL connection configuration
   * Can be a connection string or a PoolConfig object
   */
  connection: string | PoolConfig
  /**
   * Name of the table to store memories
   * @default "memories"
   */
  tableName?: string
  /**
   * Enable pgvector for native vector similarity search.
   * When enabled, embeddings are stored as native vector type with HNSW/IVFFlat indexing.
   * Requires pgvector extension to be available in your PostgreSQL database.
   *
   * When not provided, embeddings are stored as JSONB and similarity is computed in-memory.
   */
  pgvector?: PgVectorConfig
}

interface MemoryRow {
  id: string
  user_id: string
  content: string
  embedding: number[] | string // pgvector returns string format "[0.1,0.2,...]"
  metadata: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Parse embedding from database row.
 * Handles both JSONB (number[]) and pgvector (string "[0.1,0.2,...]") formats.
 */
function parseEmbedding(embedding: number[] | string): number[] {
  if (Array.isArray(embedding)) {
    return embedding
  }
  // pgvector returns "[0.1,0.2,...]" string format
  return JSON.parse(embedding)
}

/**
 * Format embedding for pgvector insertion.
 * Converts number[] to "[0.1,0.2,...]" string format.
 */
function formatVectorForPgVector(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}

function rowToMemory(row: MemoryRow): Memory {
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    embedding: parseEmbedding(row.embedding),
    metadata: row.metadata,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

/**
 * Get the pgvector operator class suffix for the given distance metric.
 */
function getVectorOpsClass(metric: 'cosine' | 'l2' | 'inner'): string {
  switch (metric) {
    case 'cosine':
      return 'vector_cosine_ops'
    case 'l2':
      return 'vector_l2_ops'
    case 'inner':
      return 'vector_ip_ops'
  }
}

/**
 * Get the pgvector distance operator for the given distance metric.
 */
function getDistanceOperator(metric: 'cosine' | 'l2' | 'inner'): string {
  switch (metric) {
    case 'cosine':
      return '<=>'
    case 'l2':
      return '<->'
    case 'inner':
      return '<#>'
  }
}

export function postgresqlAdapter(config: PostgreSQLAdapterConfig): DatabaseAdapter {
  const { connection, tableName = 'memories', pgvector } = config

  const pool = new Pool(
    typeof connection === 'string' ? { connectionString: connection } : connection
  )

  let initialized = false

  // pgvector config with defaults
  const usePgVector = !!pgvector
  const vectorDimensions = pgvector?.dimensions
  const indexType = pgvector?.indexType ?? 'hnsw'
  const distanceMetric = pgvector?.distanceMetric ?? 'cosine'

  async function ensureTable(): Promise<void> {
    if (initialized) return

    if (usePgVector) {
      // Enable pgvector extension
      await pool.query(`CREATE EXTENSION IF NOT EXISTS vector`)

      // Create table with native vector type
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          content TEXT NOT NULL,
          embedding vector(${vectorDimensions}) NOT NULL,
          metadata JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        )
      `)

      // Create user_id index
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_${tableName}_user_id ON ${tableName}(user_id)
      `)

      // Create vector index based on configuration
      if (indexType !== 'none') {
        const opsClass = getVectorOpsClass(distanceMetric)
        if (indexType === 'hnsw') {
          await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_${tableName}_embedding
            ON ${tableName} USING hnsw (embedding ${opsClass})
            WITH (m = 16, ef_construction = 64)
          `)
        } else {
          // ivfflat - use lists = sqrt(rows), but start with 100 as default
          await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_${tableName}_embedding
            ON ${tableName} USING ivfflat (embedding ${opsClass})
            WITH (lists = 100)
          `)
        }
      }
    } else {
      // Original JSONB schema for backwards compatibility
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          content TEXT NOT NULL,
          embedding JSONB NOT NULL,
          metadata JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        )
      `)

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_${tableName}_user_id ON ${tableName}(user_id)
      `)
    }

    initialized = true
  }

  return {
    async insert(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<Memory> {
      await ensureTable()

      const id = randomUUID()
      const now = new Date()

      if (usePgVector) {
        // pgvector mode: cast to vector type
        await pool.query(
          `INSERT INTO ${tableName} (id, user_id, content, embedding, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4::vector, $5, $6, $7)`,
          [
            id,
            memory.userId,
            memory.content,
            formatVectorForPgVector(memory.embedding),
            JSON.stringify(memory.metadata || {}),
            now,
            now,
          ]
        )
      } else {
        // JSONB mode: store as JSON string
        await pool.query(
          `INSERT INTO ${tableName} (id, user_id, content, embedding, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id,
            memory.userId,
            memory.content,
            JSON.stringify(memory.embedding),
            JSON.stringify(memory.metadata || {}),
            now,
            now,
          ]
        )
      }

      return {
        id,
        userId: memory.userId,
        content: memory.content,
        embedding: memory.embedding,
        metadata: memory.metadata || {},
        createdAt: now,
        updatedAt: now,
      }
    },

    async update(
      id: string,
      data: Partial<Pick<Memory, 'content' | 'embedding' | 'metadata'>>
    ): Promise<Memory> {
      await ensureTable()

      const now = new Date()
      const updates: string[] = ['updated_at = $1']
      const values: unknown[] = [now]
      let paramIndex = 2

      if (data.content !== undefined) {
        updates.push(`content = $${paramIndex}`)
        values.push(data.content)
        paramIndex++
      }

      if (data.embedding !== undefined) {
        if (usePgVector) {
          // pgvector mode: cast to vector type
          updates.push(`embedding = $${paramIndex}::vector`)
          values.push(formatVectorForPgVector(data.embedding))
        } else {
          // JSONB mode: store as JSON string
          updates.push(`embedding = $${paramIndex}`)
          values.push(JSON.stringify(data.embedding))
        }
        paramIndex++
      }

      if (data.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex}`)
        values.push(JSON.stringify(data.metadata))
        paramIndex++
      }

      values.push(id)

      await pool.query(
        `UPDATE ${tableName} SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
      )

      const result = await pool.query<MemoryRow>(`SELECT * FROM ${tableName} WHERE id = $1`, [id])

      if (result.rows.length === 0) {
        throw new Error(`Memory not found: ${id}`)
      }

      return rowToMemory(result.rows[0])
    },

    async delete(id: string): Promise<void> {
      await ensureTable()
      await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [id])
    },

    async get(id: string): Promise<Memory | null> {
      await ensureTable()

      const result = await pool.query<MemoryRow>(`SELECT * FROM ${tableName} WHERE id = $1`, [id])

      return result.rows.length > 0 ? rowToMemory(result.rows[0]) : null
    },

    async list(userId: string, options?: ListOptions): Promise<Memory[]> {
      await ensureTable()

      let query = `SELECT * FROM ${tableName} WHERE user_id = $1 ORDER BY created_at DESC`
      const values: unknown[] = [userId]

      if (options?.limit !== undefined) {
        query += ` LIMIT $${values.length + 1}`
        values.push(options.limit)
      }

      if (options?.offset !== undefined) {
        query += ` OFFSET $${values.length + 1}`
        values.push(options.offset)
      }

      const result = await pool.query<MemoryRow>(query, values)
      return result.rows.map(rowToMemory)
    },

    async count(userId: string): Promise<number> {
      await ensureTable()

      const result = await pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ${tableName} WHERE user_id = $1`,
        [userId]
      )

      return parseInt(result.rows[0].count, 10)
    },

    async clear(userId: string): Promise<void> {
      await ensureTable()
      await pool.query(`DELETE FROM ${tableName} WHERE user_id = $1`, [userId])
    },

    async queryByEmbedding(embedding: number[], userId: string, limit: number): Promise<Memory[]> {
      await ensureTable()

      if (usePgVector) {
        // pgvector mode: use native vector similarity search with index
        const operator = getDistanceOperator(distanceMetric)
        const result = await pool.query<MemoryRow>(
          `SELECT * FROM ${tableName}
           WHERE user_id = $1
           ORDER BY embedding ${operator} $2::vector
           LIMIT $3`,
          [userId, formatVectorForPgVector(embedding), limit]
        )
        return result.rows.map(rowToMemory)
      }

      // JSONB mode: fetch all and compute similarity in-memory (original behavior)
      const result = await pool.query<MemoryRow>(`SELECT * FROM ${tableName} WHERE user_id = $1`, [
        userId,
      ])

      const memoriesWithScores = result.rows.map(row => {
        const memory = rowToMemory(row)
        const similarity = cosineSimilarity(embedding, memory.embedding)
        return { memory, similarity }
      })

      memoriesWithScores.sort((a, b) => b.similarity - a.similarity)

      return memoriesWithScores.slice(0, limit).map(item => item.memory)
    },
  }
}
