import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import type { SchemaInfo } from '../types'
import type {
  ClassificationOptions,
  IntentResult,
  IntentProcessor,
  Intent,
  RecordMatchCriteria,
} from './types'
import { buildSchemaContext } from './prompts'

/**
 * Zod schema for intent detection + extraction output (Iteration 4)
 */
const IntentOutputSchema = z.object({
  intent: z
    .enum(['insert', 'query', 'update', 'delete', 'none'])
    .describe(
      'insert = log new data, query = ask about data, update = modify existing, delete = remove existing, none = neither'
    ),
  matched: z.boolean().describe('Whether input relates to any schema'),
  schema: z.string().nullable().describe('Which schema matched (null if none)'),
  confidence: z.number().min(0).max(1).describe('Confidence in the classification'),
  reason: z.string().describe('Brief explanation of the decision'),
  data: z
    .array(
      z.object({
        field: z.string(),
        value: z.string(),
        type: z.enum(['string', 'number', 'boolean', 'date']),
      })
    )
    .nullable()
    .describe('Extracted field values for INSERT intent (null otherwise)'),
  query: z.string().nullable().describe('The question for QUERY intent (null otherwise)'),
  matchCriteria: z
    .object({
      field: z.string().describe('Field to match on (e.g., "recipient", "type", "name")'),
      value: z.string().describe('Value to match'),
      recency: z.enum(['most_recent', 'today', 'this_week', 'any']).describe('How recent to look'),
    })
    .nullable()
    .describe('Criteria to find existing record for UPDATE/DELETE (null otherwise)'),
  updateData: z
    .array(
      z.object({
        field: z.string(),
        value: z.string(),
        type: z.enum(['string', 'number', 'boolean', 'date']),
      })
    )
    .nullable()
    .describe('Fields to update for UPDATE intent (null otherwise)'),
})

/**
 * Prompt for intent detection + extraction (Iteration 4)
 */
const INTENT_PROMPT = `You are a structured data processor that:
1. Detects user INTENT (insert, query, update, delete, or none)
2. Classifies which schema the input relates to
3. Extracts appropriate data based on intent

## Intent Types

**INSERT** - User is logging/recording a NEW event or data point:
- "Paid Jayden $150 for training"
- "Ran 5km this morning"
- "Started taking vitamin D"

**QUERY** - User is ASKING about their existing data:
- "How much have I paid Jayden?"
- "What workouts did I do this week?"
- "Am I taking any medications?"

**UPDATE** - User is CORRECTING or MODIFYING existing data:
- "Actually I paid Jayden $200, not $150" → update payment amount
- "I ran 5km, not 3km" → update workout distance
- "Change my ibuprofen dosage to 400mg" → update medication
- "The payment to Jayden was for groceries" → update description
- "I stopped taking ibuprofen" → update active=false

**DELETE** - User wants to REMOVE existing data:
- "Delete that last payment"
- "Remove the workout I logged"
- "Cancel that payment to Jayden"
- "Forget about that medication"

**NONE** - Neither of the above:
- "I love pizza" (general statement)
- "What's the weather?" (unrelated)
- "I should work out more" (intention, not event)

## Key Rules

1. **INSERT** = NEW data being recorded
2. **QUERY** = Asking ABOUT existing data (questions)
3. **UPDATE** = Correction words like "actually", "not X but Y", "change", "was actually"
4. **DELETE** = Removal words like "delete", "remove", "cancel", "forget"
5. **NONE** = Doesn't fit any schema or is just intentions/preferences

## For UPDATE/DELETE - Match Criteria

When detecting UPDATE or DELETE, you must provide matchCriteria to find the record:
- field: The most identifying field (recipient for payments, type for workouts, name for medications)
- value: The value to match
- recency: How recent ('most_recent' for "that last X", 'today' for today's records, 'any' for general)

## Available Schemas

{SCHEMA_CONTEXT}

## Your Task

Return:
- intent: 'insert' | 'query' | 'update' | 'delete' | 'none'
- matched: true if relates to any schema
- schema: which schema (null if none)
- confidence: 0-1 score
- reason: brief explanation
- data: for INSERT only - all extracted fields
- query: for QUERY only - the question
- matchCriteria: for UPDATE/DELETE - how to find the record
- updateData: for UPDATE only - fields to change

Current date: {DATE}`

export interface CreateIntentProcessorConfig {
  apiKey: string
  model?: string
}

/**
 * Create an intent processor for Iteration 3.
 * Detects intent (insert/query/none) and extracts data or query.
 */
export function createIntentProcessor(config: CreateIntentProcessorConfig): IntentProcessor {
  const client = new OpenAI({ apiKey: config.apiKey })
  const model = config.model ?? 'gpt-5-nano'

  return {
    async process(
      input: string,
      schemas: SchemaInfo[],
      options?: ClassificationOptions
    ): Promise<IntentResult> {
      const date = options?.date ?? new Date().toISOString().split('T')[0]
      const schemaContext = buildSchemaContext(schemas)

      const prompt = INTENT_PROMPT.replace('{SCHEMA_CONTEXT}', schemaContext).replace(
        '{DATE}',
        date
      )

      const response = await client.beta.chat.completions.parse({
        model,
        temperature: 0,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: input },
        ],
        response_format: zodResponseFormat(IntentOutputSchema, 'intent_result'),
      })

      const parsed = response.choices[0].message.parsed

      if (!parsed) {
        return {
          intent: 'none',
          matched: false,
          schema: null,
          confidence: 0,
          reason: 'Failed to parse response',
          data: null,
        }
      }

      // Validate schema exists
      if (parsed.matched && parsed.schema) {
        const schemaExists = schemas.some(s => s.name === parsed.schema)
        if (!schemaExists) {
          return {
            intent: 'none',
            matched: false,
            schema: null,
            confidence: parsed.confidence,
            reason: `Schema "${parsed.schema}" not found`,
            data: null,
          }
        }
      }

      // Helper to convert field array to object
      const parseFieldArray = (
        fields: Array<{ field: string; value: string; type: string }> | null
      ): Record<string, unknown> | null => {
        if (!fields || fields.length === 0) return null
        const result: Record<string, unknown> = {}
        for (const f of fields) {
          let value: unknown = f.value
          if (f.type === 'number') {
            value = parseFloat(f.value)
          } else if (f.type === 'boolean') {
            value = f.value.toLowerCase() === 'true' || f.value.toLowerCase() === 'yes'
          }
          result[f.field] = value
        }
        return result
      }

      // Convert extracted data for INSERT
      const extractedData = parsed.intent === 'insert' ? parseFieldArray(parsed.data) : null

      // Convert update data for UPDATE
      const updateData =
        parsed.intent === 'update' ? (parseFieldArray(parsed.updateData) ?? undefined) : undefined

      // Convert match criteria for UPDATE/DELETE
      let matchCriteria: RecordMatchCriteria | undefined
      if ((parsed.intent === 'update' || parsed.intent === 'delete') && parsed.matchCriteria) {
        matchCriteria = {
          field: parsed.matchCriteria.field,
          value: parsed.matchCriteria.value,
          recency: parsed.matchCriteria.recency,
        }
      }

      return {
        intent: parsed.intent as Intent,
        matched: parsed.matched,
        schema: parsed.schema,
        confidence: parsed.confidence,
        reason: parsed.reason,
        data: extractedData,
        query: parsed.intent === 'query' ? (parsed.query ?? input) : undefined,
        matchCriteria,
        updateData,
      }
    },
  }
}
