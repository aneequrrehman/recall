import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockBetaChatCompletionsParse = vi.fn()

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      beta: {
        chat: {
          completions: {
            parse: mockBetaChatCompletionsParse,
          },
        },
      },
    })),
  }
})

import OpenAI from 'openai'
import { openaiExtractor } from '../extractor'

function mockParsedResponse(parsed: unknown) {
  return {
    choices: [
      {
        message: {
          parsed,
        },
      },
    ],
  }
}

describe('openaiExtractor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('creates OpenAI client with provided API key', async () => {
      mockBetaChatCompletionsParse.mockResolvedValue(mockParsedResponse({ memories: [] }))

      const provider = openaiExtractor({ apiKey: 'test-api-key' })
      await provider.extract('test')

      expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' })
    })

    it('uses gpt-5-nano as default model', async () => {
      mockBetaChatCompletionsParse.mockResolvedValue(mockParsedResponse({ memories: [] }))

      const provider = openaiExtractor({ apiKey: 'test-api-key' })
      await provider.extract('test')

      expect(mockBetaChatCompletionsParse).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5-nano',
        })
      )
    })

    it('uses custom model when provided', async () => {
      mockBetaChatCompletionsParse.mockResolvedValue(mockParsedResponse({ memories: [] }))

      const provider = openaiExtractor({
        apiKey: 'test-api-key',
        model: 'gpt-5-nano',
      })
      await provider.extract('test')

      expect(mockBetaChatCompletionsParse).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5-nano',
        })
      )
    })
  })

  describe('extract', () => {
    it('calls OpenAI API with correct parameters', async () => {
      mockBetaChatCompletionsParse.mockResolvedValue(mockParsedResponse({ memories: [] }))

      const provider = openaiExtractor({ apiKey: 'test-api-key' })
      await provider.extract('User said they live in NYC')

      expect(mockBetaChatCompletionsParse).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5-nano',
          messages: [
            {
              role: 'system',
              content: expect.stringContaining('memory extraction'),
            },
            { role: 'user', content: 'User said they live in NYC' },
          ],
        })
      )
    })

    it('parses response with memories array', async () => {
      mockBetaChatCompletionsParse.mockResolvedValue(
        mockParsedResponse({
          memories: [{ content: 'User lives in NYC' }, { content: 'User works at Acme' }],
        })
      )

      const provider = openaiExtractor({ apiKey: 'test-api-key' })
      const result = await provider.extract('Some conversation')

      expect(result).toEqual([{ content: 'User lives in NYC' }, { content: 'User works at Acme' }])
    })

    it('returns empty array for empty memories', async () => {
      mockBetaChatCompletionsParse.mockResolvedValue(mockParsedResponse({ memories: [] }))

      const provider = openaiExtractor({ apiKey: 'test-api-key' })
      const result = await provider.extract('Some conversation')

      expect(result).toEqual([])
    })

    it('returns empty array for null parsed response', async () => {
      mockBetaChatCompletionsParse.mockResolvedValue(mockParsedResponse(null))

      const provider = openaiExtractor({ apiKey: 'test-api-key' })
      const result = await provider.extract('Some conversation')

      expect(result).toEqual([])
    })

    it('returns empty array for missing choices', async () => {
      mockBetaChatCompletionsParse.mockResolvedValue({ choices: [] })

      const provider = openaiExtractor({ apiKey: 'test-api-key' })
      const result = await provider.extract('Some conversation')

      expect(result).toEqual([])
    })

    it('returns empty array when memories field is missing', async () => {
      mockBetaChatCompletionsParse.mockResolvedValue(mockParsedResponse({}))

      const provider = openaiExtractor({ apiKey: 'test-api-key' })
      const result = await provider.extract('Some conversation')

      expect(result).toEqual([])
    })
  })

  describe('consolidate', () => {
    it('returns ADD with content when no existing memories', async () => {
      const provider = openaiExtractor({ apiKey: 'test-api-key' })
      const result = await provider.consolidate!('User likes pizza', [])

      expect(result).toEqual({ action: 'ADD', content: 'User likes pizza' })
      expect(mockBetaChatCompletionsParse).not.toHaveBeenCalled()
    })

    it('calls OpenAI API when existing memories present', async () => {
      mockBetaChatCompletionsParse.mockResolvedValue(mockParsedResponse({ action: 'NONE' }))

      const provider = openaiExtractor({ apiKey: 'test-api-key' })
      await provider.consolidate!('User likes pizza', [
        { id: 'abc-123', content: 'User likes pizza' },
      ])

      expect(mockBetaChatCompletionsParse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            {
              role: 'system',
              content: expect.stringContaining('memory management'),
            },
            {
              role: 'user',
              content: expect.stringContaining('User likes pizza'),
            },
          ],
        })
      )
    })

    it('returns ADD decision correctly', async () => {
      mockBetaChatCompletionsParse.mockResolvedValue(
        mockParsedResponse({ action: 'ADD', content: 'User works at Google' })
      )

      const provider = openaiExtractor({ apiKey: 'test-api-key' })
      const result = await provider.consolidate!('User works at Google', [
        { id: 'abc-123', content: 'User likes pizza' },
      ])

      expect(result).toEqual({
        action: 'ADD',
        content: 'User works at Google',
      })
    })

    it('returns UPDATE decision correctly', async () => {
      mockBetaChatCompletionsParse.mockResolvedValue(
        mockParsedResponse({
          action: 'UPDATE',
          id: 'abc-123',
          content: "User's name is John Doe",
        })
      )

      const provider = openaiExtractor({ apiKey: 'test-api-key' })
      const result = await provider.consolidate!("User's name is John Doe", [
        { id: 'abc-123', content: "User's name is John" },
      ])

      expect(result).toEqual({
        action: 'UPDATE',
        id: 'abc-123',
        content: "User's name is John Doe",
      })
    })

    it('returns DELETE decision correctly', async () => {
      mockBetaChatCompletionsParse.mockResolvedValue(
        mockParsedResponse({ action: 'DELETE', id: 'abc-123' })
      )

      const provider = openaiExtractor({ apiKey: 'test-api-key' })
      const result = await provider.consolidate!('User no longer works at Google', [
        { id: 'abc-123', content: 'User works at Google' },
      ])

      expect(result).toEqual({ action: 'DELETE', id: 'abc-123' })
    })

    it('returns NONE decision correctly', async () => {
      mockBetaChatCompletionsParse.mockResolvedValue(mockParsedResponse({ action: 'NONE' }))

      const provider = openaiExtractor({ apiKey: 'test-api-key' })
      const result = await provider.consolidate!('User likes pizza', [
        { id: 'abc-123', content: 'User likes pizza' },
      ])

      expect(result).toEqual({ action: 'NONE' })
    })

    it('falls back to ADD when parsing fails', async () => {
      mockBetaChatCompletionsParse.mockResolvedValue(mockParsedResponse(null))

      const provider = openaiExtractor({ apiKey: 'test-api-key' })
      const result = await provider.consolidate!('User likes sushi', [
        { id: 'abc-123', content: 'User likes pizza' },
      ])

      expect(result).toEqual({ action: 'ADD', content: 'User likes sushi' })
    })
  })
})
