import { wrapLanguageModel } from 'ai'
import type { LanguageModelV2 } from '@ai-sdk/provider'
import { createRecallMiddleware } from './middleware'
import type { RecallConfig, WrapOptions } from './types'

export type { RecallConfig, ExtractParams, WrapOptions } from './types'

/**
 * Create a recall wrapper for Vercel AI SDK models.
 *
 * @example
 * ```typescript
 * import { createRecall } from '@youcraft/recall-ai-sdk'
 * import { createMemory } from '@youcraft/recall'
 * import { anthropic } from '@ai-sdk/anthropic'
 *
 * const memory = createMemory({ db, embeddings, extractor })
 *
 * const recall = createRecall({
 *   memory,
 *   onExtract: async ({ messages, userId }) => {
 *     // Handle extraction (e.g., send to background job)
 *   }
 * })
 *
 * const { text } = await generateText({
 *   model: recall(anthropic('claude-sonnet-4-20250514'), { userId: 'user_123' }),
 *   prompt: 'What do you remember about me?',
 * })
 * ```
 */
export function createRecall(config: RecallConfig) {
  /**
   * Wrap a language model with memory injection and extraction.
   *
   * @param model - Any Vercel AI SDK LanguageModelV2
   * @param options - Options including userId for memory scoping
   * @returns Wrapped model with memory capabilities
   */
  return function recall<T extends LanguageModelV2>(model: T, options: WrapOptions): T {
    const middleware = createRecallMiddleware(config, options)

    return wrapLanguageModel({
      model,
      middleware,
    }) as T
  }
}
