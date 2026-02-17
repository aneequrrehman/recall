import type { MemoryClient } from '@youcraft/recall'
import type { LanguageModelV2Prompt } from '@ai-sdk/provider'

export interface RecallConfig {
  /**
   * Memory client instance from @youcraft/recall
   */
  memory: MemoryClient

  /**
   * Optional callback triggered after each response.
   * Use this to handle memory extraction (e.g., send to background job).
   * If not provided, extraction is skipped.
   */
  onExtract?: (params: ExtractParams) => Promise<void> | void
}

export interface ExtractParams {
  /**
   * The conversation messages
   */
  messages: LanguageModelV2Prompt

  /**
   * The user ID for this conversation
   */
  userId: string
}

export interface WrapOptions {
  /**
   * User ID to query and store memories for
   */
  userId: string

  /**
   * Maximum number of memories to inject (default: 10)
   */
  limit?: number

  /**
   * Minimum similarity threshold for memory retrieval (0-1)
   */
  threshold?: number
}
