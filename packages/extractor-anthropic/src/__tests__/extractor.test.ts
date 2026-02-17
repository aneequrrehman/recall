import { describe, it, expect, vi, beforeEach } from 'vitest'
import { anthropicExtractor } from '../extractor'

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
  }
})

import Anthropic from '@anthropic-ai/sdk'

describe('anthropicExtractor', () => {
  let mockCreate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate = vi.fn()
    ;(Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      messages: {
        create: mockCreate,
      },
    }))
  })

  describe('extract', () => {
    it('extracts memories from text', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'extract_memories',
            input: {
              memories: [{ content: "User's name is John" }, { content: 'User lives in NYC' }],
            },
          },
        ],
      })

      const extractor = anthropicExtractor({ apiKey: 'test-key' })
      const result = await extractor.extract('My name is John and I live in NYC')

      expect(result).toEqual([{ content: "User's name is John" }, { content: 'User lives in NYC' }])

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-5-haiku-20241022',
          tools: expect.any(Array),
          tool_choice: { type: 'tool', name: 'extract_memories' },
        })
      )
    })

    it('returns empty array when no memories extracted', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'extract_memories',
            input: { memories: [] },
          },
        ],
      })

      const extractor = anthropicExtractor({ apiKey: 'test-key' })
      const result = await extractor.extract('Hello, how are you?')

      expect(result).toEqual([])
    })

    it('returns empty array when no tool use in response', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'No memories found' }],
      })

      const extractor = anthropicExtractor({ apiKey: 'test-key' })
      const result = await extractor.extract('Hello')

      expect(result).toEqual([])
    })

    it('uses custom model when provided', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'extract_memories',
            input: { memories: [] },
          },
        ],
      })

      const extractor = anthropicExtractor({
        apiKey: 'test-key',
        model: 'claude-3-opus-20240229',
      })
      await extractor.extract('Test')

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-opus-20240229',
        })
      )
    })
  })

  describe('consolidate', () => {
    it('returns ADD when no existing memories', async () => {
      const extractor = anthropicExtractor({ apiKey: 'test-key' })
      const result = await extractor.consolidate!("User's name is John", [])

      expect(result).toEqual({
        action: 'ADD',
        content: "User's name is John",
      })

      // Should not call the API
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('returns UPDATE when enriching existing memory', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'consolidate_memory',
            input: {
              action: 'UPDATE',
              id: '123',
              content: "User's name is John Doe",
            },
          },
        ],
      })

      const extractor = anthropicExtractor({ apiKey: 'test-key' })
      const result = await extractor.consolidate!("User's name is John Doe", [
        { id: '123', content: "User's name is John" },
      ])

      expect(result).toEqual({
        action: 'UPDATE',
        id: '123',
        content: "User's name is John Doe",
      })
    })

    it('returns DELETE when memory is contradicted', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'consolidate_memory',
            input: {
              action: 'DELETE',
              id: '456',
            },
          },
        ],
      })

      const extractor = anthropicExtractor({ apiKey: 'test-key' })
      const result = await extractor.consolidate!('User no longer lives in NYC', [
        { id: '456', content: 'User lives in NYC' },
      ])

      expect(result).toEqual({
        action: 'DELETE',
        id: '456',
        content: undefined,
      })
    })

    it('returns NONE for duplicate memories', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'consolidate_memory',
            input: {
              action: 'NONE',
            },
          },
        ],
      })

      const extractor = anthropicExtractor({ apiKey: 'test-key' })
      const result = await extractor.consolidate!("User's name is John", [
        { id: '789', content: "User's name is John" },
      ])

      expect(result).toEqual({
        action: 'NONE',
        id: undefined,
        content: undefined,
      })
    })

    it('falls back to ADD when no tool use in response', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Some text response' }],
      })

      const extractor = anthropicExtractor({ apiKey: 'test-key' })
      const result = await extractor.consolidate!('New fact', [{ id: '1', content: 'Old fact' }])

      expect(result).toEqual({
        action: 'ADD',
        content: 'New fact',
      })
    })
  })

  describe('configuration', () => {
    it('creates extractor with required config', () => {
      const extractor = anthropicExtractor({ apiKey: 'test-key' })

      expect(extractor).toBeDefined()
      expect(typeof extractor.extract).toBe('function')
      expect(typeof extractor.consolidate).toBe('function')
    })
  })
})
