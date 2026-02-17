import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMemory } from '../memory'
import { inMemoryAdapter } from '../adapter'
import type { DatabaseAdapter, EmbeddingsProvider, ExtractorProvider, Memory } from '../types'

function createMockEmbeddings(): EmbeddingsProvider {
  let callCount = 0
  return {
    dimensions: 3,
    embed: vi.fn().mockImplementation(async (text: string) => {
      callCount++
      return [callCount * 0.1, 0.5, 0.5]
    }),
    embedBatch: vi.fn().mockImplementation(async (texts: string[]) => {
      return texts.map((_, i) => [(i + 1) * 0.1, 0.5, 0.5])
    }),
  }
}

function createMockExtractor(): ExtractorProvider {
  return {
    extract: vi
      .fn()
      .mockResolvedValue([{ content: 'User likes TypeScript' }, { content: 'User works at Acme' }]),
  }
}

describe('createMemory', () => {
  let adapter: DatabaseAdapter
  let embeddings: EmbeddingsProvider
  let extractor: ExtractorProvider

  beforeEach(() => {
    adapter = inMemoryAdapter()
    embeddings = createMockEmbeddings()
    extractor = createMockExtractor()
  })

  describe('extract', () => {
    it('calls extractor and stores memories', async () => {
      const memory = createMemory({ db: adapter, embeddings, extractor })

      const result = await memory.extract('Some conversation text', {
        userId: 'user_1',
      })

      expect(extractor.extract).toHaveBeenCalledWith('Some conversation text')
      expect(result).toHaveLength(2)
      expect(result[0].content).toBe('User likes TypeScript')
      expect(result[1].content).toBe('User works at Acme')
    })

    it('embeds each extracted memory', async () => {
      const memory = createMemory({ db: adapter, embeddings, extractor })

      await memory.extract('Some conversation text', { userId: 'user_1' })

      expect(embeddings.embed).toHaveBeenCalledTimes(2)
      expect(embeddings.embed).toHaveBeenCalledWith('User likes TypeScript')
      expect(embeddings.embed).toHaveBeenCalledWith('User works at Acme')
    })

    it('returns created memories with metadata', async () => {
      const memory = createMemory({ db: adapter, embeddings, extractor })

      const result = await memory.extract('Some conversation text', {
        userId: 'user_1',
        source: 'conversation',
        sourceId: 'conv_123',
      })

      expect(result[0].metadata.source).toBe('conversation')
      expect(result[0].metadata.sourceId).toBe('conv_123')
      expect(result[0].userId).toBe('user_1')
      expect(result[0].id).toBeDefined()
    })

    it('stores memories in the database', async () => {
      const memory = createMemory({ db: adapter, embeddings, extractor })

      await memory.extract('Some conversation text', { userId: 'user_1' })

      const stored = await adapter.list('user_1')
      expect(stored).toHaveLength(2)
    })

    it('returns empty array when extractor finds no memories', async () => {
      const emptyExtractor: ExtractorProvider = {
        extract: vi.fn().mockResolvedValue([]),
      }
      const memory = createMemory({
        db: adapter,
        embeddings,
        extractor: emptyExtractor,
      })

      const result = await memory.extract('Some text', { userId: 'user_1' })

      expect(result).toEqual([])
    })
  })

  describe('query', () => {
    it('embeds context and queries database', async () => {
      const memory = createMemory({ db: adapter, embeddings, extractor })

      await memory.extract('Some text', { userId: 'user_1' })
      vi.mocked(embeddings.embed).mockClear()

      await memory.query('What does user like?', { userId: 'user_1' })

      expect(embeddings.embed).toHaveBeenCalledWith('What does user like?')
    })

    it('respects limit option', async () => {
      const memory = createMemory({ db: adapter, embeddings, extractor })

      vi.mocked(extractor.extract).mockResolvedValue([
        { content: 'Memory 1' },
        { content: 'Memory 2' },
        { content: 'Memory 3' },
        { content: 'Memory 4' },
        { content: 'Memory 5' },
      ])

      await memory.extract('Some text', { userId: 'user_1' })

      const result = await memory.query('query', { userId: 'user_1', limit: 2 })

      expect(result).toHaveLength(2)
    })

    it('uses default limit of 10', async () => {
      const memory = createMemory({ db: adapter, embeddings, extractor })

      const manyMemories = Array.from({ length: 15 }, (_, i) => ({
        content: `Memory ${i}`,
      }))
      vi.mocked(extractor.extract).mockResolvedValue(manyMemories)

      await memory.extract('Some text', { userId: 'user_1' })

      const result = await memory.query('query', { userId: 'user_1' })

      expect(result).toHaveLength(10)
    })

    it('filters by threshold when provided', async () => {
      const memory = createMemory({ db: adapter, embeddings, extractor })

      await adapter.insert({
        userId: 'user_1',
        content: 'Very similar',
        embedding: [1, 0, 0],
        metadata: {},
      })

      await adapter.insert({
        userId: 'user_1',
        content: 'Not similar',
        embedding: [0, 1, 0],
        metadata: {},
      })

      vi.mocked(embeddings.embed).mockResolvedValue([1, 0, 0])

      const result = await memory.query('query', {
        userId: 'user_1',
        threshold: 0.9,
      })

      expect(result).toHaveLength(1)
      expect(result[0].content).toBe('Very similar')
    })
  })

  describe('list', () => {
    it('delegates to database adapter', async () => {
      const memory = createMemory({ db: adapter, embeddings, extractor })

      await memory.extract('Some text', { userId: 'user_1' })
      await memory.extract('More text', { userId: 'user_2' })

      const result = await memory.list('user_1')

      expect(result).toHaveLength(2)
      expect(result.every(m => m.userId === 'user_1')).toBe(true)
    })
  })

  describe('get', () => {
    it('delegates to database adapter', async () => {
      const memory = createMemory({ db: adapter, embeddings, extractor })

      const [created] = await memory.extract('Some text', { userId: 'user_1' })

      const result = await memory.get(created.id)

      expect(result).toEqual(created)
    })

    it('returns null for non-existent ID', async () => {
      const memory = createMemory({ db: adapter, embeddings, extractor })

      const result = await memory.get('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('update', () => {
    it('re-embeds when content changes', async () => {
      const memory = createMemory({ db: adapter, embeddings, extractor })

      const [created] = await memory.extract('Some text', { userId: 'user_1' })
      vi.mocked(embeddings.embed).mockClear()

      await memory.update(created.id, { content: 'New content' })

      expect(embeddings.embed).toHaveBeenCalledWith('New content')
    })

    it('does not re-embed when only metadata changes', async () => {
      const memory = createMemory({ db: adapter, embeddings, extractor })

      const [created] = await memory.extract('Some text', { userId: 'user_1' })
      vi.mocked(embeddings.embed).mockClear()

      await memory.update(created.id, { metadata: { newKey: 'newValue' } })

      expect(embeddings.embed).not.toHaveBeenCalled()
    })

    it('updates memory in database', async () => {
      const memory = createMemory({ db: adapter, embeddings, extractor })

      const [created] = await memory.extract('Some text', { userId: 'user_1' })

      const updated = await memory.update(created.id, {
        content: 'Updated content',
      })

      expect(updated.content).toBe('Updated content')

      const retrieved = await memory.get(created.id)
      expect(retrieved?.content).toBe('Updated content')
    })
  })

  describe('delete', () => {
    it('delegates to database adapter', async () => {
      const memory = createMemory({ db: adapter, embeddings, extractor })

      const [created] = await memory.extract('Some text', { userId: 'user_1' })

      await memory.delete(created.id)

      const result = await memory.get(created.id)
      expect(result).toBeNull()
    })
  })

  describe('clear', () => {
    it('delegates to database adapter', async () => {
      const memory = createMemory({ db: adapter, embeddings, extractor })

      await memory.extract('Some text', { userId: 'user_1' })
      await memory.extract('More text', { userId: 'user_1' })

      await memory.clear('user_1')

      const result = await memory.list('user_1')
      expect(result).toHaveLength(0)
    })
  })
})
