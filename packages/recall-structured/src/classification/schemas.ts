import { z } from 'zod'

/**
 * Zod schema for structured output from the classification LLM call.
 * This schema is used with OpenAI's zodResponseFormat to ensure
 * the response matches our expected structure.
 */
export const ClassificationOutputSchema = z.object({
  matched: z.boolean().describe('Whether the input matches any schema'),
  schema: z.string().nullable().describe('The name of the matched schema, or null if no match'),
  confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
  reason: z.string().describe('Brief explanation of why this classification was made'),
})

export type ClassificationOutput = z.infer<typeof ClassificationOutputSchema>

/**
 * Zod schema for structured output from the extraction LLM call.
 * Includes classification + extracted data.
 *
 * We use an array of key-value pairs for extracted data because:
 * 1. The fields are dynamic based on the schema
 * 2. OpenAI structured outputs work better with defined shapes
 * 3. We can convert to Record<string, unknown> after parsing
 */
export const ExtractionOutputSchema = z.object({
  matched: z.boolean().describe('Whether the input matches any schema'),
  schema: z.string().nullable().describe('The name of the matched schema, or null if no match'),
  confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
  reason: z.string().describe('Brief explanation of the classification and extraction'),
  data: z
    .array(
      z.object({
        field: z.string().describe('Field name from the schema'),
        value: z.string().describe('Extracted value as string'),
        type: z
          .enum(['string', 'number', 'boolean', 'date'])
          .describe('The data type of this field'),
      })
    )
    .nullable()
    .describe('Extracted field values as array, or null if no match'),
})

export type ExtractionOutput = z.infer<typeof ExtractionOutputSchema>
