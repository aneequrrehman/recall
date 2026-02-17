import type { Memory } from '@youcraft/recall'
import type {
  RecallHandlersConfig,
  RecallHandlers,
  ToolResult,
  RecallAddInput,
  RecallQueryInput,
  RecallListInput,
  RecallGetInput,
  RecallUpdateInput,
  RecallDeleteInput,
  RecallClearInput,
} from './types'

/**
 * Format memory for output, excluding the embedding field for brevity
 */
function formatMemory(memory: Memory): Omit<Memory, 'embedding'> {
  const { embedding: _, ...rest } = memory
  return rest
}

/**
 * Format an array of memories for output
 */
function formatMemories(memories: Memory[]): Omit<Memory, 'embedding'>[] {
  return memories.map(formatMemory)
}

/**
 * Create handlers for all Recall MCP tools
 */
export function createRecallHandlers(config: RecallHandlersConfig): RecallHandlers {
  const { memory, defaultUserId } = config

  function resolveUserId(inputUserId?: string): string {
    const userId = inputUserId ?? defaultUserId
    if (!userId) {
      throw new Error('userId is required (none provided and no defaultUserId configured)')
    }
    return userId
  }

  return {
    async recall_add(input: RecallAddInput): Promise<ToolResult> {
      try {
        const userId = resolveUserId(input.userId)
        const memories = await memory.extract(input.text, {
          userId,
          source: input.source,
          sourceId: input.sourceId,
        })
        return {
          success: true,
          data: {
            extractedCount: memories.length,
            memories: formatMemories(memories),
          },
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },

    async recall_query(input: RecallQueryInput): Promise<ToolResult> {
      try {
        const userId = resolveUserId(input.userId)
        const memories = await memory.query(input.query, {
          userId,
          limit: input.limit,
          threshold: input.threshold,
        })
        return {
          success: true,
          data: {
            count: memories.length,
            memories: formatMemories(memories),
          },
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },

    async recall_list(input: RecallListInput): Promise<ToolResult> {
      try {
        const userId = resolveUserId(input.userId)
        const [memories, total] = await Promise.all([
          memory.list(userId, {
            limit: input.limit,
            offset: input.offset,
          }),
          memory.count(userId),
        ])
        return {
          success: true,
          data: {
            memories: formatMemories(memories),
            total,
            limit: input.limit,
            offset: input.offset ?? 0,
          },
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },

    async recall_get(input: RecallGetInput): Promise<ToolResult> {
      try {
        const mem = await memory.get(input.id)
        if (!mem) {
          return {
            success: false,
            error: `Memory not found: ${input.id}`,
          }
        }
        return {
          success: true,
          data: formatMemory(mem),
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },

    async recall_update(input: RecallUpdateInput): Promise<ToolResult> {
      try {
        if (!input.content && !input.metadata) {
          return {
            success: false,
            error: 'At least one of content or metadata must be provided',
          }
        }
        const updated = await memory.update(input.id, {
          content: input.content,
          metadata: input.metadata,
        })
        return {
          success: true,
          data: formatMemory(updated),
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },

    async recall_delete(input: RecallDeleteInput): Promise<ToolResult> {
      try {
        await memory.delete(input.id)
        return {
          success: true,
          data: { deleted: input.id },
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },

    async recall_clear(input: RecallClearInput): Promise<ToolResult> {
      try {
        const userId = resolveUserId(input.userId)
        await memory.clear(userId)
        return {
          success: true,
          data: { clearedForUser: userId },
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },
  }
}
