import { createMemory } from '@youcraft/recall'
import { sqliteAdapter } from '@youcraft/recall-adapter-sqlite'
import { openaiExtractor } from '@youcraft/recall-extractor-openai'
import { openaiEmbeddings } from '@youcraft/recall-embeddings-openai'
import { createRecall } from '@youcraft/recall-ai-sdk'
import { inngest } from './inngest/client'

// Shared memory instance with SQLite for persistence
// Data is stored in recall.db file in the project root
export const memory = createMemory({
  db: sqliteAdapter({ filename: 'recall.db' }),
  extractor: openaiExtractor({
    apiKey: process.env.OPENAI_API_KEY!,
  }),
  embeddings: openaiEmbeddings({
    apiKey: process.env.OPENAI_API_KEY!,
  }),
})

/**
 * Recall wrapper for AI SDK models
 * Automatically:
 * 1. Queries relevant memories and injects them into the system prompt
 * 2. Triggers memory extraction via Inngest after each response
 */
export const recall = createRecall({
  memory,
  onExtract: async ({ messages, userId }) => {
    // Send to Inngest for background processing
    await inngest.send({
      name: 'chat/message.completed',
      data: {
        userId,
        messages: messages.map(m => {
          let content = ''
          if (typeof m.content === 'string') {
            content = m.content
          } else if (Array.isArray(m.content)) {
            content = m.content
              .filter(p => p.type === 'text' && 'text' in p)
              .map(p => (p as { type: 'text'; text: string }).text)
              .join(' ')
          }
          return { role: m.role, content }
        }),
      },
    })
  },
})

/**
 * Query relevant memories for a user based on the current message
 * This runs in real-time before sending to the AI
 */
export async function queryMemories(userId: string, query: string, limit = 5): Promise<string[]> {
  if (!query.trim()) return []

  const memories = await memory.query(query, { userId, limit })
  return memories.map(m => m.content)
}

/**
 * Format memories as context for the AI system prompt
 */
export function formatMemoriesAsContext(memories: string[]): string {
  if (memories.length === 0) return ''

  return `
## Relevant memories about this user:
${memories.map(m => `- ${m}`).join('\n')}

Use these memories to personalize your response when relevant.
`.trim()
}
