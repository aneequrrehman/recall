import { randomUUID } from 'node:crypto'
import type { DatabaseAdapter, ListOptions, Memory } from './types'
import { cosineSimilarity } from './memory'

export function inMemoryAdapter(): DatabaseAdapter {
  const store = new Map<string, Memory>()

  return {
    async insert(data) {
      const id = randomUUID()
      const now = new Date()

      const memory: Memory = {
        id,
        userId: data.userId,
        content: data.content,
        embedding: data.embedding,
        metadata: data.metadata,
        createdAt: now,
        updatedAt: now,
      }

      store.set(id, memory)
      return memory
    },

    async update(id, data) {
      const existing = store.get(id)
      if (!existing) {
        throw new Error(`Memory with id ${id} not found`)
      }

      const updated: Memory = {
        ...existing,
        ...(data.content !== undefined && { content: data.content }),
        ...(data.embedding !== undefined && { embedding: data.embedding }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
        updatedAt: new Date(),
      }

      store.set(id, updated)
      return updated
    },

    async delete(id) {
      store.delete(id)
    },

    async get(id) {
      return store.get(id) ?? null
    },

    async list(userId, options?: ListOptions) {
      const memories: Memory[] = []

      for (const memory of store.values()) {
        if (memory.userId === userId) {
          memories.push(memory)
        }
      }

      const sorted = memories.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      if (options?.limit !== undefined || options?.offset !== undefined) {
        const offset = options.offset ?? 0
        const limit = options.limit ?? sorted.length
        return sorted.slice(offset, offset + limit)
      }

      return sorted
    },

    async count(userId) {
      let count = 0
      for (const memory of store.values()) {
        if (memory.userId === userId) {
          count++
        }
      }
      return count
    },

    async clear(userId) {
      for (const [id, memory] of store.entries()) {
        if (memory.userId === userId) {
          store.delete(id)
        }
      }
    },

    async queryByEmbedding(embedding, userId, limit) {
      const memories: Array<{ memory: Memory; similarity: number }> = []

      for (const memory of store.values()) {
        if (memory.userId === userId) {
          const similarity = cosineSimilarity(embedding, memory.embedding)
          memories.push({ memory, similarity })
        }
      }

      return memories
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => item.memory)
    },
  }
}
