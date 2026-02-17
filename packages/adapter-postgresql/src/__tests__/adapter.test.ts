import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import { postgresqlAdapter } from '../adapter'

// These tests require a running PostgreSQL instance
// Set the DATABASE_URL environment variable to run them
// Example: DATABASE_URL=postgres://localhost:5432/recall_test pnpm test

const TEST_TABLE = 'memories_test'

describe('postgresqlAdapter', () => {
  const connectionString = process.env.DATABASE_URL

  // Skip tests if no database URL is provided
  const describeWithDb = connectionString ? describe : describe.skip

  describeWithDb('with database', () => {
    let adapter: ReturnType<typeof postgresqlAdapter>

    beforeAll(() => {
      adapter = postgresqlAdapter({
        connection: connectionString!,
        tableName: TEST_TABLE,
      })
    })

    beforeEach(async () => {
      // Clear the test table before each test
      await adapter.clear('user-1')
      await adapter.clear('user-2')
    })

    afterAll(async () => {
      // Note: In production, you'd want to close the pool
      // but for tests we let it close naturally
    })

    describe('insert', () => {
      it('inserts a memory and returns it with id and timestamps', async () => {
        const memory = await adapter.insert({
          userId: 'user-1',
          content: 'User lives in NYC',
          embedding: [0.1, 0.2, 0.3],
          metadata: { source: 'chat' },
        })

        expect(memory.id).toBeDefined()
        expect(memory.userId).toBe('user-1')
        expect(memory.content).toBe('User lives in NYC')
        expect(memory.embedding).toEqual([0.1, 0.2, 0.3])
        expect(memory.metadata).toEqual({ source: 'chat' })
        expect(memory.createdAt).toBeInstanceOf(Date)
        expect(memory.updatedAt).toBeInstanceOf(Date)
      })
    })

    describe('get', () => {
      it('returns a memory by id', async () => {
        const inserted = await adapter.insert({
          userId: 'user-1',
          content: 'Test memory',
          embedding: [0.1, 0.2, 0.3],
          metadata: {},
        })

        const memory = await adapter.get(inserted.id)

        expect(memory).not.toBeNull()
        expect(memory!.id).toBe(inserted.id)
        expect(memory!.content).toBe('Test memory')
      })

      it('returns null for non-existent id', async () => {
        const memory = await adapter.get('non-existent-id')
        expect(memory).toBeNull()
      })
    })

    describe('update', () => {
      it('updates memory content', async () => {
        const inserted = await adapter.insert({
          userId: 'user-1',
          content: 'Original content',
          embedding: [0.1, 0.2, 0.3],
          metadata: {},
        })

        const updated = await adapter.update(inserted.id, {
          content: 'Updated content',
        })

        expect(updated.content).toBe('Updated content')
        expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(inserted.updatedAt.getTime())
      })

      it('updates memory embedding', async () => {
        const inserted = await adapter.insert({
          userId: 'user-1',
          content: 'Test',
          embedding: [0.1, 0.2, 0.3],
          metadata: {},
        })

        const updated = await adapter.update(inserted.id, {
          embedding: [0.4, 0.5, 0.6],
        })

        expect(updated.embedding).toEqual([0.4, 0.5, 0.6])
      })

      it('updates memory metadata', async () => {
        const inserted = await adapter.insert({
          userId: 'user-1',
          content: 'Test',
          embedding: [0.1, 0.2, 0.3],
          metadata: { source: 'old' },
        })

        const updated = await adapter.update(inserted.id, {
          metadata: { source: 'new', extra: 'data' },
        })

        expect(updated.metadata).toEqual({ source: 'new', extra: 'data' })
      })

      it('throws error for non-existent id', async () => {
        await expect(adapter.update('non-existent-id', { content: 'test' })).rejects.toThrow(
          'Memory not found'
        )
      })
    })

    describe('delete', () => {
      it('deletes a memory', async () => {
        const inserted = await adapter.insert({
          userId: 'user-1',
          content: 'To be deleted',
          embedding: [0.1, 0.2, 0.3],
          metadata: {},
        })

        await adapter.delete(inserted.id)

        const memory = await adapter.get(inserted.id)
        expect(memory).toBeNull()
      })
    })

    describe('list', () => {
      it('lists all memories for a user', async () => {
        await adapter.insert({
          userId: 'user-1',
          content: 'Memory 1',
          embedding: [0.1, 0.2, 0.3],
          metadata: {},
        })
        await adapter.insert({
          userId: 'user-1',
          content: 'Memory 2',
          embedding: [0.4, 0.5, 0.6],
          metadata: {},
        })
        await adapter.insert({
          userId: 'user-2',
          content: 'Other user memory',
          embedding: [0.7, 0.8, 0.9],
          metadata: {},
        })

        const memories = await adapter.list('user-1')

        expect(memories).toHaveLength(2)
        expect(memories.map(m => m.content)).toContain('Memory 1')
        expect(memories.map(m => m.content)).toContain('Memory 2')
      })

      it('returns empty array for user with no memories', async () => {
        const memories = await adapter.list('non-existent-user')
        expect(memories).toEqual([])
      })

      it('supports limit option', async () => {
        for (let i = 0; i < 5; i++) {
          await adapter.insert({
            userId: 'user-1',
            content: `Memory ${i}`,
            embedding: [i * 0.1, 0.5, 0.5],
            metadata: {},
          })
        }

        const memories = await adapter.list('user-1', { limit: 3 })
        expect(memories).toHaveLength(3)
      })

      it('supports offset option', async () => {
        for (let i = 0; i < 5; i++) {
          await adapter.insert({
            userId: 'user-1',
            content: `Memory ${i}`,
            embedding: [i * 0.1, 0.5, 0.5],
            metadata: {},
          })
        }

        const all = await adapter.list('user-1')
        const offset = await adapter.list('user-1', { offset: 2 })

        expect(offset).toHaveLength(3)
        expect(offset[0].id).toBe(all[2].id)
      })

      it('supports limit and offset together', async () => {
        for (let i = 0; i < 5; i++) {
          await adapter.insert({
            userId: 'user-1',
            content: `Memory ${i}`,
            embedding: [i * 0.1, 0.5, 0.5],
            metadata: {},
          })
        }

        const all = await adapter.list('user-1')
        const paginated = await adapter.list('user-1', { limit: 2, offset: 1 })

        expect(paginated).toHaveLength(2)
        expect(paginated[0].id).toBe(all[1].id)
        expect(paginated[1].id).toBe(all[2].id)
      })
    })

    describe('count', () => {
      it('returns count of memories for a user', async () => {
        await adapter.insert({
          userId: 'user-1',
          content: 'Memory 1',
          embedding: [0.1, 0.2, 0.3],
          metadata: {},
        })

        await adapter.insert({
          userId: 'user-1',
          content: 'Memory 2',
          embedding: [0.4, 0.5, 0.6],
          metadata: {},
        })

        await adapter.insert({
          userId: 'user-2',
          content: 'Memory 3',
          embedding: [0.7, 0.8, 0.9],
          metadata: {},
        })

        const count = await adapter.count('user-1')
        expect(count).toBe(2)
      })

      it('returns 0 for user with no memories', async () => {
        const count = await adapter.count('non-existent-user')
        expect(count).toBe(0)
      })
    })

    describe('clear', () => {
      it('clears all memories for a user', async () => {
        await adapter.insert({
          userId: 'user-1',
          content: 'Memory 1',
          embedding: [0.1, 0.2, 0.3],
          metadata: {},
        })
        await adapter.insert({
          userId: 'user-1',
          content: 'Memory 2',
          embedding: [0.4, 0.5, 0.6],
          metadata: {},
        })
        await adapter.insert({
          userId: 'user-2',
          content: 'Other user memory',
          embedding: [0.7, 0.8, 0.9],
          metadata: {},
        })

        await adapter.clear('user-1')

        const user1Memories = await adapter.list('user-1')
        const user2Memories = await adapter.list('user-2')

        expect(user1Memories).toHaveLength(0)
        expect(user2Memories).toHaveLength(1)
      })
    })

    describe('queryByEmbedding', () => {
      it('returns memories sorted by similarity', async () => {
        await adapter.insert({
          userId: 'user-1',
          content: 'Very similar',
          embedding: [0.9, 0.1, 0.1],
          metadata: {},
        })
        await adapter.insert({
          userId: 'user-1',
          content: 'Somewhat similar',
          embedding: [0.5, 0.5, 0.5],
          metadata: {},
        })
        await adapter.insert({
          userId: 'user-1',
          content: 'Not similar',
          embedding: [0.1, 0.9, 0.1],
          metadata: {},
        })

        const queryEmbedding = [1.0, 0.0, 0.0]
        const results = await adapter.queryByEmbedding(queryEmbedding, 'user-1', 3)

        expect(results).toHaveLength(3)
        expect(results[0].content).toBe('Very similar')
        expect(results[2].content).toBe('Not similar')
      })

      it('respects the limit parameter', async () => {
        await adapter.insert({
          userId: 'user-1',
          content: 'Memory 1',
          embedding: [0.1, 0.2, 0.3],
          metadata: {},
        })
        await adapter.insert({
          userId: 'user-1',
          content: 'Memory 2',
          embedding: [0.4, 0.5, 0.6],
          metadata: {},
        })
        await adapter.insert({
          userId: 'user-1',
          content: 'Memory 3',
          embedding: [0.7, 0.8, 0.9],
          metadata: {},
        })

        const results = await adapter.queryByEmbedding([0.5, 0.5, 0.5], 'user-1', 2)

        expect(results).toHaveLength(2)
      })

      it('only returns memories for the specified user', async () => {
        await adapter.insert({
          userId: 'user-1',
          content: 'User 1 memory',
          embedding: [0.9, 0.1, 0.1],
          metadata: {},
        })
        await adapter.insert({
          userId: 'user-2',
          content: 'User 2 memory',
          embedding: [0.95, 0.05, 0.05],
          metadata: {},
        })

        const results = await adapter.queryByEmbedding([1.0, 0.0, 0.0], 'user-1', 10)

        expect(results).toHaveLength(1)
        expect(results[0].content).toBe('User 1 memory')
      })

      it('returns empty array when user has no memories', async () => {
        const results = await adapter.queryByEmbedding([0.5, 0.5, 0.5], 'non-existent-user', 10)

        expect(results).toEqual([])
      })
    })
  })

  describe('without database', () => {
    it('creates adapter instance without connection', () => {
      // Just verify we can create the adapter without a real connection
      // The actual connection will fail when methods are called
      const adapter = postgresqlAdapter({
        connection: 'postgres://localhost:5432/nonexistent',
      })
      expect(adapter).toBeDefined()
      expect(typeof adapter.insert).toBe('function')
      expect(typeof adapter.get).toBe('function')
      expect(typeof adapter.list).toBe('function')
      expect(typeof adapter.update).toBe('function')
      expect(typeof adapter.delete).toBe('function')
      expect(typeof adapter.clear).toBe('function')
      expect(typeof adapter.count).toBe('function')
      expect(typeof adapter.queryByEmbedding).toBe('function')
    })

    it('creates adapter instance with pgvector config', () => {
      const adapter = postgresqlAdapter({
        connection: 'postgres://localhost:5432/nonexistent',
        pgvector: {
          dimensions: 1536,
          indexType: 'hnsw',
          distanceMetric: 'cosine',
        },
      })
      expect(adapter).toBeDefined()
    })
  })

  // pgvector-specific tests
  // These require PostgreSQL with pgvector extension installed
  // Set PGVECTOR_DATABASE_URL environment variable to run them
  const pgvectorConnectionString = process.env.PGVECTOR_DATABASE_URL
  const describeWithPgVector = pgvectorConnectionString ? describe : describe.skip

  describeWithPgVector('with pgvector', () => {
    const PGVECTOR_TEST_TABLE = 'memories_pgvector_test'
    let adapter: ReturnType<typeof postgresqlAdapter>

    beforeAll(() => {
      adapter = postgresqlAdapter({
        connection: pgvectorConnectionString!,
        tableName: PGVECTOR_TEST_TABLE,
        pgvector: {
          dimensions: 3, // Small dimensions for testing
          indexType: 'hnsw',
          distanceMetric: 'cosine',
        },
      })
    })

    beforeEach(async () => {
      await adapter.clear('user-1')
      await adapter.clear('user-2')
    })

    describe('insert with pgvector', () => {
      it('inserts a memory with vector embedding', async () => {
        const memory = await adapter.insert({
          userId: 'user-1',
          content: 'Test memory with vector',
          embedding: [0.1, 0.2, 0.3],
          metadata: { source: 'test' },
        })

        expect(memory.id).toBeDefined()
        expect(memory.content).toBe('Test memory with vector')
        expect(memory.embedding).toEqual([0.1, 0.2, 0.3])
      })
    })

    describe('get with pgvector', () => {
      it('retrieves memory with vector embedding', async () => {
        const inserted = await adapter.insert({
          userId: 'user-1',
          content: 'Test memory',
          embedding: [0.5, 0.5, 0.5],
          metadata: {},
        })

        const memory = await adapter.get(inserted.id)

        expect(memory).not.toBeNull()
        expect(memory!.embedding).toEqual([0.5, 0.5, 0.5])
      })
    })

    describe('update with pgvector', () => {
      it('updates memory embedding using vector type', async () => {
        const inserted = await adapter.insert({
          userId: 'user-1',
          content: 'Test',
          embedding: [0.1, 0.2, 0.3],
          metadata: {},
        })

        const updated = await adapter.update(inserted.id, {
          embedding: [0.9, 0.8, 0.7],
        })

        expect(updated.embedding).toEqual([0.9, 0.8, 0.7])
      })
    })

    describe('queryByEmbedding with pgvector', () => {
      it('returns memories sorted by vector similarity using native pgvector', async () => {
        // Insert memories with different similarity to query vector [1, 0, 0]
        await adapter.insert({
          userId: 'user-1',
          content: 'Very similar',
          embedding: [0.9, 0.1, 0.1],
          metadata: {},
        })
        await adapter.insert({
          userId: 'user-1',
          content: 'Somewhat similar',
          embedding: [0.5, 0.5, 0.5],
          metadata: {},
        })
        await adapter.insert({
          userId: 'user-1',
          content: 'Not similar',
          embedding: [0.1, 0.9, 0.1],
          metadata: {},
        })

        const queryEmbedding = [1.0, 0.0, 0.0]
        const results = await adapter.queryByEmbedding(queryEmbedding, 'user-1', 3)

        expect(results).toHaveLength(3)
        // pgvector uses native cosine distance, so most similar should be first
        expect(results[0].content).toBe('Very similar')
        expect(results[2].content).toBe('Not similar')
      })

      it('respects limit with pgvector', async () => {
        await adapter.insert({
          userId: 'user-1',
          content: 'Memory 1',
          embedding: [0.1, 0.2, 0.3],
          metadata: {},
        })
        await adapter.insert({
          userId: 'user-1',
          content: 'Memory 2',
          embedding: [0.4, 0.5, 0.6],
          metadata: {},
        })
        await adapter.insert({
          userId: 'user-1',
          content: 'Memory 3',
          embedding: [0.7, 0.8, 0.9],
          metadata: {},
        })

        const results = await adapter.queryByEmbedding([0.5, 0.5, 0.5], 'user-1', 2)

        expect(results).toHaveLength(2)
      })

      it('filters by user with pgvector', async () => {
        await adapter.insert({
          userId: 'user-1',
          content: 'User 1 memory',
          embedding: [0.9, 0.1, 0.1],
          metadata: {},
        })
        await adapter.insert({
          userId: 'user-2',
          content: 'User 2 memory',
          embedding: [0.95, 0.05, 0.05],
          metadata: {},
        })

        const results = await adapter.queryByEmbedding([1.0, 0.0, 0.0], 'user-1', 10)

        expect(results).toHaveLength(1)
        expect(results[0].content).toBe('User 1 memory')
      })
    })

    describe('list with pgvector', () => {
      it('lists memories with vector embeddings', async () => {
        await adapter.insert({
          userId: 'user-1',
          content: 'Memory 1',
          embedding: [0.1, 0.2, 0.3],
          metadata: {},
        })
        await adapter.insert({
          userId: 'user-1',
          content: 'Memory 2',
          embedding: [0.4, 0.5, 0.6],
          metadata: {},
        })

        const memories = await adapter.list('user-1')

        expect(memories).toHaveLength(2)
        // Verify embeddings are properly parsed from pgvector format
        expect(memories[0].embedding).toHaveLength(3)
        expect(memories[1].embedding).toHaveLength(3)
      })
    })
  })

  // Test different distance metrics
  describeWithPgVector('pgvector distance metrics', () => {
    it('works with L2 distance metric', async () => {
      const adapter = postgresqlAdapter({
        connection: pgvectorConnectionString!,
        tableName: 'memories_l2_test',
        pgvector: {
          dimensions: 3,
          indexType: 'none', // Skip index for this quick test
          distanceMetric: 'l2',
        },
      })

      await adapter.clear('user-1')

      await adapter.insert({
        userId: 'user-1',
        content: 'Test L2',
        embedding: [0.1, 0.2, 0.3],
        metadata: {},
      })

      const results = await adapter.queryByEmbedding([0.1, 0.2, 0.3], 'user-1', 1)
      expect(results).toHaveLength(1)
      expect(results[0].content).toBe('Test L2')

      await adapter.clear('user-1')
    })

    it('works with inner product distance metric', async () => {
      const adapter = postgresqlAdapter({
        connection: pgvectorConnectionString!,
        tableName: 'memories_inner_test',
        pgvector: {
          dimensions: 3,
          indexType: 'none',
          distanceMetric: 'inner',
        },
      })

      await adapter.clear('user-1')

      await adapter.insert({
        userId: 'user-1',
        content: 'Test Inner',
        embedding: [0.5, 0.5, 0.5],
        metadata: {},
      })

      const results = await adapter.queryByEmbedding([0.5, 0.5, 0.5], 'user-1', 1)
      expect(results).toHaveLength(1)
      expect(results[0].content).toBe('Test Inner')

      await adapter.clear('user-1')
    })
  })
})
