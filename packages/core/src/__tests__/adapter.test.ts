import { describe, it, expect, beforeEach } from 'vitest'
import { inMemoryAdapter } from '../adapter'
import type { DatabaseAdapter } from '../types'

describe('inMemoryAdapter', () => {
  let adapter: DatabaseAdapter

  beforeEach(() => {
    adapter = inMemoryAdapter()
  })

  describe('insert', () => {
    it('creates memory with ID and timestamps', async () => {
      const memory = await adapter.insert({
        userId: 'user_1',
        content: 'Test memory',
        embedding: [0.1, 0.2, 0.3],
        metadata: { source: 'test' },
      })

      expect(memory.id).toBeDefined()
      expect(memory.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      expect(memory.userId).toBe('user_1')
      expect(memory.content).toBe('Test memory')
      expect(memory.embedding).toEqual([0.1, 0.2, 0.3])
      expect(memory.metadata).toEqual({ source: 'test' })
      expect(memory.createdAt).toBeInstanceOf(Date)
      expect(memory.updatedAt).toBeInstanceOf(Date)
    })

    it('creates unique IDs for each memory', async () => {
      const memory1 = await adapter.insert({
        userId: 'user_1',
        content: 'Memory 1',
        embedding: [0.1],
        metadata: {},
      })

      const memory2 = await adapter.insert({
        userId: 'user_1',
        content: 'Memory 2',
        embedding: [0.2],
        metadata: {},
      })

      expect(memory1.id).not.toBe(memory2.id)
    })
  })

  describe('get', () => {
    it('returns memory by ID', async () => {
      const inserted = await adapter.insert({
        userId: 'user_1',
        content: 'Test memory',
        embedding: [0.1, 0.2, 0.3],
        metadata: {},
      })

      const retrieved = await adapter.get(inserted.id)
      expect(retrieved).toEqual(inserted)
    })

    it('returns null for non-existent ID', async () => {
      const result = await adapter.get('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('list', () => {
    it('returns all memories for a user', async () => {
      await adapter.insert({
        userId: 'user_1',
        content: 'Memory 1',
        embedding: [0.1],
        metadata: {},
      })

      await adapter.insert({
        userId: 'user_1',
        content: 'Memory 2',
        embedding: [0.2],
        metadata: {},
      })

      await adapter.insert({
        userId: 'user_2',
        content: 'Memory 3',
        embedding: [0.3],
        metadata: {},
      })

      const user1Memories = await adapter.list('user_1')
      expect(user1Memories).toHaveLength(2)
      expect(user1Memories.every(m => m.userId === 'user_1')).toBe(true)
    })

    it('returns empty array for user with no memories', async () => {
      const memories = await adapter.list('non-existent-user')
      expect(memories).toEqual([])
    })

    it('sorts by createdAt descending', async () => {
      const memory1 = await adapter.insert({
        userId: 'user_1',
        content: 'Memory 1',
        embedding: [0.1],
        metadata: {},
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const memory2 = await adapter.insert({
        userId: 'user_1',
        content: 'Memory 2',
        embedding: [0.2],
        metadata: {},
      })

      const memories = await adapter.list('user_1')
      expect(memories[0].id).toBe(memory2.id)
      expect(memories[1].id).toBe(memory1.id)
    })

    it('supports limit option', async () => {
      for (let i = 0; i < 5; i++) {
        await adapter.insert({
          userId: 'user_1',
          content: `Memory ${i}`,
          embedding: [i * 0.1],
          metadata: {},
        })
      }

      const memories = await adapter.list('user_1', { limit: 3 })
      expect(memories).toHaveLength(3)
    })

    it('supports offset option', async () => {
      for (let i = 0; i < 5; i++) {
        await adapter.insert({
          userId: 'user_1',
          content: `Memory ${i}`,
          embedding: [i * 0.1],
          metadata: {},
        })
      }

      const all = await adapter.list('user_1')
      const offset = await adapter.list('user_1', { offset: 2 })

      expect(offset).toHaveLength(3)
      expect(offset[0].id).toBe(all[2].id)
    })

    it('supports limit and offset together', async () => {
      for (let i = 0; i < 5; i++) {
        await adapter.insert({
          userId: 'user_1',
          content: `Memory ${i}`,
          embedding: [i * 0.1],
          metadata: {},
        })
      }

      const all = await adapter.list('user_1')
      const paginated = await adapter.list('user_1', { limit: 2, offset: 1 })

      expect(paginated).toHaveLength(2)
      expect(paginated[0].id).toBe(all[1].id)
      expect(paginated[1].id).toBe(all[2].id)
    })
  })

  describe('count', () => {
    it('returns count of memories for a user', async () => {
      await adapter.insert({
        userId: 'user_1',
        content: 'Memory 1',
        embedding: [0.1],
        metadata: {},
      })

      await adapter.insert({
        userId: 'user_1',
        content: 'Memory 2',
        embedding: [0.2],
        metadata: {},
      })

      await adapter.insert({
        userId: 'user_2',
        content: 'Memory 3',
        embedding: [0.3],
        metadata: {},
      })

      const count = await adapter.count('user_1')
      expect(count).toBe(2)
    })

    it('returns 0 for user with no memories', async () => {
      const count = await adapter.count('non-existent-user')
      expect(count).toBe(0)
    })
  })

  describe('update', () => {
    it('modifies memory and updates timestamp', async () => {
      const original = await adapter.insert({
        userId: 'user_1',
        content: 'Original content',
        embedding: [0.1, 0.2],
        metadata: { key: 'value' },
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const updated = await adapter.update(original.id, {
        content: 'Updated content',
        embedding: [0.3, 0.4],
      })

      expect(updated.content).toBe('Updated content')
      expect(updated.embedding).toEqual([0.3, 0.4])
      expect(updated.metadata).toEqual({ key: 'value' })
      expect(updated.updatedAt.getTime()).toBeGreaterThan(original.updatedAt.getTime())
    })

    it('only updates provided fields', async () => {
      const original = await adapter.insert({
        userId: 'user_1',
        content: 'Original content',
        embedding: [0.1, 0.2],
        metadata: { key: 'value' },
      })

      const updated = await adapter.update(original.id, {
        content: 'Updated content',
      })

      expect(updated.content).toBe('Updated content')
      expect(updated.embedding).toEqual([0.1, 0.2])
      expect(updated.metadata).toEqual({ key: 'value' })
    })

    it('throws for non-existent ID', async () => {
      await expect(adapter.update('non-existent-id', { content: 'New content' })).rejects.toThrow(
        'Memory with id non-existent-id not found'
      )
    })
  })

  describe('delete', () => {
    it('removes memory', async () => {
      const memory = await adapter.insert({
        userId: 'user_1',
        content: 'Test memory',
        embedding: [0.1],
        metadata: {},
      })

      await adapter.delete(memory.id)

      const result = await adapter.get(memory.id)
      expect(result).toBeNull()
    })

    it('does not throw for non-existent ID', async () => {
      await expect(adapter.delete('non-existent-id')).resolves.not.toThrow()
    })
  })

  describe('clear', () => {
    it('removes all memories for a user', async () => {
      await adapter.insert({
        userId: 'user_1',
        content: 'Memory 1',
        embedding: [0.1],
        metadata: {},
      })

      await adapter.insert({
        userId: 'user_1',
        content: 'Memory 2',
        embedding: [0.2],
        metadata: {},
      })

      await adapter.insert({
        userId: 'user_2',
        content: 'Memory 3',
        embedding: [0.3],
        metadata: {},
      })

      await adapter.clear('user_1')

      const user1Memories = await adapter.list('user_1')
      const user2Memories = await adapter.list('user_2')

      expect(user1Memories).toHaveLength(0)
      expect(user2Memories).toHaveLength(1)
    })
  })

  describe('queryByEmbedding', () => {
    it('returns memories sorted by similarity', async () => {
      await adapter.insert({
        userId: 'user_1',
        content: 'Memory 1',
        embedding: [1, 0, 0],
        metadata: {},
      })

      await adapter.insert({
        userId: 'user_1',
        content: 'Memory 2',
        embedding: [0.9, 0.1, 0],
        metadata: {},
      })

      await adapter.insert({
        userId: 'user_1',
        content: 'Memory 3',
        embedding: [0, 1, 0],
        metadata: {},
      })

      const queryEmbedding = [1, 0, 0]
      const results = await adapter.queryByEmbedding(queryEmbedding, 'user_1', 10)

      expect(results).toHaveLength(3)
      expect(results[0].content).toBe('Memory 1')
      expect(results[1].content).toBe('Memory 2')
      expect(results[2].content).toBe('Memory 3')
    })

    it('respects limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await adapter.insert({
          userId: 'user_1',
          content: `Memory ${i}`,
          embedding: [i * 0.1, 0.5, 0.5],
          metadata: {},
        })
      }

      const results = await adapter.queryByEmbedding([0.4, 0.5, 0.5], 'user_1', 3)
      expect(results).toHaveLength(3)
    })

    it('only returns memories for specified user', async () => {
      await adapter.insert({
        userId: 'user_1',
        content: 'User 1 memory',
        embedding: [1, 0, 0],
        metadata: {},
      })

      await adapter.insert({
        userId: 'user_2',
        content: 'User 2 memory',
        embedding: [1, 0, 0],
        metadata: {},
      })

      const results = await adapter.queryByEmbedding([1, 0, 0], 'user_1', 10)
      expect(results).toHaveLength(1)
      expect(results[0].userId).toBe('user_1')
    })
  })
})
