import { createMemory } from '@youcraft/recall'
import { sqliteAdapter } from '@youcraft/recall-adapter-sqlite'
import { openaiExtractor } from '@youcraft/recall-extractor-openai'
import { openaiEmbeddings } from '@youcraft/recall-embeddings-openai'
import { createRecall } from '@youcraft/recall-ai-sdk'
import { start } from 'workflow/api'
import { extractMemories } from '@/workflows/extract-memories'

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
 * 2. Triggers memory extraction via WDK workflow after each response
 */
export const recall = createRecall({
  memory,
  onExtract: async ({ messages, userId }) => {
    // Send to WDK workflow for background processing
    await start(extractMemories, [
      userId,
      messages.map(m => {
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
    ])
  },
})
