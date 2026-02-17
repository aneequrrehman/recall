import { createPool, type Pool, type PoolOptions, type RowDataPacket } from 'mysql2/promise'
import { randomUUID } from 'node:crypto'
import type { DatabaseAdapter, ListOptions, Memory } from '@youcraft/recall'

export interface MySQLAdapterConfig {
  /**
   * MySQL connection configuration
   * Can be a connection string or a PoolOptions object
   */
  connection: string | PoolOptions
  /**
   * Name of the table to store memories
   * @default "memories"
   */
  tableName?: string
}

interface MemoryRow extends RowDataPacket {
  id: string
  user_id: string
  content: string
  embedding: string
  metadata: string
  created_at: Date
  updated_at: Date
}

interface CountRow extends RowDataPacket {
  count: number
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

function rowToMemory(row: MemoryRow): Memory {
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    embedding: JSON.parse(row.embedding),
    metadata: JSON.parse(row.metadata),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export function mysqlAdapter(config: MySQLAdapterConfig): DatabaseAdapter {
  const { connection, tableName = 'memories' } = config

  const pool: Pool = createPool(typeof connection === 'string' ? { uri: connection } : connection)

  let initialized = false

  async function ensureTable(): Promise<void> {
    if (initialized) return

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        embedding JSON NOT NULL,
        metadata JSON NOT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        INDEX idx_user_id (user_id)
      )
    `)

    initialized = true
  }

  return {
    async insert(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<Memory> {
      await ensureTable()

      const id = randomUUID()
      const now = new Date()

      await pool.query(
        `INSERT INTO ${tableName} (id, user_id, content, embedding, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
      const updates: string[] = ['updated_at = ?']
      const values: unknown[] = [now]

      if (data.content !== undefined) {
        updates.push('content = ?')
        values.push(data.content)
      }

      if (data.embedding !== undefined) {
        updates.push('embedding = ?')
        values.push(JSON.stringify(data.embedding))
      }

      if (data.metadata !== undefined) {
        updates.push('metadata = ?')
        values.push(JSON.stringify(data.metadata))
      }

      values.push(id)

      await pool.query(`UPDATE ${tableName} SET ${updates.join(', ')} WHERE id = ?`, values)

      const [rows] = await pool.query<MemoryRow[]>(`SELECT * FROM ${tableName} WHERE id = ?`, [id])

      if (rows.length === 0) {
        throw new Error(`Memory not found: ${id}`)
      }

      return rowToMemory(rows[0])
    },

    async delete(id: string): Promise<void> {
      await ensureTable()
      await pool.query(`DELETE FROM ${tableName} WHERE id = ?`, [id])
    },

    async get(id: string): Promise<Memory | null> {
      await ensureTable()

      const [rows] = await pool.query<MemoryRow[]>(`SELECT * FROM ${tableName} WHERE id = ?`, [id])

      if (rows.length === 0) {
        return null
      }

      return rowToMemory(rows[0])
    },

    async list(userId: string, options?: ListOptions): Promise<Memory[]> {
      await ensureTable()

      let query = `SELECT * FROM ${tableName} WHERE user_id = ? ORDER BY created_at DESC`
      const values: unknown[] = [userId]

      if (options?.limit !== undefined) {
        query += ` LIMIT ?`
        values.push(options.limit)
      }

      if (options?.offset !== undefined) {
        // MySQL requires LIMIT when using OFFSET
        if (options?.limit === undefined) {
          query += ` LIMIT 18446744073709551615`
        }
        query += ` OFFSET ?`
        values.push(options.offset)
      }

      const [rows] = await pool.query<MemoryRow[]>(query, values)

      return rows.map(row => rowToMemory(row))
    },

    async count(userId: string): Promise<number> {
      await ensureTable()

      const [rows] = await pool.query<CountRow[]>(
        `SELECT COUNT(*) as count FROM ${tableName} WHERE user_id = ?`,
        [userId]
      )

      return Number(rows[0]?.count ?? 0)
    },

    async clear(userId: string): Promise<void> {
      await ensureTable()
      await pool.query(`DELETE FROM ${tableName} WHERE user_id = ?`, [userId])
    },

    async queryByEmbedding(embedding: number[], userId: string, limit: number): Promise<Memory[]> {
      await ensureTable()

      const [rows] = await pool.query<MemoryRow[]>(`SELECT * FROM ${tableName} WHERE user_id = ?`, [
        userId,
      ])

      const memoriesWithScores = rows.map(row => {
        const memory = rowToMemory(row)
        const similarity = cosineSimilarity(embedding, memory.embedding)
        return { memory, similarity }
      })

      memoriesWithScores.sort((a, b) => b.similarity - a.similarity)

      return memoriesWithScores.slice(0, limit).map(item => item.memory)
    },
  }
}
