import { RecallClient } from '@youcraft/recall-client'
import { createRecall } from '@youcraft/recall-client/ai-sdk'

/**
 * Recall client instance for direct API calls (list, get, delete, etc.)
 *
 * Note: During build time, a placeholder API key is used to prevent initialization errors.
 * The actual API key will be used at runtime.
 */
export const recallClient = new RecallClient({
  apiKey: process.env.RECALL_API_KEY || 'placeholder-key-for-build',
  baseUrl: process.env.RECALL_API_URL,
})

/**
 * Recall wrapper for Vercel AI SDK models.
 * Automatically injects relevant memories into the conversation context.
 */
export const recall = createRecall({
  apiKey: process.env.RECALL_API_KEY || 'placeholder-key-for-build',
  baseUrl: process.env.RECALL_API_URL,
})
