/**
 * Structured Memory Agent Factory
 *
 * Creates an agent with tools for managing structured memory.
 */

import { generateText, stepCountIs, type LanguageModel } from 'ai'
import { createStructuredMemoryTools, type StructuredMemoryTools } from './tools'
import { buildAgentSystemPrompt } from './prompts'
import type { StructuredStore, SchemaMap, SchemaInfo, ColumnInfo } from '../types'
import { createStore, extractColumnsFromZod } from '../store'

/**
 * Configuration for creating a structured memory agent
 */
export interface StructuredMemoryAgentConfig<T extends SchemaMap = SchemaMap> {
  /** SQLite database file path */
  db: string
  /** Predefined schemas */
  schemas: T
}

/**
 * Agent context for a specific user session
 */
export interface AgentContext {
  /** Tools for CRUD operations */
  tools: StructuredMemoryTools
  /** System prompt for the agent */
  systemPrompt: string
  /** Schema information */
  schemaInfo: SchemaInfo[]
}

/**
 * Pre-extracted data to provide context to the agent
 */
export interface ExtractedContext {
  /** The schema that was matched */
  schema: string
  /** The detected intent */
  intent: 'insert' | 'update' | 'delete' | 'query'
  /** Extracted field values (for insert/update) */
  data?: Record<string, unknown>
  /** Confidence score */
  confidence: number
}

/**
 * Options for agent processing
 */
export interface AgentProcessOptions {
  /** User ID for scoping data */
  userId: string
  /** Maximum number of tool call steps (default: 10) */
  maxSteps?: number
  /** Pre-extracted context from the extraction layer (recommended for better accuracy) */
  extractedContext?: ExtractedContext
}

/**
 * Result of agent processing
 */
export interface AgentProcessResult {
  /** The agent's final text response */
  text: string
  /** Number of steps taken */
  steps: number
  /** Tool calls made during processing */
  toolCalls: Array<{
    toolName: string
    input: unknown
    output: unknown
  }>
  /** Whether any data was modified */
  dataModified: boolean
}

/**
 * Structured Memory Agent instance
 */
export interface StructuredMemoryAgent<T extends SchemaMap = SchemaMap> {
  /**
   * Process a user message using multi-hop tool calls.
   * The agent will automatically use tools to query, insert, update, or delete data.
   *
   * @param model - The language model to use (e.g., openai('gpt-5-nano'))
   * @param input - The user's message
   * @param options - Processing options including userId
   * @returns The agent's response and metadata about the operation
   */
  process(
    model: LanguageModel,
    input: string,
    options: AgentProcessOptions
  ): Promise<AgentProcessResult>

  /**
   * Get agent context for a specific user.
   * This returns the tools and system prompt configured for that user.
   */
  getAgentContext(userId: string): AgentContext

  /**
   * Get the tools for a specific user.
   * Use these with AI SDK v6's generateText or ToolLoopAgent.
   */
  getTools(userId: string): StructuredMemoryTools

  /**
   * Get the system prompt with schema information (regenerated with current date/time)
   */
  getSystemPrompt(): string

  /**
   * Get schema information
   */
  getSchemas(): SchemaInfo[]

  /**
   * Close the database connection
   */
  close(): void
}

/**
 * Compute schema info from Zod schemas
 */
function computeSchemaInfo(schemas: SchemaMap): SchemaInfo[] {
  return Object.entries(schemas).map(([name, def]) => {
    const columns: ColumnInfo[] = [
      {
        name: 'id',
        type: 'TEXT',
        nullable: false,
        description: 'UUID primary key',
      },
      {
        name: 'user_id',
        type: 'TEXT',
        nullable: false,
        description: 'User identifier',
      },
      ...extractColumnsFromZod(def.schema),
      {
        name: 'created_at',
        type: 'TEXT',
        nullable: false,
        description: 'Creation timestamp',
      },
      {
        name: 'updated_at',
        type: 'TEXT',
        nullable: false,
        description: 'Last update timestamp',
      },
    ]

    return {
      name,
      description: def.description,
      columns,
    }
  })
}

/**
 * Create a structured memory agent.
 *
 * The agent provides tools for CRUD operations that can be used with
 * AI SDK v6's generateText or ToolLoopAgent.
 *
 * @example
 * ```typescript
 * import { createStructuredMemoryAgent } from '@youcraft/recall-structured'
 * import { generateText } from 'ai'
 * import { openai } from '@ai-sdk/openai'
 *
 * const agent = createStructuredMemoryAgent({
 *   db: './data.db',
 *   schemas: {
 *     payments: { description: '...', schema: z.object({ ... }) }
 *   }
 * })
 *
 * const { tools, systemPrompt } = agent.getAgentContext('user-123')
 *
 * const result = await generateText({
 *   model: openai('gpt-5-nano'),
 *   system: systemPrompt,
 *   tools,
 *   maxSteps: 10,
 *   prompt: 'Paid Jayden $150 for training'
 * })
 * ```
 */
export function createStructuredMemoryAgent<T extends SchemaMap>(
  config: StructuredMemoryAgentConfig<T>
): StructuredMemoryAgent<T> {
  const { db: dbPath, schemas } = config

  // Initialize store
  const store = createStore(dbPath)
  store.initialize(schemas)

  // Compute schema info
  const schemaInfo = computeSchemaInfo(schemas)

  // Build schema descriptions for prompt
  const schemaDescriptions = schemaInfo.map(s => ({
    name: s.name,
    description: s.description,
    fields: s.columns
      .filter(c => !['id', 'user_id', 'created_at', 'updated_at'].includes(c.name))
      .map(c => c.name),
  }))

  // Cache tools per user
  const toolsCache = new Map<string, StructuredMemoryTools>()

  // Helper to build fresh system prompt with current date/time
  const buildFreshSystemPrompt = () => buildAgentSystemPrompt(schemaDescriptions)

  // Helper to determine if a tool call modified data
  const isModifyingTool = (toolName: string) =>
    ['insertRecord', 'updateRecord', 'deleteRecord'].includes(toolName)

  return {
    async process(
      model: LanguageModel,
      input: string,
      options: AgentProcessOptions
    ): Promise<AgentProcessResult> {
      const { userId, maxSteps = 10, extractedContext } = options

      const tools = this.getTools(userId)
      const systemPrompt = buildFreshSystemPrompt()

      // Build the prompt - include extracted context if available
      let prompt = input
      if (extractedContext) {
        const contextLines = [
          `User message: "${input}"`,
          ``,
          `## Pre-extracted Information`,
          `Schema: ${extractedContext.schema}`,
          `Intent: ${extractedContext.intent}`,
          `Confidence: ${(extractedContext.confidence * 100).toFixed(0)}%`,
        ]

        if (extractedContext.data && Object.keys(extractedContext.data).length > 0) {
          contextLines.push(`Extracted data: ${JSON.stringify(extractedContext.data)}`)
        }

        contextLines.push(``)
        contextLines.push(
          `Use this extracted information to perform the ${extractedContext.intent} operation. `
        )

        if (extractedContext.intent === 'insert') {
          contextLines.push(
            `Call insertRecord with schema "${extractedContext.schema}" and the extracted data.`
          )
        } else if (extractedContext.intent === 'update') {
          contextLines.push(
            `First search for the matching record, then call updateRecord with the extracted data.`
          )
        } else if (extractedContext.intent === 'delete') {
          contextLines.push(`First search for the matching record, then call deleteRecord.`)
        } else if (extractedContext.intent === 'query') {
          contextLines.push(`Use listRecords or searchRecords to answer the user's question.`)
        }

        prompt = contextLines.join('\n')
      }

      const result = await generateText({
        model,
        system: systemPrompt,
        prompt,
        tools,
        stopWhen: stepCountIs(maxSteps),
      })

      // Extract tool calls from all steps
      const toolCalls: AgentProcessResult['toolCalls'] = []
      let dataModified = false

      for (const step of result.steps) {
        for (const toolCall of step.toolCalls) {
          toolCalls.push({
            toolName: toolCall.toolName,
            input: toolCall.input,
            output: step.toolResults.find(r => r.toolCallId === toolCall.toolCallId)?.output,
          })

          if (isModifyingTool(toolCall.toolName)) {
            dataModified = true
          }
        }
      }

      return {
        text: result.text,
        steps: result.steps.length,
        toolCalls,
        dataModified,
      }
    },

    getAgentContext(userId: string): AgentContext {
      return {
        tools: this.getTools(userId),
        systemPrompt: buildFreshSystemPrompt(),
        schemaInfo,
      }
    },

    getTools(userId: string): StructuredMemoryTools {
      if (!toolsCache.has(userId)) {
        const tools = createStructuredMemoryTools({
          store,
          schemas,
          schemaInfo,
          userId,
        })
        toolsCache.set(userId, tools)
      }
      return toolsCache.get(userId)!
    },

    getSystemPrompt(): string {
      // Regenerate with fresh date/time on each call
      return buildFreshSystemPrompt()
    },

    getSchemas(): SchemaInfo[] {
      return schemaInfo
    },

    close(): void {
      store.close()
    },
  }
}
