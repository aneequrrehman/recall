import { createMemory, type MemoryClient } from '@youcraft/recall'
import { sqliteAdapter } from '@youcraft/recall-adapter-sqlite'
import { openaiExtractor } from '@youcraft/recall-extractor-openai'
import { openaiEmbeddings } from '@youcraft/recall-embeddings-openai'
import {
  createStructuredMemory,
  createExtractor,
  createStructuredMemoryAgent,
  type StructuredMemoryClient,
  type SchemaInfo,
  type Extractor,
  type ExtractionResult,
  type HandlerContext,
} from '@youcraft/recall-structured'
import { z } from 'zod'

// Lazy initialization to avoid errors during build
let _memory: MemoryClient | null = null
let _structuredMemory: StructuredMemoryClient<typeof structuredSchemas> | null = null
let _extractor: Extractor | null = null
let _structuredAgent: ReturnType<
  typeof createStructuredMemoryAgent<typeof structuredSchemas>
> | null = null

function getApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required')
  }
  return apiKey
}

/**
 * Predefined schemas for structured data.
 * These define what types of data can be tracked.
 */
export const structuredSchemas = {
  payments: {
    description:
      'Financial transactions and payments made by the user to other people or businesses',
    schema: z.object({
      recipient: z.string().describe('Who was paid (person or business name)'),
      amount: z.number().describe('Amount paid in dollars'),
      description: z.string().optional().describe('What the payment was for'),
      date: z.string().optional().describe('When the payment was made'),
    }),
  },

  workouts: {
    description: 'Exercise sessions and physical fitness activities completed by the user',
    schema: z.object({
      type: z.string().describe('Type of exercise (running, weights, swimming, MMA, yoga, etc)'),
      duration: z.number().optional().describe('Duration in minutes'),
      distance: z.number().optional().describe('Distance in kilometers (for cardio)'),
      calories: z.number().optional().describe('Calories burned'),
      date: z.string().optional().describe('When the workout occurred'),
    }),
  },

  medications: {
    description:
      'Medications, supplements, and drugs the user is currently taking or has stopped taking',
    schema: z.object({
      name: z.string().describe('Name of medication or supplement'),
      dosage: z.string().optional().describe('Dosage amount (e.g., "500mg", "2 tablets")'),
      frequency: z
        .string()
        .optional()
        .describe('How often taken (e.g., "twice daily", "as needed")'),
      active: z.boolean().optional().describe('Whether currently taking (true) or stopped (false)'),
    }),
  },
} as const

// Traditional memory instance for facts/preferences (vector-based)
export function getMemory(): MemoryClient {
  if (!_memory) {
    _memory = createMemory({
      db: sqliteAdapter({ filename: 'recall.db' }),
      extractor: openaiExtractor({
        apiKey: getApiKey(),
      }),
      embeddings: openaiEmbeddings({
        apiKey: getApiKey(),
      }),
    })
  }
  return _memory
}

// Structured memory instance for trackable data (SQL-based)
export function getStructuredMemory(): StructuredMemoryClient<typeof structuredSchemas> {
  if (!_structuredMemory) {
    _structuredMemory = createStructuredMemory({
      db: 'recall_structured.db',
      llm: {
        provider: 'openai',
        apiKey: getApiKey(),
      },
      schemas: structuredSchemas,
      // Optional: Custom handlers for each schema
      // Handlers are called AFTER data operations in SQLite
      // Use them for side effects like syncing to external databases
      handlers: {
        payments: {
          onInsert: async (data, ctx: HandlerContext) => {
            console.log(`[Handler] Payment INSERT for ${ctx.userId}:`, data)
          },
          onUpdate: async (id, data, ctx: HandlerContext) => {
            console.log(`[Handler] Payment UPDATE ${id} for ${ctx.userId}:`, data)
          },
          onDelete: async (id, ctx: HandlerContext) => {
            console.log(`[Handler] Payment DELETE ${id} for ${ctx.userId}`)
          },
        },
        workouts: {
          onInsert: async (data, ctx: HandlerContext) => {
            console.log(`[Handler] Workout INSERT for ${ctx.userId}:`, data)
          },
          onUpdate: async (id, data, ctx: HandlerContext) => {
            console.log(`[Handler] Workout UPDATE ${id} for ${ctx.userId}:`, data)
          },
          onDelete: async (id, ctx: HandlerContext) => {
            console.log(`[Handler] Workout DELETE ${id} for ${ctx.userId}`)
          },
        },
        medications: {
          onInsert: async (data, ctx: HandlerContext) => {
            console.log(`[Handler] Medication INSERT for ${ctx.userId}:`, data)
          },
          onUpdate: async (id, data, ctx: HandlerContext) => {
            console.log(`[Handler] Medication UPDATE ${id} for ${ctx.userId}:`, data)
          },
          onDelete: async (id, ctx: HandlerContext) => {
            console.log(`[Handler] Medication DELETE ${id} for ${ctx.userId}`)
          },
        },
      },
    })
  }
  return _structuredMemory
}

// Extractor for Iteration 1 (classification + extraction)
export function getExtractor(): Extractor {
  if (!_extractor) {
    _extractor = createExtractor({
      apiKey: getApiKey(),
      model: 'gpt-5-nano',
    })
  }
  return _extractor
}

// Structured Memory Agent (AI SDK v6) for multi-hop operations
export function getStructuredAgent() {
  if (!_structuredAgent) {
    _structuredAgent = createStructuredMemoryAgent({
      db: 'recall_structured.db',
      schemas: structuredSchemas,
    })
  }
  return _structuredAgent
}

// Legacy exports for compatibility
export const memory = {
  get query() {
    return getMemory().query.bind(getMemory())
  },
  get list() {
    return getMemory().list.bind(getMemory())
  },
  get extract() {
    return getMemory().extract.bind(getMemory())
  },
}

/**
 * Classify and extract data from input.
 * Returns extraction result (matched, schema, confidence, reason, data).
 *
 * Iteration 1: Now includes extracted field values.
 */
export async function extractFromInput(input: string): Promise<ExtractionResult> {
  const extractor = getExtractor()
  const schemas = getStructuredMemory().getSchemas()
  return extractor.classifyAndExtract(input, schemas)
}

/**
 * Query relevant memories for a user based on the current message
 * This runs in real-time before sending to the AI
 */
export async function queryMemories(userId: string, query: string, limit = 5): Promise<string[]> {
  if (!query.trim()) return []

  const memories = await memory.query(query, { userId, limit })
  return memories.map(m => m.content)
}

/**
 * Table info with data for display
 */
export interface TableWithData {
  name: string
  description: string
  columns: Array<{ name: string; type: string; nullable: boolean }>
  data: Record<string, unknown>[]
  rowCount: number
}

/**
 * Get all structured tables with their data.
 * Uses the predefined schemas and queries the store directly.
 */
export async function getStructuredTables(): Promise<TableWithData[]> {
  const structured = getStructuredMemory()
  const schemas = structured.getSchemas()

  const tablesWithData: TableWithData[] = []

  for (const schema of schemas) {
    try {
      // List records for this schema (using demo user for now)
      const records = await structured.list(schema.name as keyof typeof structuredSchemas, {
        userId: 'demo-user',
        limit: 10,
      })

      tablesWithData.push({
        name: schema.name,
        description: schema.description,
        columns: schema.columns
          .filter(c => !['id', 'user_id', 'created_at', 'updated_at'].includes(c.name))
          .map(c => ({
            name: c.name,
            type: c.type,
            nullable: c.nullable,
          })),
        data: records as unknown as Record<string, unknown>[],
        rowCount: records.length,
      })
    } catch (error) {
      // Table might not have any data yet
      tablesWithData.push({
        name: schema.name,
        description: schema.description,
        columns: schema.columns
          .filter(c => !['id', 'user_id', 'created_at', 'updated_at'].includes(c.name))
          .map(c => ({
            name: c.name,
            type: c.type,
            nullable: c.nullable,
          })),
        data: [],
        rowCount: 0,
      })
    }
  }

  return tablesWithData
}

/**
 * Format memories and structured data as context for the AI system prompt
 */
export function formatMemoriesAsContext(memories: string[], tables: TableWithData[]): string {
  const parts: string[] = []

  if (memories.length > 0) {
    parts.push(`## Relevant memories about this user:
${memories.map(m => `- ${m}`).join('\n')}`)
  }

  if (tables.length > 0) {
    const tablesWithData = tables.filter(t => t.rowCount > 0)
    if (tablesWithData.length > 0) {
      const tableDescriptions = tablesWithData.map(table => {
        const recentData = table.data.slice(0, 3).map(row => {
          const { id, user_id, created_at, updated_at, ...rest } = row as Record<string, unknown>
          return JSON.stringify(rest)
        })
        return `- ${table.name} (${table.rowCount} records): ${recentData.join(', ')}`
      })

      parts.push(`## User's tracked data:
${tableDescriptions.join('\n')}

You can reference this data when answering questions about totals, counts, or history.`)
    }
  }

  if (parts.length === 0) return ''

  return parts.join('\n\n') + '\n\nUse this context to personalize your response when relevant.'
}
