import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockEmbeddingsCreate = vi.fn()

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      embeddings: {
        create: mockEmbeddingsCreate,
      },
    })),
  }
})

import OpenAI from 'openai'
import { openaiEmbeddings } from '../embeddings'

describe('openaiEmbeddings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('creates OpenAI client with provided API key', () => {
      openaiEmbeddings({ apiKey: 'test-api-key' })

      expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' })
    })

    it('uses text-embedding-3-small as default model', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
      })

      const provider = openaiEmbeddings({ apiKey: 'test-api-key' })
      await provider.embed('test')

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test',
      })
    })

    it('uses custom model when provided', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
      })

      const provider = openaiEmbeddings({
        apiKey: 'test-api-key',
        model: 'text-embedding-3-large',
      })
      await provider.embed('test')

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-large',
        input: 'test',
      })
    })
  })

  describe('dimensions', () => {
    it('returns 1536 for small model', () => {
      const provider = openaiEmbeddings({ apiKey: 'test-api-key' })
      expect(provider.dimensions).toBe(1536)
    })

    it('returns 1536 for text-embedding-3-small', () => {
      const provider = openaiEmbeddings({
        apiKey: 'test-api-key',
        model: 'text-embedding-3-small',
      })
      expect(provider.dimensions).toBe(1536)
    })

    it('returns 3072 for text-embedding-3-large', () => {
      const provider = openaiEmbeddings({
        apiKey: 'test-api-key',
        model: 'text-embedding-3-large',
      })
      expect(provider.dimensions).toBe(3072)
    })

    it('returns 1536 for unknown models without "large"', () => {
      const provider = openaiEmbeddings({
        apiKey: 'test-api-key',
        model: 'some-custom-model',
      })
      expect(provider.dimensions).toBe(1536)
    })
  })

  describe('embed', () => {
    it('calls OpenAI API with correct parameters', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
      })

      const provider = openaiEmbeddings({ apiKey: 'test-api-key' })
      await provider.embed('Hello world')

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'Hello world',
      })
    })

    it('returns embedding array from response', async () => {
      const expectedEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5]
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: expectedEmbedding }],
      })

      const provider = openaiEmbeddings({ apiKey: 'test-api-key' })
      const result = await provider.embed('Hello world')

      expect(result).toEqual(expectedEmbedding)
    })
  })

  describe('embedBatch', () => {
    it('calls OpenAI API with multiple texts', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }, { embedding: [0.5, 0.6] }],
      })

      const provider = openaiEmbeddings({ apiKey: 'test-api-key' })
      await provider.embedBatch(['text1', 'text2', 'text3'])

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: ['text1', 'text2', 'text3'],
      })
    })

    it('returns array of embeddings', async () => {
      const embeddings = [
        [0.1, 0.2],
        [0.3, 0.4],
        [0.5, 0.6],
      ]
      mockEmbeddingsCreate.mockResolvedValue({
        data: embeddings.map(embedding => ({ embedding })),
      })

      const provider = openaiEmbeddings({ apiKey: 'test-api-key' })
      const result = await provider.embedBatch(['text1', 'text2', 'text3'])

      expect(result).toEqual(embeddings)
    })

    it('handles empty array', async () => {
      mockEmbeddingsCreate.mockResolvedValue({ data: [] })

      const provider = openaiEmbeddings({ apiKey: 'test-api-key' })
      const result = await provider.embedBatch([])

      expect(result).toEqual([])
    })
  })
})
