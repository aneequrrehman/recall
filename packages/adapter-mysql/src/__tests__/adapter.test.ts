import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { mysqlAdapter } from '../adapter'

// These tests require a running MySQL instance
// Set the MYSQL_URL environment variable to run them
// Example: MYSQL_URL=mysql://root:password@localhost:3306/recall_test pnpm test

const TEST_TABLE = 'memories_test'

describe('mysqlAdapter', () => {
  const connectionString = process.env.MYSQL_URL

  // Skip tests if no database URL is provided
  const describeWithDb = connectionString ? describe : describe.skip

  describeWithDb('with database', () => {
    let adapter: ReturnType<typeof mysqlAdapter>

    beforeAll(() => {
      adapter = mysqlAdapter({
        connection: connectionString!,
        tableName: TEST_TABLE,
      })
    })

    beforeEach(async () => {
      // Clear the test table before each test
      await adapter.clear('user-1')
      await adapter.clear('user-2')
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
      const adapter = mysqlAdapter({
        connection: 'mysql://localhost:3306/nonexistent',
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
  })
})
