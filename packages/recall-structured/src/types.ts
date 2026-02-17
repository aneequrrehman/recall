import type { z } from 'zod'

// ============================================
// CONFIG TYPES
// ============================================

/**
 * Supported LLM providers
 */
export type LLMProvider = 'openai' | 'anthropic'

/**
 * LLM configuration
 */
export interface LLMConfig {
  provider: LLMProvider
  apiKey: string
  /** Default: 'gpt-5-nano' for OpenAI */
  model?: string
}

/**
 * Schema definition with Zod validation
 */
export interface SchemaDefinition<
  T extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> {
  /** Human-readable description for LLM context */
  description: string
  /** Zod schema defining the structure */
  schema: T
}

/**
 * Map of schema names to their definitions
 */
export type SchemaMap = Record<string, SchemaDefinition>

/**
 * Main configuration for createStructuredMemory
 */
export interface StructuredMemoryConfig<T extends SchemaMap = SchemaMap> {
  /** SQLite database file path (e.g., './data.db' or ':memory:') */
  db: string
  /** LLM configuration */
  llm: LLMConfig
  /** Predefined schemas */
  schemas: T
  /** Optional handlers for CRUD operations (Iteration 2) */
  handlers?: HandlersMap<T>
}

// ============================================
// CRUD OPERATION TYPES
// ============================================

export type CRUDAction = 'insert' | 'update' | 'delete'

// ============================================
// HANDLER TYPES (Iteration 2)
// ============================================

/**
 * Context passed to handlers
 */
export interface HandlerContext {
  /** User ID for the operation */
  userId: string
  /** Schema name being processed */
  schema: string
  /** Raw input text that was processed */
  input: string
  /** Confidence score from extraction (0-1) */
  confidence: number
  /** Reason for the classification */
  reason: string
}

/**
 * Handler for insert operations
 * Called after data is stored in SQLite - use for side effects like syncing to external DB
 */
export type InsertHandler<T = Record<string, unknown>> = (
  data: T,
  context: HandlerContext
) => Promise<void>

/**
 * Handler for update operations (future iteration)
 * Called when existing data should be updated
 */
export type UpdateHandler<T = Record<string, unknown>> = (
  id: string,
  data: Partial<T>,
  context: HandlerContext
) => Promise<void>

/**
 * Handler for delete operations (future iteration)
 * Called when data should be deleted
 */
export type DeleteHandler = (id: string, context: HandlerContext) => Promise<void>

/**
 * Handlers configuration for a schema
 */
export interface SchemaHandlers<T = Record<string, unknown>> {
  /** Called when new data is extracted */
  onInsert?: InsertHandler<T>
  /** Called when data should be updated (future) */
  onUpdate?: UpdateHandler<T>
  /** Called when data should be deleted (future) */
  onDelete?: DeleteHandler
}

/**
 * Map of schema names to their handlers
 */
export type HandlersMap<T extends SchemaMap = SchemaMap> = {
  [K in keyof T]?: SchemaHandlers<z.infer<T[K]['schema']>>
}

// ============================================
// PROCESS RESULT TYPES
// ============================================

/**
 * Result when input does not match any schema
 */
export interface ProcessResultNotMatched {
  matched: false
  reason: string
}

/**
 * Result when input matches a schema and triggers an insert
 */
export interface ProcessResultInsert<T = Record<string, unknown>> {
  matched: true
  schema: string
  action: 'insert'
  data: T
  /** Record ID from SQLite storage */
  id: string
  /** Confidence score from extraction (0-1) */
  confidence: number
  /** Whether a custom handler was also called */
  handlerCalled: boolean
}

/**
 * Result when input matches a schema and triggers an update
 */
export interface ProcessResultUpdate<T = Record<string, unknown>> {
  matched: true
  schema: string
  action: 'update'
  /** ID of the updated record */
  id: string
  /** The updated fields */
  data: Partial<T>
  /** Confidence score from intent detection (0-1) */
  confidence: number
  /** Whether a custom handler was called */
  handlerCalled: boolean
}

/**
 * Result when input matches a schema and triggers a delete
 */
export interface ProcessResultDelete {
  matched: true
  schema: string
  action: 'delete'
  /** ID of the deleted record */
  id: string
  /** Confidence score from intent detection (0-1) */
  confidence: number
  /** Whether a custom handler was called */
  handlerCalled: boolean
}

/**
 * Result when input is a query about stored data (Iteration 3)
 */
export interface ProcessResultQuery {
  matched: true
  schema: string
  action: 'query'
  /** The natural language question */
  question: string
  /** Generated SQL query */
  sql: string
  /** Query result */
  result: unknown
  /** Explanation of the query */
  explanation: string
  /** Confidence score from intent detection (0-1) */
  confidence: number
}

export type ProcessResult<T = Record<string, unknown>> =
  | ProcessResultNotMatched
  | ProcessResultInsert<T>
  | ProcessResultUpdate<T>
  | ProcessResultDelete
  | ProcessResultQuery

// ============================================
// QUERY RESULT TYPES
// ============================================

export interface QueryResult<T = unknown> {
  sql: string
  result: T
  explanation: string
}

// ============================================
// OPTIONS TYPES
// ============================================

export interface ProcessOptions {
  userId: string
  /** Override date extraction, default: today */
  date?: string
}

export interface QueryOptions {
  userId: string
}

export interface ListOptions {
  userId: string
  limit?: number
  offset?: number
}

// ============================================
// RECORD TYPES (with system fields)
// ============================================

export interface BaseRecord {
  id: string
  user_id: string
  created_at: string
  updated_at: string
}

export type RecordWithBase<T> = T & BaseRecord

// ============================================
// SCHEMA INFO TYPES
// ============================================

export interface SchemaInfo {
  name: string
  description: string
  columns: ColumnInfo[]
}

export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  description?: string
}

// ============================================
// QUERY GENERATOR TYPES
// ============================================

export interface QueryGeneratorResult {
  canAnswer: boolean
  sql: string
  explanation: string
}

export interface QueryGenerator {
  generate(question: string, schemas: SchemaInfo[], userId: string): Promise<QueryGeneratorResult>
}

// ============================================
// STORE TYPES
// ============================================

export interface StructuredStore {
  /** Initialize tables from schemas */
  initialize(schemas: SchemaMap): void

  /** Close database connection */
  close(): void

  /** Insert a new record */
  insert(table: string, userId: string, data: Record<string, unknown>): string

  /** Update an existing record */
  update(table: string, id: string, data: Record<string, unknown>): void

  /** Delete a record */
  delete(table: string, id: string): void

  /** Get a single record by ID */
  get(table: string, id: string): Record<string, unknown> | null

  /** List records for a user */
  list(table: string, userId: string, limit?: number, offset?: number): Record<string, unknown>[]

  /** Execute a SELECT query */
  query(sql: string): Record<string, unknown>[]

  /** Find a record by field value */
  findByField(
    table: string,
    userId: string,
    field: string,
    value: unknown
  ): Record<string, unknown> | null

  /** Get the most recent record for a user in a table */
  getMostRecent(table: string, userId: string): Record<string, unknown> | null
}

// ============================================
// ERROR TYPES
// ============================================

export class SchemaValidationError extends Error {
  public readonly data: unknown
  public readonly issues: Array<{ path: string; message: string }>

  constructor(
    public readonly schemaName: string,
    data: unknown,
    zodError: { issues: Array<{ path: (string | number)[]; message: string }> }
  ) {
    const issueMessages = zodError.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
    super(`Validation failed for schema "${schemaName}": ${issueMessages}`)
    this.name = 'SchemaValidationError'
    this.data = data
    this.issues = zodError.issues.map(i => ({
      path: i.path.join('.'),
      message: i.message,
    }))
  }
}

export class QueryGenerationError extends Error {
  constructor(
    public readonly question: string,
    public readonly reason: string
  ) {
    super(`Failed to generate query for "${question}": ${reason}`)
    this.name = 'QueryGenerationError'
  }
}

export class RecordNotFoundError extends Error {
  constructor(
    public readonly schemaName: string,
    public readonly recordId: string
  ) {
    super(`Record "${recordId}" not found in schema "${schemaName}"`)
    this.name = 'RecordNotFoundError'
  }
}

// ============================================
// CLIENT INTERFACE
// ============================================

/**
 * Structured memory client interface
 */
export interface StructuredMemoryClient<T extends SchemaMap = SchemaMap> {
  /**
   * Process natural language input - classify against schemas and execute CRUD
   */
  process(input: string, options: ProcessOptions): Promise<ProcessResult>

  /**
   * Query data using natural language
   */
  query(question: string, options: QueryOptions): Promise<QueryResult>

  /**
   * List records for a schema
   */
  list<K extends keyof T & string>(
    schema: K,
    options: ListOptions
  ): Promise<RecordWithBase<z.infer<T[K]['schema']>>[]>

  /**
   * Get a single record by ID
   */
  get<K extends keyof T & string>(
    schema: K,
    id: string
  ): Promise<RecordWithBase<z.infer<T[K]['schema']>> | null>

  /**
   * Update a record
   */
  update<K extends keyof T & string>(
    schema: K,
    id: string,
    data: Partial<z.infer<T[K]['schema']>>
  ): Promise<RecordWithBase<z.infer<T[K]['schema']>>>

  /**
   * Delete a record
   */
  delete(schema: keyof T & string, id: string): Promise<void>

  /**
   * Get all defined schemas with their info
   */
  getSchemas(): SchemaInfo[]

  /**
   * Close the database connection
   */
  close(): void
}
