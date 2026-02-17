import type { MemoryConfig, Memory, QueryOptions, ExtractOptions, ListOptions } from './types'

export function createMemory(config: MemoryConfig) {
  const { db, embeddings, extractor } = config

  return {
    async extract(text: string, options: ExtractOptions): Promise<Memory[]> {
      const extracted = await extractor.extract(text)

      const memories: Memory[] = []

      for (const item of extracted) {
        const embedding = await embeddings.embed(item.content)

        // If extractor supports consolidation, use it
        if (extractor.consolidate) {
          // Find similar existing memories
          const similar = await db.queryByEmbedding(embedding, options.userId, 5)

          // Map UUIDs to integer IDs to prevent LLM hallucination
          // LLMs tend to modify/hallucinate UUIDs, so we use simple integers
          const idMapping: Record<string, string> = {}
          const existingMemories = similar.map((m, idx) => {
            const intId = String(idx)
            idMapping[intId] = m.id // Store mapping: "0" -> "abc-123-..."
            return {
              id: intId,
              content: m.content,
            }
          })

          // Get consolidation decision
          const decision = await extractor.consolidate(item.content, existingMemories)

          // Map integer ID back to original UUID
          if (decision.id && decision.id in idMapping) {
            decision.id = idMapping[decision.id]
          }

          const metadata = {
            source: options.source,
            sourceId: options.sourceId,
            ...item.metadata,
          }

          switch (decision.action) {
            case 'ADD': {
              const memory = await db.insert({
                userId: options.userId,
                content: decision.content!,
                embedding,
                metadata,
              })
              memories.push(memory)
              break
            }

            case 'UPDATE': {
              if (!decision.id) {
                // Invalid ID - fall back to ADD
                const memory = await db.insert({
                  userId: options.userId,
                  content: decision.content!,
                  embedding,
                  metadata,
                })
                memories.push(memory)
                break
              }
              // Re-embed since content changed
              const newEmbedding = await embeddings.embed(decision.content!)
              const updated = await db.update(decision.id, {
                content: decision.content!,
                embedding: newEmbedding,
              })
              memories.push(updated)
              break
            }

            case 'DELETE': {
              if (decision.id) {
                await db.delete(decision.id)
              }
              // DELETE doesn't add to results
              break
            }

            case 'NONE':
              // Memory already exists - skip
              break
          }
        } else {
          // Fallback: no consolidation support, just insert
          const memory = await db.insert({
            userId: options.userId,
            content: item.content,
            embedding,
            metadata: {
              source: options.source,
              sourceId: options.sourceId,
              ...item.metadata,
            },
          })
          memories.push(memory)
        }
      }

      return memories
    },

    async query(context: string, options: QueryOptions): Promise<Memory[]> {
      const embedding = await embeddings.embed(context)

      const memories = await db.queryByEmbedding(embedding, options.userId, options.limit ?? 10)

      if (options.threshold) {
        return memories.filter(m => cosineSimilarity(embedding, m.embedding) >= options.threshold!)
      }

      return memories
    },

    async list(userId: string, options?: ListOptions): Promise<Memory[]> {
      return db.list(userId, options)
    },

    async count(userId: string): Promise<number> {
      return db.count(userId)
    },

    async get(id: string): Promise<Memory | null> {
      return db.get(id)
    },

    async update(
      id: string,
      data: { content?: string; metadata?: Memory['metadata'] }
    ): Promise<Memory> {
      let embedding: number[] | undefined

      if (data.content) {
        embedding = await embeddings.embed(data.content)
      }

      return db.update(id, {
        content: data.content,
        embedding,
        metadata: data.metadata,
      })
    },

    async delete(id: string): Promise<void> {
      return db.delete(id)
    },

    async clear(userId: string): Promise<void> {
      return db.clear(userId)
    },
  }
}

export type MemoryClient = ReturnType<typeof createMemory>

export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
