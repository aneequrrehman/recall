import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import type { QueryGenerator, QueryGeneratorResult, LLMConfig, SchemaInfo } from './types'

const QUERY_GENERATION_PROMPT = `You are a SQL query generator for SQLite. Given a natural language question and available table schemas, generate a SELECT query to answer the question.

AVAILABLE TABLES:
{{tables}}

IMPORTANT: All queries MUST filter by user_id = '{{userId}}' for data isolation.

USER QUESTION:
"{{question}}"

RULES:
1. Only generate SELECT queries (never INSERT, UPDATE, DELETE, DROP)
2. ALWAYS include WHERE user_id = '{{userId}}' in your query
3. Use exact table and column names from the schema
4. For aggregations: SUM, COUNT, AVG, MIN, MAX
5. Dates are stored as ISO strings (e.g., "2024-12-02")
   - For "this month": WHERE date >= '{{monthStart}}' AND date <= '{{monthEnd}}'
   - For "this year": WHERE date >= '{{yearStart}}'
   - For date comparisons, use string comparison (ISO format sorts correctly)
6. Boolean columns store 0 (false) or 1 (true)
7. Use LIKE for partial text matching (e.g., recipient LIKE '%jayden%')
8. For complex nested data in TEXT columns, use json_extract()

If the question cannot be answered with available data, explain why.

RESPONSE FORMAT:
- canAnswer: true if a valid query can be generated, false otherwise
- sql: the complete SELECT query (or empty string if cannot answer)
- explanation: what the query does OR why the question cannot be answered`

const QueryOutputSchema = z.object({
  canAnswer: z.boolean().describe('Whether the question can be answered'),
  sql: z.string().describe('The SQLite SELECT query, or empty if cannot answer'),
  explanation: z.string().describe('What the query does or why it cannot answer'),
})

function formatSchemas(schemas: SchemaInfo[]): string {
  if (schemas.length === 0) {
    return '(no tables available)'
  }

  return schemas
    .map(s => {
      const columns = s.columns
        .map(c => {
          const nullable = c.nullable ? ' (nullable)' : ''
          const desc = c.description ? ` — ${c.description}` : ''
          return `    ${c.name}: ${c.type}${nullable}${desc}`
        })
        .join('\n')
      return `  ${s.name}: ${s.description}\n${columns}`
    })
    .join('\n\n')
}

function getDateContext(): {
  monthStart: string
  monthEnd: string
  yearStart: string
} {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  // First day of current month
  const monthStart = new Date(year, month, 1).toISOString().split('T')[0]

  // Last day of current month
  const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0]

  // First day of current year
  const yearStart = new Date(year, 0, 1).toISOString().split('T')[0]

  return { monthStart, monthEnd, yearStart }
}

export function createOpenAIQueryGenerator(config: {
  apiKey: string
  model?: string
}): QueryGenerator {
  const client = new OpenAI({ apiKey: config.apiKey })
  const model = config.model ?? 'gpt-5-nano'

  return {
    async generate(
      question: string,
      schemas: SchemaInfo[],
      userId: string
    ): Promise<QueryGeneratorResult> {
      const dateContext = getDateContext()

      const prompt = QUERY_GENERATION_PROMPT.replace('{{tables}}', formatSchemas(schemas))
        .replace(/\{\{userId\}\}/g, userId)
        .replace('{{question}}', question)
        .replace('{{monthStart}}', dateContext.monthStart)
        .replace('{{monthEnd}}', dateContext.monthEnd)
        .replace('{{yearStart}}', dateContext.yearStart)

      const response = await client.beta.chat.completions.parse({
        model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: question },
        ],
        response_format: zodResponseFormat(QueryOutputSchema, 'query_generation'),
        temperature: 0,
      })

      const parsed = response.choices[0]?.message?.parsed

      if (!parsed) {
        return {
          canAnswer: false,
          sql: '',
          explanation: 'Failed to parse query generation response',
        }
      }

      // Validate that SQL includes user_id filter if canAnswer is true
      if (parsed.canAnswer && parsed.sql) {
        const sqlLower = parsed.sql.toLowerCase()
        if (!sqlLower.includes('user_id')) {
          // Attempt to fix by adding user_id filter
          // This is a safety measure in case LLM forgets
          const fixedSql = addUserIdFilter(parsed.sql, userId)
          return {
            canAnswer: true,
            sql: fixedSql,
            explanation: parsed.explanation,
          }
        }
      }

      return {
        canAnswer: parsed.canAnswer,
        sql: parsed.sql,
        explanation: parsed.explanation,
      }
    },
  }
}

/**
 * Add user_id filter to a SQL query if missing
 */
function addUserIdFilter(sql: string, userId: string): string {
  const sqlLower = sql.toLowerCase()

  // Find WHERE clause position
  const whereIndex = sqlLower.indexOf('where')

  if (whereIndex === -1) {
    // No WHERE clause, find FROM clause and add WHERE after table name
    const fromMatch = sql.match(/FROM\s+(\w+)/i)
    if (fromMatch) {
      const afterFrom = sql.indexOf(fromMatch[0]) + fromMatch[0].length
      const beforePart = sql.slice(0, afterFrom)
      const afterPart = sql.slice(afterFrom)

      // Check if there's GROUP BY, ORDER BY, LIMIT after
      const orderByIndex = afterPart.toLowerCase().indexOf('order by')
      const groupByIndex = afterPart.toLowerCase().indexOf('group by')
      const limitIndex = afterPart.toLowerCase().indexOf('limit')

      const insertIndex = Math.min(
        orderByIndex === -1 ? Infinity : orderByIndex,
        groupByIndex === -1 ? Infinity : groupByIndex,
        limitIndex === -1 ? Infinity : limitIndex
      )

      if (insertIndex === Infinity) {
        return `${sql} WHERE user_id = '${userId}'`
      }

      return `${beforePart}${afterPart.slice(0, insertIndex)} WHERE user_id = '${userId}' ${afterPart.slice(insertIndex)}`
    }
  } else {
    // Has WHERE clause, add AND condition
    const beforeWhere = sql.slice(0, whereIndex + 5)
    const afterWhere = sql.slice(whereIndex + 5)
    return `${beforeWhere} user_id = '${userId}' AND ${afterWhere.trim()}`
  }

  return sql
}

/**
 * Create a query generator based on the LLM config
 */
export function createQueryGenerator(config: LLMConfig): QueryGenerator {
  if (config.provider === 'openai') {
    return createOpenAIQueryGenerator({
      apiKey: config.apiKey,
      model: config.model,
    })
  }

  if (config.provider === 'anthropic') {
    // TODO: Implement Anthropic query generator
    throw new Error('Anthropic query generator not yet implemented')
  }

  throw new Error(`Unknown LLM provider: ${config.provider}`)
}
