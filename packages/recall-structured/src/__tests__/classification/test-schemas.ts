import { z } from 'zod'
import type { SchemaMap, SchemaInfo, ColumnInfo } from '../../types'

/**
 * Test schemas as defined in the structured memory implementation plan.
 * These are used for testing the classification accuracy.
 */
export const testSchemas: SchemaMap = {
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
}

/**
 * Extract column info from a Zod schema for test purposes.
 * This mirrors the logic in the main store but simplified for testing.
 */
function extractColumnsFromZodForTest(schema: z.ZodObject<z.ZodRawShape>): ColumnInfo[] {
  const columns: ColumnInfo[] = []
  const shape = schema.shape

  for (const [fieldName, fieldType] of Object.entries(shape)) {
    let isOptional = false
    let innerType = fieldType

    // Unwrap optional types
    if (innerType instanceof z.ZodOptional) {
      isOptional = true
      innerType = innerType.unwrap()
    }

    // Determine SQL type based on Zod type
    let sqlType = 'TEXT'
    if (innerType instanceof z.ZodNumber) {
      sqlType = 'REAL'
    } else if (innerType instanceof z.ZodBoolean) {
      sqlType = 'INTEGER'
    }

    // Get description if available
    const description = (fieldType as any)._def?.description

    columns.push({
      name: fieldName,
      type: sqlType,
      nullable: isOptional,
      description,
    })
  }

  return columns
}

/**
 * Get SchemaInfo array for testing.
 * This is what gets passed to the classifier.
 */
export function getTestSchemaInfo(): SchemaInfo[] {
  return Object.entries(testSchemas).map(([name, def]) => ({
    name,
    description: def.description,
    columns: extractColumnsFromZodForTest(def.schema),
  }))
}
