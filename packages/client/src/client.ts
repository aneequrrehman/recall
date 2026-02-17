import type {
  RecallClientConfig,
  QueryOptions,
  QueryResponse,
  ExtractOptions,
  ExtractResponse,
  ListOptions,
  ListResponse,
  GetResponse,
  SuccessResponse,
  ErrorResponse,
} from './types'
import { RecallError } from './types'

const DEFAULT_BASE_URL = 'https://api.recall.youcraft.dev'
const DEFAULT_TIMEOUT = 30000

/**
 * Recall API client for interacting with hosted Recall or self-hosted instances.
 *
 * @example
 * ```typescript
 * import { RecallClient } from '@youcraft/recall-client'
 *
 * const recall = new RecallClient({
 *   apiKey: process.env.RECALL_API_KEY,
 * })
 *
 * // Query for relevant memories
 * const { memories } = await recall.query('What does the user like?')
 *
 * // Extract memories from a conversation
 * await recall.extract({
 *   messages: [
 *     { role: 'user', content: 'I love hiking in the mountains' },
 *     { role: 'assistant', content: 'That sounds wonderful!' },
 *   ],
 * })
 * ```
 */
export class RecallClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly timeout: number

  constructor(config: RecallClientConfig = {}) {
    const apiKey = config.apiKey ?? process.env.RECALL_API_KEY
    if (!apiKey) {
      throw new Error(
        'Recall API key is required. Pass it via config.apiKey or set RECALL_API_KEY environment variable.'
      )
    }
    this.apiKey = apiKey
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT
  }

  /**
   * Make an authenticated request to the Recall API
   */
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      const data = await response.json()

      if (!response.ok) {
        const errorData = data as ErrorResponse
        throw new RecallError(
          errorData.error || 'Request failed',
          response.status,
          errorData.details
        )
      }

      return data as T
    } catch (error) {
      if (error instanceof RecallError) {
        throw error
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new RecallError('Request timeout', 408)
      }
      throw new RecallError(error instanceof Error ? error.message : 'Unknown error', 0)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Query memories using semantic search.
   * Returns memories that are semantically similar to the query string.
   *
   * @param query - The search query string
   * @param options - Query options (limit, threshold)
   * @returns Matching memories and count
   *
   * @example
   * ```typescript
   * const { memories } = await recall.query('hiking preferences', {
   *   limit: 5,
   *   threshold: 0.7,
   * })
   * ```
   */
  async query(query: string, options: QueryOptions = {}): Promise<QueryResponse> {
    return this.request<QueryResponse>('POST', '/api/v1/memories/query', {
      query,
      ...options,
    })
  }

  /**
   * Extract memories from text or conversation messages.
   * Uses AI to identify and store relevant information as memories.
   *
   * @param options - Either messages array or text string
   * @returns Extracted memories
   *
   * @example
   * ```typescript
   * // Extract from messages
   * await recall.extract({
   *   messages: [
   *     { role: 'user', content: 'My favorite color is blue' },
   *   ],
   * })
   *
   * // Extract from text
   * await recall.extract({
   *   text: 'User mentioned they live in San Francisco and work as an engineer.',
   * })
   * ```
   */
  async extract(options: ExtractOptions): Promise<ExtractResponse> {
    if (!options.messages && !options.text) {
      throw new RecallError("Either 'messages' array or 'text' string is required", 400)
    }
    return this.request<ExtractResponse>('POST', '/api/v1/extract', options)
  }

  /**
   * List all memories with pagination.
   *
   * @param options - Pagination options (limit, offset)
   * @returns Paginated list of memories
   *
   * @example
   * ```typescript
   * // Get first page
   * const { memories, hasMore, total } = await recall.list({ limit: 20 })
   *
   * // Get next page
   * const page2 = await recall.list({ limit: 20, offset: 20 })
   * ```
   */
  async list(options: ListOptions = {}): Promise<ListResponse> {
    const params = new URLSearchParams()
    if (options.limit !== undefined) {
      params.set('limit', String(options.limit))
    }
    if (options.offset !== undefined) {
      params.set('offset', String(options.offset))
    }
    const queryString = params.toString()
    const path = queryString ? `/api/v1/memories?${queryString}` : '/api/v1/memories'
    return this.request<ListResponse>('GET', path)
  }

  /**
   * Get a specific memory by ID.
   *
   * @param id - The memory ID
   * @returns The memory object
   *
   * @example
   * ```typescript
   * const { memory } = await recall.get('mem_123')
   * console.log(memory.content)
   * ```
   */
  async get(id: string): Promise<GetResponse> {
    return this.request<GetResponse>('GET', `/api/v1/memories/${encodeURIComponent(id)}`)
  }

  /**
   * Delete a specific memory by ID.
   *
   * @param id - The memory ID to delete
   * @returns Success response
   *
   * @example
   * ```typescript
   * await recall.delete('mem_123')
   * ```
   */
  async delete(id: string): Promise<SuccessResponse> {
    return this.request<SuccessResponse>('DELETE', `/api/v1/memories/${encodeURIComponent(id)}`)
  }

  /**
   * Clear all memories.
   * WARNING: This permanently deletes all stored memories.
   *
   * @returns Success response
   *
   * @example
   * ```typescript
   * await recall.clear()
   * ```
   */
  async clear(): Promise<SuccessResponse> {
    return this.request<SuccessResponse>('DELETE', '/api/v1/memories')
  }
}
