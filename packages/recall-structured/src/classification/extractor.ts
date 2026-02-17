import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import type { SchemaInfo } from '../types'
import type { Extractor, ExtractionResult, ClassificationOptions } from './types'
import { ExtractionOutputSchema } from './schemas'
import { EXTRACTION_PROMPT } from './prompts'

export interface CreateExtractorConfig {
  apiKey: string
  model?: string
}

/**
 * Format schemas for inclusion in the prompt.
 * Includes field types and descriptions for better extraction.
 */
function formatSchemas(schemas: SchemaInfo[]): string {
  return schemas
    .map(s => {
      const fields = s.columns
        .filter(c => !['id', 'user_id', 'created_at', 'updated_at'].includes(c.name))
        .map(c => {
          const desc = c.description ? ` - ${c.description}` : ''
          const nullable = c.nullable ? ' (optional)' : ' (required)'
          return `    - ${c.name}: ${c.type}${nullable}${desc}`
        })
        .join('\n')
      return `### ${s.name}\n${s.description}\nFields:\n${fields}`
    })
    .join('\n\n')
}

/**
 * Get current date info for the prompt.
 */
function getDateInfo(): { currentDate: string; yesterday: string } {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  return {
    currentDate: today.toISOString().split('T')[0],
    yesterday: yesterday.toISOString().split('T')[0],
  }
}

/**
 * Parse extracted data from LLM response to Record<string, unknown>.
 * Converts string values to appropriate types.
 */
function parseExtractedData(
  data: Array<{ field: string; value: string; type: string }> | null
): Record<string, unknown> | null {
  if (!data || data.length === 0) return null

  const result: Record<string, unknown> = {}

  for (const entry of data) {
    switch (entry.type) {
      case 'number': {
        // Parse numeric values, handling currency symbols
        const cleaned = entry.value.replace(/[$,]/g, '')
        const numValue = parseFloat(cleaned)
        result[entry.field] = isNaN(numValue) ? entry.value : numValue
        break
      }
      case 'boolean': {
        const lower = entry.value.toLowerCase()
        result[entry.field] = lower === 'true' || lower === 'yes' || lower === '1'
        break
      }
      case 'date': {
        // Keep dates as strings in ISO format
        result[entry.field] = entry.value
        break
      }
      default: {
        // String type or unknown
        result[entry.field] = entry.value
        break
      }
    }
  }

  return result
}

/**
 * Create an extractor that classifies input AND extracts field values.
 */
export function createExtractor(config: CreateExtractorConfig): Extractor {
  const client = new OpenAI({ apiKey: config.apiKey })
  const model = config.model ?? 'gpt-5-nano'

  return {
    async classifyAndExtract(
      input: string,
      schemas: SchemaInfo[],
      options?: ClassificationOptions
    ): Promise<ExtractionResult> {
      const dateInfo = getDateInfo()
      const currentDate = options?.date ?? dateInfo.currentDate

      // Build the prompt with schemas and date info
      const prompt = EXTRACTION_PROMPT.replace('{{schemas}}', formatSchemas(schemas))
        .replace(/\{\{currentDate\}\}/g, currentDate)
        .replace(/\{\{yesterday\}\}/g, dateInfo.yesterday)
        .replace('{{input}}', input)

      try {
        const response = await client.beta.chat.completions.parse({
          model,
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: input },
          ],
          response_format: zodResponseFormat(ExtractionOutputSchema, 'extraction'),
          temperature: 0,
        })

        const parsed = response.choices[0]?.message?.parsed

        if (!parsed) {
          return {
            matched: false,
            schema: null,
            confidence: 0,
            reason: 'Failed to parse extraction response',
            data: null,
          }
        }

        // Validate that if matched, the schema actually exists
        if (parsed.matched && parsed.schema) {
          const schemaExists = schemas.some(s => s.name === parsed.schema)
          if (!schemaExists) {
            return {
              matched: false,
              schema: null,
              confidence: 0,
              reason: `Schema "${parsed.schema}" does not exist in predefined schemas`,
              data: null,
            }
          }
        }

        // Ensure consistency: if matched is true, schema should be set
        if (parsed.matched && !parsed.schema) {
          return {
            matched: false,
            schema: null,
            confidence: parsed.confidence,
            reason: 'Extraction matched but no schema specified',
            data: null,
          }
        }

        return {
          matched: parsed.matched,
          schema: parsed.schema,
          confidence: parsed.confidence,
          reason: parsed.reason,
          data: parseExtractedData(parsed.data),
        }
      } catch (error) {
        // Handle API errors gracefully
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          matched: false,
          schema: null,
          confidence: 0,
          reason: `Extraction failed: ${message}`,
          data: null,
        }
      }
    },
  }
}
