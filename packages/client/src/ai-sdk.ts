import { createRecall as createRecallCore } from '@youcraft/recall-ai-sdk'
import type { LanguageModelV2 } from '@ai-sdk/provider'
import { RecallClient } from './client'
import type { RecallClientConfig } from './types'

/**
 * Options when wrapping a model
 */
export interface WrapOptions {
  /**
   * Maximum number of memories to inject (default: 10)
   */
  limit?: number

  /**
   * Minimum similarity threshold for memory retrieval (0-1)
   */
  threshold?: number
}

/**
 * Create a MemoryClient adapter that wraps RecallClient for use with @youcraft/recall-ai-sdk
 */
function createMemoryClientAdapter(client: RecallClient) {
  return {
    async query(context: string, options: { userId: string; limit?: number; threshold?: number }) {
      const { memories } = await client.query(context, {
        limit: options.limit,
        threshold: options.threshold,
      })
      // Convert API response to MemoryClient format
      return memories.map(m => ({
        id: m.id,
        userId: options.userId,
        content: m.content,
        embedding: [], // Not needed for query results
        metadata: m.metadata || {},
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt || m.createdAt),
      }))
    },
    // These methods are not used by the ai-sdk middleware but required for interface
    async extract() {
      return []
    },
    async list() {
      return []
    },
    async count() {
      return 0
    },
    async get() {
      return null
    },
    async update() {
      throw new Error('Not implemented')
    },
    async delete() {
      /* noop */
    },
    async clear() {
      /* noop */
    },
  }
}

/**
 * Create a recall wrapper for Vercel AI SDK models using the hosted Recall API.
 *
 * The wrapper automatically:
 * 1. Queries relevant memories before each LLM call and injects them into the prompt
 * 2. Extracts new memories after each LLM response completes (via the hosted API)
 *
 * @example
 * ```typescript
 * import { createRecall } from '@youcraft/recall-client/ai-sdk'
 * import { anthropic } from '@ai-sdk/anthropic'
 * import { generateText } from 'ai'
 *
 * const recall = createRecall({
 *   apiKey: process.env.RECALL_API_KEY,
 * })
 *
 * const { text } = await generateText({
 *   model: recall(anthropic('claude-sonnet-4-20250514')),
 *   prompt: 'What do you remember about me?',
 * })
 * ```
 */
export function createRecall(config: RecallClientConfig) {
  const client = new RecallClient(config)
  const memoryAdapter = createMemoryClientAdapter(client)

  // Create the core recall wrapper with our adapter and onExtract callback
  const recallCore = createRecallCore({
    memory: memoryAdapter as Parameters<typeof createRecallCore>[0]['memory'],
    onExtract: async ({ messages, userId }) => {
      // Convert LanguageModelV2Prompt to API messages format
      const apiMessages: { role: 'user' | 'assistant' | 'system'; content: string }[] = []

      for (const message of messages) {
        if (message.role === 'system') continue // Skip system messages

        let content = ''
        if (message.role === 'user' || message.role === 'assistant') {
          if (typeof message.content === 'string') {
            content = message.content
          } else if (Array.isArray(message.content)) {
            content = message.content
              .filter(part => part.type === 'text' && 'text' in part)
              .map(part => (part as { type: 'text'; text: string }).text)
              .join(' ')
          }
          if (content) {
            apiMessages.push({ role: message.role, content })
          }
        }
      }

      if (apiMessages.length > 0) {
        await client.extract({ messages: apiMessages })
      }
    },
  })

  /**
   * Wrap a language model with memory injection and extraction.
   *
   * @param model - Any Vercel AI SDK LanguageModelV2
   * @param options - Options for memory retrieval
   * @returns Wrapped model with memory capabilities
   */
  return function recall<T extends LanguageModelV2>(model: T, options: WrapOptions = {}): T {
    // The core recall requires userId, but for hosted API it's derived from the API key
    // We pass a placeholder that won't be used for extraction (API key handles auth)
    return recallCore(model, {
      userId: '_hosted_',
      limit: options.limit,
      threshold: options.threshold,
    })
  }
}

// Re-export types
export type { RecallClientConfig } from './types'
