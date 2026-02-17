import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { DatabaseAdapter, ListOptions, Memory } from '@youcraft/recall'

export interface SQLiteAdapterConfig {
  /**
   * Path to the SQLite database file
   * Use ":memory:" for an in-memory database
   * @default "recall.db"
   */
  filename?: string
}

interface MemoryRow {
  id: string
  user_id: string
  content: string
  embedding: string
  metadata: string
  created_at: string
  updated_at: string
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

export function sqliteAdapter(config: SQLiteAdapterConfig = {}): DatabaseAdapter {
  const { filename = 'recall.db' } = config

  const db = new Database(filename)
  db.pragma('journal_mode = WAL')

  db.exec(`
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
  `)

  const insertStmt = db.prepare(`
    INSERT INTO memories (id, user_id, content, embedding, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const updateStmt = db.prepare(`
    UPDATE memories
    SET content = COALESCE(?, content),
        embedding = COALESCE(?, embedding),
        metadata = COALESCE(?, metadata),
        updated_at = ?
    WHERE id = ?
  `)

  const deleteStmt = db.prepare(`DELETE FROM memories WHERE id = ?`)
  const getStmt = db.prepare(`SELECT * FROM memories WHERE id = ?`)
  const listStmt = db.prepare(`SELECT * FROM memories WHERE user_id = ? ORDER BY created_at DESC`)
  const listPaginatedStmt = db.prepare(
    `SELECT * FROM memories WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
  )
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM memories WHERE user_id = ?`)
  const clearStmt = db.prepare(`DELETE FROM memories WHERE user_id = ?`)

  return {
    async insert(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<Memory> {
      const id = randomUUID()
      const now = new Date().toISOString()

      insertStmt.run(
        id,
        memory.userId,
        memory.content,
        JSON.stringify(memory.embedding),
        JSON.stringify(memory.metadata || {}),
        now,
        now
      )

      return {
        id,
        userId: memory.userId,
        content: memory.content,
        embedding: memory.embedding,
        metadata: memory.metadata || {},
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }
    },

    async update(
      id: string,
      data: Partial<Pick<Memory, 'content' | 'embedding' | 'metadata'>>
    ): Promise<Memory> {
      const now = new Date().toISOString()

      updateStmt.run(
        data.content ?? null,
        data.embedding ? JSON.stringify(data.embedding) : null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        now,
        id
      )

      const row = getStmt.get(id) as MemoryRow | undefined
      if (!row) {
        throw new Error(`Memory not found: ${id}`)
      }

      return rowToMemory(row)
    },

    async delete(id: string): Promise<void> {
      deleteStmt.run(id)
    },

    async get(id: string): Promise<Memory | null> {
      const row = getStmt.get(id) as MemoryRow | undefined
      return row ? rowToMemory(row) : null
    },

    async list(userId: string, options?: ListOptions): Promise<Memory[]> {
      if (options?.limit !== undefined || options?.offset !== undefined) {
        const limit = options.limit ?? -1 // -1 means no limit in SQLite
        const offset = options.offset ?? 0
        const rows = listPaginatedStmt.all(userId, limit, offset) as MemoryRow[]
        return rows.map(rowToMemory)
      }

      const rows = listStmt.all(userId) as MemoryRow[]
      return rows.map(rowToMemory)
    },

    async count(userId: string): Promise<number> {
      const result = countStmt.get(userId) as { count: number }
      return result.count
    },

    async clear(userId: string): Promise<void> {
      clearStmt.run(userId)
    },

    async queryByEmbedding(embedding: number[], userId: string, limit: number): Promise<Memory[]> {
      const rows = listStmt.all(userId) as MemoryRow[]

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
