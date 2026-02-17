/**
 * Configuration options for the Recall client
 */
export interface RecallClientConfig {
  /**
   * Your Recall API key (starts with rk_)
   * Can also be set via RECALL_API_KEY environment variable
   */
  apiKey?: string

  /**
   * Base URL of the Recall API
   * Defaults to 'https://api.recall.youcraft.dev'
   * For self-hosted instances, set to your instance URL
   */
  baseUrl?: string

  /**
   * Request timeout in milliseconds
   * Defaults to 30000 (30 seconds)
   */
  timeout?: number
}

/**
 * Memory metadata object
 */
export interface MemoryMetadata {
  source?: string
  sourceId?: string
  [key: string]: unknown
}

/**
 * A memory record returned from the API
 */
export interface Memory {
  id: string
  content: string
  metadata: MemoryMetadata
  createdAt: string
  updatedAt?: string
}

/**
 * Options for querying memories
 */
export interface QueryOptions {
  /**
   * Maximum number of memories to return (1-50)
   * Defaults to 10
   */
  limit?: number

  /**
   * Minimum similarity threshold (0-1)
   * Higher values return more relevant results
   */
  threshold?: number
}

/**
 * Response from the query endpoint
 */
export interface QueryResponse {
  memories: Memory[]
  count: number
}

/**
 * A message in a conversation
 */
export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * Options for extracting memories
 */
export interface ExtractOptions {
  /**
   * Conversation messages to extract memories from
   */
  messages?: Message[]

  /**
   * Plain text to extract memories from
   */
  text?: string
}

/**
 * Response from the extract endpoint
 */
export interface ExtractResponse {
  success: boolean
  memories: Memory[]
  count: number
}

/**
 * Options for listing memories
 */
export interface ListOptions {
  /**
   * Maximum number of memories to return (1-100)
   * Defaults to 50
   */
  limit?: number

  /**
   * Number of memories to skip (for pagination)
   * Defaults to 0
   */
  offset?: number
}

/**
 * Response from the list endpoint
 */
export interface ListResponse {
  memories: Memory[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

/**
 * Response from the get endpoint
 */
export interface GetResponse {
  memory: Memory
}

/**
 * Response from delete/clear operations
 */
export interface SuccessResponse {
  success: boolean
  message: string
}

/**
 * Error response from the API
 */
export interface ErrorResponse {
  error: string
  details?: unknown
}

/**
 * Recall client error class
 */
export class RecallError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'RecallError'
  }
}
