import type { MemoryClient } from '@youcraft/recall'

/**
 * MCP Tool Schema (SDK-agnostic)
 */
export interface MCPToolSchema {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

/**
 * Configuration for creating recall handlers
 */
export interface RecallHandlersConfig {
  /** The Recall memory client instance */
  memory: MemoryClient
  /** Default user ID when not provided in tool input */
  defaultUserId?: string
}

/**
 * Standard result format for all tool handlers
 */
export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

// Tool input types

export interface RecallAddInput {
  text: string
  userId?: string
  source?: string
  sourceId?: string
}

export interface RecallQueryInput {
  query: string
  userId?: string
  limit?: number
  threshold?: number
}

export interface RecallListInput {
  userId?: string
  limit?: number
  offset?: number
}

export interface RecallGetInput {
  id: string
}

export interface RecallUpdateInput {
  id: string
  content?: string
  metadata?: Record<string, unknown>
}

export interface RecallDeleteInput {
  id: string
}

export interface RecallClearInput {
  userId?: string
}

/**
 * Handler function type
 */
export type ToolHandler<T = unknown> = (input: T) => Promise<ToolResult>

/**
 * All recall handlers map
 */
export interface RecallHandlers {
  recall_add: ToolHandler<RecallAddInput>
  recall_query: ToolHandler<RecallQueryInput>
  recall_list: ToolHandler<RecallListInput>
  recall_get: ToolHandler<RecallGetInput>
  recall_update: ToolHandler<RecallUpdateInput>
  recall_delete: ToolHandler<RecallDeleteInput>
  recall_clear: ToolHandler<RecallClearInput>
}
