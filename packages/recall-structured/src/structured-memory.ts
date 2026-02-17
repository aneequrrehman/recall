import type { z } from 'zod'
import type {
  ProcessOptions,
  ProcessResult,
  ProcessResultInsert,
  ProcessResultUpdate,
  ProcessResultDelete,
  ProcessResultNotMatched,
  ProcessResultQuery,
  QueryOptions,
  QueryResult,
  ListOptions,
  StructuredMemoryClient,
  StructuredMemoryConfig,
  SchemaMap,
  SchemaInfo,
  ColumnInfo,
  RecordWithBase,
  HandlerContext,
} from './types'
import { SchemaValidationError, QueryGenerationError, RecordNotFoundError } from './types'
import { createStore, extractColumnsFromZod } from './store'
import { createQueryGenerator } from './query-generator'
import { createIntentProcessor, type RecordMatchCriteria } from './classification'

/**
 * Compute schema info from Zod schemas for use in prompts
 */
function computeSchemaInfo(schemas: SchemaMap): SchemaInfo[] {
  return Object.entries(schemas).map(([name, def]) => {
    const columns: ColumnInfo[] = [
      { name: 'id', type: 'TEXT', nullable: false, description: 'UUID primary key' },
      { name: 'user_id', type: 'TEXT', nullable: false, description: 'User identifier' },
      ...extractColumnsFromZod(def.schema),
      { name: 'created_at', type: 'TEXT', nullable: false, description: 'Creation timestamp' },
      { name: 'updated_at', type: 'TEXT', nullable: false, description: 'Last update timestamp' },
    ]

    return {
      name,
      description: def.description,
      columns,
    }
  })
}

/**
 * Create a structured memory client
 */
export function createStructuredMemory<T extends SchemaMap>(
  config: StructuredMemoryConfig<T>
): StructuredMemoryClient<T> {
  const { db: dbPath, llm, schemas, handlers } = config

  // Initialize store and create tables from Zod schemas
  const store = createStore(dbPath)
  store.initialize(schemas)

  // Create LLM components
  const queryGenerator = createQueryGenerator(llm)
  const intentProcessor = createIntentProcessor({
    apiKey: llm.apiKey,
    model: llm.model,
  })

  // Pre-compute schema info for prompts
  const schemaInfoList = computeSchemaInfo(schemas)

  return {
    async process(input: string, options: ProcessOptions): Promise<ProcessResult> {
      const { userId, date } = options

      // Step 1: Detect intent and extract data
      const intentResult = await intentProcessor.process(input, schemaInfoList, { date })

      // If not matched or no intent, return early
      if (!intentResult.matched || intentResult.intent === 'none') {
        const result: ProcessResultNotMatched = {
          matched: false,
          reason: intentResult.reason,
        }
        return result
      }

      const schemaName = intentResult.schema as keyof T & string

      // Step 2: Handle QUERY intent
      if (intentResult.intent === 'query') {
        const question = intentResult.query ?? input

        // Use query generator to create SQL
        const queryResult = await queryGenerator.generate(question, schemaInfoList, userId)

        if (!queryResult.canAnswer) {
          const result: ProcessResultNotMatched = {
            matched: false,
            reason: queryResult.explanation,
          }
          return result
        }

        // Execute the query
        const rows = store.query(queryResult.sql)

        // Simplify single-value results
        let queryData: unknown = rows
        if (rows.length === 1) {
          const keys = Object.keys(rows[0])
          if (keys.length === 1) {
            queryData = rows[0][keys[0]]
          }
        }

        const result: ProcessResultQuery = {
          matched: true,
          schema: schemaName,
          action: 'query',
          question,
          sql: queryResult.sql,
          result: queryData,
          explanation: queryResult.explanation,
          confidence: intentResult.confidence,
        }

        return result
      }

      // Get schema definition
      const schemaDef = schemas[schemaName]
      if (!schemaDef) {
        const result: ProcessResultNotMatched = {
          matched: false,
          reason: `Schema "${intentResult.schema}" not found`,
        }
        return result
      }

      // Helper to find record by match criteria
      const findRecordByMatchCriteria = (
        criteria: RecordMatchCriteria
      ): Record<string, unknown> | null => {
        if (criteria.recency === 'most_recent') {
          return store.getMostRecent(schemaName, userId)
        }
        return store.findByField(schemaName, userId, criteria.field, criteria.value)
      }

      // Build handler context
      const buildHandlerContext = (): HandlerContext => ({
        userId,
        schema: schemaName,
        input,
        confidence: intentResult.confidence,
        reason: intentResult.reason,
      })

      // Step 3: Handle UPDATE intent
      if (intentResult.intent === 'update') {
        if (!intentResult.matchCriteria) {
          return {
            matched: false,
            reason: 'Update intent detected but no match criteria provided',
          }
        }

        // Find the record to update
        const existingRecord = findRecordByMatchCriteria(intentResult.matchCriteria)
        if (!existingRecord) {
          return {
            matched: false,
            reason: `No matching ${schemaName} record found to update`,
          }
        }

        const recordId = existingRecord.id as string

        // Get update data
        const updateData = intentResult.updateData
        if (!updateData || Object.keys(updateData).length === 0) {
          return {
            matched: false,
            reason: 'Update intent detected but no update data provided',
          }
        }

        // Validate partial data
        const partialSchema = schemaDef.schema.partial()
        const validationResult = partialSchema.safeParse(updateData)
        if (!validationResult.success) {
          return {
            matched: false,
            reason: `Validation failed: ${validationResult.error.issues.map(i => i.message).join(', ')}`,
          }
        }

        // Update in SQLite
        store.update(schemaName, recordId, validationResult.data)

        // Call handler if provided
        const schemaHandlers = handlers?.[schemaName]
        let handlerCalled = false
        if (schemaHandlers?.onUpdate) {
          handlerCalled = true
          await schemaHandlers.onUpdate(recordId, validationResult.data, buildHandlerContext())
        }

        const result: ProcessResultUpdate = {
          matched: true,
          schema: schemaName,
          action: 'update',
          id: recordId,
          data: validationResult.data,
          confidence: intentResult.confidence,
          handlerCalled,
        }
        return result
      }

      // Step 4: Handle DELETE intent
      if (intentResult.intent === 'delete') {
        if (!intentResult.matchCriteria) {
          return {
            matched: false,
            reason: 'Delete intent detected but no match criteria provided',
          }
        }

        // Find the record to delete
        const existingRecord = findRecordByMatchCriteria(intentResult.matchCriteria)
        if (!existingRecord) {
          return {
            matched: false,
            reason: `No matching ${schemaName} record found to delete`,
          }
        }

        const recordId = existingRecord.id as string

        // Delete from SQLite
        store.delete(schemaName, recordId)

        // Call handler if provided
        const schemaHandlers = handlers?.[schemaName]
        let handlerCalled = false
        if (schemaHandlers?.onDelete) {
          handlerCalled = true
          await schemaHandlers.onDelete(recordId, buildHandlerContext())
        }

        const result: ProcessResultDelete = {
          matched: true,
          schema: schemaName,
          action: 'delete',
          id: recordId,
          confidence: intentResult.confidence,
          handlerCalled,
        }
        return result
      }

      // Step 5: Handle INSERT intent
      if (!intentResult.data) {
        const result: ProcessResultNotMatched = {
          matched: false,
          reason: `Matched ${intentResult.schema} but no data could be extracted`,
        }
        return result
      }

      const validationResult = schemaDef.schema.safeParse(intentResult.data)

      if (!validationResult.success) {
        const result: ProcessResultNotMatched = {
          matched: false,
          reason: `Validation failed: ${validationResult.error.issues.map(i => i.message).join(', ')}`,
        }
        return result
      }

      const validatedData = validationResult.data

      // Store in SQLite
      const recordId = store.insert(schemaName, userId, validatedData)

      // Call handler if provided
      const schemaHandlers = handlers?.[schemaName]
      let handlerCalled = false

      if (schemaHandlers?.onInsert) {
        handlerCalled = true
        await schemaHandlers.onInsert(validatedData, buildHandlerContext())
      }

      const result: ProcessResultInsert = {
        matched: true,
        schema: schemaName,
        action: 'insert',
        data: validatedData,
        id: recordId,
        confidence: intentResult.confidence,
        handlerCalled,
      }

      return result
    },

    async query(question: string, options: QueryOptions): Promise<QueryResult> {
      const { userId } = options

      const result = await queryGenerator.generate(question, schemaInfoList, userId)

      if (!result.canAnswer) {
        throw new QueryGenerationError(question, result.explanation)
      }

      // Execute the generated SQL
      const rows = store.query(result.sql)

      // For aggregations, extract the single value if applicable
      let queryResult: unknown = rows
      if (rows.length === 1) {
        const keys = Object.keys(rows[0])
        if (keys.length === 1) {
          // Single value aggregation (e.g., SUM, COUNT, AVG)
          queryResult = rows[0][keys[0]]
        }
      }

      return {
        sql: result.sql,
        result: queryResult,
        explanation: result.explanation,
      }
    },

    async list<K extends keyof T & string>(
      schema: K,
      options: ListOptions
    ): Promise<RecordWithBase<z.infer<T[K]['schema']>>[]> {
      const { userId, limit, offset } = options
      const rows = store.list(schema, userId, limit, offset)
      return rows as RecordWithBase<z.infer<T[K]['schema']>>[]
    },

    async get<K extends keyof T & string>(
      schema: K,
      id: string
    ): Promise<RecordWithBase<z.infer<T[K]['schema']>> | null> {
      const row = store.get(schema, id)
      return row as RecordWithBase<z.infer<T[K]['schema']>> | null
    },

    async update<K extends keyof T & string>(
      schema: K,
      id: string,
      data: Partial<z.infer<T[K]['schema']>>
    ): Promise<RecordWithBase<z.infer<T[K]['schema']>>> {
      // Validate partial data
      const schemaDef = schemas[schema]
      const partialSchema = schemaDef.schema.partial()
      const validationResult = partialSchema.safeParse(data)

      if (!validationResult.success) {
        throw new SchemaValidationError(schema, data, validationResult.error)
      }

      // Check record exists
      const existing = store.get(schema, id)
      if (!existing) {
        throw new RecordNotFoundError(schema, id)
      }

      store.update(schema, id, validationResult.data)
      const updated = store.get(schema, id)

      return updated as RecordWithBase<z.infer<T[K]['schema']>>
    },

    async delete(schema: keyof T & string, id: string): Promise<void> {
      const existing = store.get(schema, id)
      if (!existing) {
        throw new RecordNotFoundError(schema, id)
      }
      store.delete(schema, id)
    },

    getSchemas(): SchemaInfo[] {
      return schemaInfoList
    },

    close(): void {
      store.close()
    },
  }
}
