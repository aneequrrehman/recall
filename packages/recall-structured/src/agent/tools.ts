/**
 * Structured Memory Tools for AI SDK v6
 *
 * These tools allow an agent to perform CRUD operations on structured memory.
 */

import { tool, type Tool } from 'ai'
import { z } from 'zod'
import type { StructuredStore, SchemaInfo, SchemaMap } from '../types'

/**
 * Tool definitions for structured memory operations
 */
export type StructuredMemoryTools = Record<string, Tool<any, any>>

export interface CreateToolsConfig {
  store: StructuredStore
  schemas: SchemaMap
  schemaInfo: SchemaInfo[]
  userId: string
}

/**
 * Create structured memory tools for an agent.
 *
 * These tools give the agent full CRUD capabilities over the user's data.
 */
export function createStructuredMemoryTools(config: CreateToolsConfig): StructuredMemoryTools {
  const { store, schemas, schemaInfo, userId } = config

  // Get available schema names for validation
  const schemaNames = Object.keys(schemas)

  // Create dynamic schema enum
  const schemaEnum =
    schemaNames.length > 0 ? z.enum(schemaNames as [string, ...string[]]) : z.string()

  return {
    /**
     * List all available schemas and their descriptions
     */
    listSchemas: tool({
      description:
        'List all available data schemas the user can track. Call this first to understand what data types are available.',
      inputSchema: z.object({}),
      execute: async () => {
        return schemaInfo.map(s => ({
          name: s.name,
          description: s.description,
          fields: s.columns
            .filter(c => !['id', 'user_id', 'created_at', 'updated_at'].includes(c.name))
            .map(c => ({
              name: c.name,
              type: c.type,
              required: !c.nullable,
              description: c.description,
            })),
        }))
      },
    }),

    /**
     * List records in a schema
     */
    listRecords: tool({
      description:
        'List records in a schema for the current user. Use this to see existing data before updating or deleting.',
      inputSchema: z.object({
        schema: schemaEnum.describe('The schema to list records from'),
        limit: z.number().optional().default(10).describe('Maximum number of records to return'),
      }),
      execute: async ({ schema, limit }) => {
        const records = store.list(schema, userId, limit)
        return {
          schema,
          count: records.length,
          records: records.map(r => {
            const { user_id, ...rest } = r as Record<string, unknown>
            return rest
          }),
        }
      },
    }),

    /**
     * Get a single record by ID
     */
    getRecord: tool({
      description: 'Get a specific record by its ID.',
      inputSchema: z.object({
        schema: schemaEnum.describe('The schema the record belongs to'),
        id: z.string().describe('The record ID'),
      }),
      execute: async ({ schema, id }) => {
        const record = store.get(schema, id)
        if (!record) {
          return { error: `Record ${id} not found in ${schema}` }
        }
        const { user_id, ...rest } = record as Record<string, unknown>
        return rest
      },
    }),

    /**
     * Search records by a field value
     */
    searchRecords: tool({
      description:
        'Search for records matching a field value. Use this to find specific records before updating or deleting.',
      inputSchema: z.object({
        schema: schemaEnum.describe('The schema to search in'),
        field: z.string().describe('The field to search by (e.g., "recipient", "type", "name")'),
        value: z.string().describe('The value to search for (case-insensitive partial match)'),
      }),
      execute: async ({ schema, field, value }) => {
        const allRecords = store.list(schema, userId, 100)
        const matches = allRecords.filter(r => {
          const record = r as Record<string, unknown>
          const fieldValue = record[field]
          if (typeof fieldValue === 'string') {
            return fieldValue.toLowerCase().includes(value.toLowerCase())
          }
          return String(fieldValue) === value
        })

        return {
          schema,
          field,
          searchValue: value,
          count: matches.length,
          records: matches.map(r => {
            const { user_id, ...rest } = r as Record<string, unknown>
            return rest
          }),
        }
      },
    }),

    /**
     * Insert a new record
     */
    insertRecord: tool({
      description:
        'Insert a new record into a schema. Use this when the user reports new data (payments, workouts, medications, etc.).',
      inputSchema: z.object({
        schema: schemaEnum.describe('The schema to insert into'),
        data: z
          .record(z.unknown())
          .describe('The data to insert (field values matching the schema)'),
      }),
      execute: async ({ schema, data }) => {
        const schemaDef = schemas[schema]
        if (!schemaDef) {
          return { error: `Schema ${schema} not found` }
        }

        const validation = schemaDef.schema.safeParse(data)
        if (!validation.success) {
          return {
            error: 'Validation failed',
            issues: validation.error.issues.map(i => ({
              field: i.path.join('.'),
              message: i.message,
            })),
          }
        }

        const id = store.insert(schema, userId, validation.data)
        return {
          success: true,
          action: 'inserted',
          schema,
          id,
          data: validation.data,
        }
      },
    }),

    /**
     * Update an existing record
     */
    updateRecord: tool({
      description:
        'Update an existing record by ID. Use listRecords or searchRecords first to find the correct record ID.',
      inputSchema: z.object({
        schema: schemaEnum.describe('The schema the record belongs to'),
        id: z.string().describe('The record ID to update'),
        data: z.record(z.unknown()).describe('The fields to update (partial update)'),
      }),
      execute: async ({ schema, id, data }) => {
        const existing = store.get(schema, id)
        if (!existing) {
          return { error: `Record ${id} not found in ${schema}` }
        }

        const schemaDef = schemas[schema]
        if (!schemaDef) {
          return { error: `Schema ${schema} not found` }
        }

        const partialSchema = schemaDef.schema.partial()
        const validation = partialSchema.safeParse(data)
        if (!validation.success) {
          return {
            error: 'Validation failed',
            issues: validation.error.issues.map(i => ({
              field: i.path.join('.'),
              message: i.message,
            })),
          }
        }

        store.update(schema, id, validation.data)

        const updated = store.get(schema, id)
        const { user_id, ...rest } = updated as Record<string, unknown>

        return {
          success: true,
          action: 'updated',
          schema,
          id,
          updatedFields: Object.keys(validation.data),
          record: rest,
        }
      },
    }),

    /**
     * Delete a record
     */
    deleteRecord: tool({
      description:
        'Delete a record by ID. Use listRecords or searchRecords first to find the correct record ID.',
      inputSchema: z.object({
        schema: schemaEnum.describe('The schema the record belongs to'),
        id: z.string().describe('The record ID to delete'),
      }),
      execute: async ({ schema, id }) => {
        const existing = store.get(schema, id)
        if (!existing) {
          return { error: `Record ${id} not found in ${schema}` }
        }

        const { user_id, ...recordData } = existing as Record<string, unknown>

        store.delete(schema, id)

        return {
          success: true,
          action: 'deleted',
          schema,
          id,
          deletedRecord: recordData,
        }
      },
    }),
  }
}
