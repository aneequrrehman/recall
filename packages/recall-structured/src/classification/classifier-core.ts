import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import type { SchemaInfo } from '../types'
import type { PureClassifier, ClassificationResult, ClassificationOptions } from './types'
import { ClassificationOutputSchema } from './schemas'
import { CLASSIFICATION_PROMPT } from './prompts'

export interface CreatePureClassifierConfig {
  apiKey: string
  model?: string
}

/**
 * Format schemas for inclusion in the prompt.
 * Filters out system fields (id, user_id, created_at, updated_at).
 */
function formatSchemas(schemas: SchemaInfo[]): string {
  return schemas
    .map(s => {
      const fields = s.columns
        .filter(c => !['id', 'user_id', 'created_at', 'updated_at'].includes(c.name))
        .map(c => {
          const desc = c.description ? ` - ${c.description}` : ''
          const nullable = c.nullable ? ' (optional)' : ''
          return `    - ${c.name}: ${c.type}${nullable}${desc}`
        })
        .join('\n')
      return `### ${s.name}\n${s.description}\nFields:\n${fields}`
    })
    .join('\n\n')
}

/**
 * Create a pure classifier that only determines if input matches a schema.
 * No extraction, no CRUD action detection - just classification.
 */
export function createPureClassifier(config: CreatePureClassifierConfig): PureClassifier {
  const client = new OpenAI({ apiKey: config.apiKey })
  const model = config.model ?? 'gpt-5-nano'

  return {
    async classify(
      input: string,
      schemas: SchemaInfo[],
      options?: ClassificationOptions
    ): Promise<ClassificationResult> {
      // Build the prompt with schemas
      const prompt = CLASSIFICATION_PROMPT.replace('{{schemas}}', formatSchemas(schemas)).replace(
        '{{input}}',
        input
      )

      try {
        const response = await client.beta.chat.completions.parse({
          model,
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: input },
          ],
          response_format: zodResponseFormat(ClassificationOutputSchema, 'classification'),
          temperature: 0,
        })

        const parsed = response.choices[0]?.message?.parsed

        if (!parsed) {
          return {
            matched: false,
            schema: null,
            confidence: 0,
            reason: 'Failed to parse classification response',
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
            }
          }
        }

        // Ensure consistency: if matched is true, schema should be set
        if (parsed.matched && !parsed.schema) {
          return {
            matched: false,
            schema: null,
            confidence: parsed.confidence,
            reason: 'Classification matched but no schema specified',
          }
        }

        return {
          matched: parsed.matched,
          schema: parsed.schema,
          confidence: parsed.confidence,
          reason: parsed.reason,
        }
      } catch (error) {
        // Handle API errors gracefully
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          matched: false,
          schema: null,
          confidence: 0,
          reason: `Classification failed: ${message}`,
        }
      }
    },
  }
}
