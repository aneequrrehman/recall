export interface Memory {
  id: string
  userId: string
  content: string
  embedding: number[]
  metadata: MemoryMetadata
  createdAt: Date
  updatedAt: Date
}

export interface MemoryMetadata {
  source?: string
  sourceId?: string
  [key: string]: unknown
}

export interface ExtractedMemory {
  content: string
  metadata?: Partial<MemoryMetadata>
}

export interface ConsolidationDecision {
  action: 'ADD' | 'UPDATE' | 'DELETE' | 'NONE'
  /** Memory ID (required for UPDATE/DELETE) */
  id?: string
  /** New or updated content (required for ADD/UPDATE) */
  content?: string
}

export interface ConsolidationMemory {
  id: string
  content: string
}

export interface DatabaseAdapter {
  insert(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<Memory>
  update(
    id: string,
    data: Partial<Pick<Memory, 'content' | 'embedding' | 'metadata'>>
  ): Promise<Memory>
  delete(id: string): Promise<void>
  get(id: string): Promise<Memory | null>
  list(userId: string, options?: ListOptions): Promise<Memory[]>
  count(userId: string): Promise<number>
  clear(userId: string): Promise<void>
  queryByEmbedding(embedding: number[], userId: string, limit: number): Promise<Memory[]>
}

export interface EmbeddingsProvider {
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
  dimensions: number
}

export interface ExtractorProvider {
  extract(text: string): Promise<ExtractedMemory[]>
  /**
   * Consolidate a new fact against existing similar memories.
   * Optional - if not implemented, extract() will always ADD.
   */
  consolidate?(
    newFact: string,
    existingMemories: ConsolidationMemory[]
  ): Promise<ConsolidationDecision>
}

export interface MemoryConfig {
  db: DatabaseAdapter
  embeddings: EmbeddingsProvider
  extractor: ExtractorProvider
}

export interface QueryOptions {
  userId: string
  limit?: number
  threshold?: number
}

export interface ExtractOptions {
  userId: string
  source?: string
  sourceId?: string
}

export interface ListOptions {
  limit?: number
  offset?: number
}
