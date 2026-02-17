export interface RecallMCPServerConfig {
  /** SQLite database path. Use ":memory:" for in-memory. Default: "recall.db" */
  db?: string
  /** OpenAI API key for embeddings and extraction */
  openaiKey: string
  /** OpenAI model for extraction (default: "gpt-5-nano") */
  model?: string
  /** OpenAI embedding model (default: "text-embedding-3-small") */
  embeddingModel?: string
  /** Default user ID for operations */
  userId?: string
  /** Enable verbose logging */
  verbose?: boolean
}

export interface CLIOptions {
  db?: string
  openaiKey?: string
  model?: string
  embedding?: string
  userId?: string
  verbose?: boolean
}

export function resolveConfig(options: CLIOptions): RecallMCPServerConfig {
  const openaiKey = options.openaiKey ?? process.env.OPENAI_API_KEY

  if (!openaiKey) {
    throw new Error(
      'OpenAI API key is required. Provide via --openai-key or OPENAI_API_KEY environment variable.'
    )
  }

  return {
    db: options.db ?? process.env.RECALL_DB ?? 'recall.db',
    openaiKey,
    model: options.model ?? process.env.RECALL_MODEL ?? 'gpt-5-nano',
    embeddingModel:
      options.embedding ?? process.env.RECALL_EMBEDDING_MODEL ?? 'text-embedding-3-small',
    userId: options.userId ?? process.env.RECALL_USER_ID,
    verbose: options.verbose ?? process.env.RECALL_VERBOSE === 'true',
  }
}
