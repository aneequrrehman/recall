import type { ExtractionTestCase } from '../../classification/types'

/**
 * Test cases for extraction (Iteration 1).
 * Each test case includes expected extracted data.
 *
 * Note: Date fields use placeholders that are replaced at test time.
 */
export const extractionTestCases: ExtractionTestCase[] = [
  // ============================================
  // Payments - Full extraction
  // ============================================
  {
    id: 'extract-payment-1',
    input: 'Paid Jayden $150 for MMA training',
    expected: {
      matched: true,
      schema: 'payments',
      data: {
        recipient: 'Jayden',
        amount: 150,
        description: 'MMA training',
      },
    },
  },
  {
    id: 'extract-payment-2',
    input: 'Sent $50 to my sister for lunch',
    expected: {
      matched: true,
      schema: 'payments',
      data: {
        recipient: 'sister',
        amount: 50,
        description: 'lunch',
      },
    },
  },
  {
    id: 'extract-payment-3',
    input: 'Paid rent $2000',
    expected: {
      matched: true,
      schema: 'payments',
      data: {
        recipient: 'rent',
        amount: 2000,
      },
    },
  },
  {
    id: 'extract-payment-4',
    input: 'Tipped the waiter $20',
    expected: {
      matched: true,
      schema: 'payments',
      data: {
        recipient: 'waiter',
        amount: 20,
      },
    },
  },
  {
    id: 'extract-payment-5',
    input: 'Bought groceries for $85 at Whole Foods',
    expected: {
      matched: true,
      schema: 'payments',
      data: {
        recipient: 'Whole Foods',
        amount: 85,
        description: 'groceries',
      },
    },
  },

  // ============================================
  // Workouts - Full extraction
  // ============================================
  {
    id: 'extract-workout-1',
    input: 'Ran 5km this morning',
    expected: {
      matched: true,
      schema: 'workouts',
      data: {
        type: 'running',
        distance: 5,
      },
    },
  },
  {
    id: 'extract-workout-2',
    input: 'Did 30 minutes of yoga',
    expected: {
      matched: true,
      schema: 'workouts',
      data: {
        type: 'yoga',
        duration: 30,
      },
    },
  },
  {
    id: 'extract-workout-3',
    input: 'Went to the gym for an hour',
    expected: {
      matched: true,
      schema: 'workouts',
      data: {
        type: 'gym',
        duration: 60,
      },
    },
  },
  {
    id: 'extract-workout-4',
    input: 'Swam 20 laps at the pool',
    expected: {
      matched: true,
      schema: 'workouts',
      data: {
        type: 'swimming',
      },
    },
  },
  {
    id: 'extract-workout-5',
    input: 'Lifted weights for 45 minutes, burned about 300 calories',
    expected: {
      matched: true,
      schema: 'workouts',
      data: {
        type: 'weights',
        duration: 45,
        calories: 300,
      },
    },
  },

  // ============================================
  // Medications - Full extraction
  // ============================================
  {
    id: 'extract-medication-1',
    input: 'Taking 500mg ibuprofen twice daily',
    expected: {
      matched: true,
      schema: 'medications',
      data: {
        name: 'ibuprofen',
        dosage: '500mg',
        frequency: 'twice daily',
        active: true,
      },
    },
  },
  {
    id: 'extract-medication-2',
    input: 'Started taking vitamin D supplements',
    expected: {
      matched: true,
      schema: 'medications',
      data: {
        name: 'vitamin D',
        active: true,
      },
    },
  },
  {
    id: 'extract-medication-3',
    input: 'On 10mg Lexapro for anxiety',
    expected: {
      matched: true,
      schema: 'medications',
      data: {
        name: 'Lexapro',
        dosage: '10mg',
        active: true,
      },
    },
  },
  {
    id: 'extract-medication-4',
    input: 'Stopped taking my antidepressants',
    expected: {
      matched: true,
      schema: 'medications',
      data: {
        name: 'antidepressants',
        active: false,
      },
    },
  },
  {
    id: 'extract-medication-5',
    input: 'Using melatonin 5mg to help with sleep',
    expected: {
      matched: true,
      schema: 'medications',
      data: {
        name: 'melatonin',
        dosage: '5mg',
        active: true,
      },
    },
  },

  // ============================================
  // Non-matches (should have null data)
  // ============================================
  {
    id: 'extract-non-match-1',
    input: 'I love pizza',
    expected: {
      matched: false,
      data: undefined,
    },
  },
  {
    id: 'extract-non-match-2',
    input: 'How much did I pay Jayden?',
    expected: {
      matched: false,
      data: undefined,
    },
  },
  {
    id: 'extract-non-match-3',
    input: 'I should work out more',
    expected: {
      matched: false,
      data: undefined,
    },
  },

  // ============================================
  // Partial information - Extract what's available
  // ============================================
  {
    id: 'extract-partial-1',
    input: 'Paid the plumber',
    expected: {
      matched: true,
      schema: 'payments',
      data: {
        recipient: 'plumber',
      },
    },
    description: 'Missing amount but should still extract recipient',
  },
  {
    id: 'extract-partial-2',
    input: 'Did some exercise',
    expected: {
      matched: true,
      schema: 'workouts',
      data: {
        type: 'exercise',
      },
    },
    description: 'Vague but should extract type',
  },
  {
    id: 'extract-partial-3',
    input: 'Taking my meds',
    expected: {
      matched: true,
      schema: 'medications',
      data: {
        active: true,
      },
    },
    description: 'Very vague but should mark as active',
  },
]

/**
 * Evaluate if extracted data matches expected data.
 * Returns field-by-field comparison.
 */
export function compareExtractedData(
  expected: Record<string, unknown> | undefined,
  actual: Record<string, unknown> | null
): {
  passed: boolean
  fieldResults: Record<string, { expected: unknown; actual: unknown; match: boolean }>
} {
  const fieldResults: Record<string, { expected: unknown; actual: unknown; match: boolean }> = {}

  // If expected is undefined, we expect null/undefined actual
  if (expected === undefined) {
    return {
      passed: actual === null || actual === undefined,
      fieldResults: {},
    }
  }

  // If expected has data but actual is null, fail
  if (actual === null) {
    for (const key of Object.keys(expected)) {
      fieldResults[key] = { expected: expected[key], actual: undefined, match: false }
    }
    return { passed: false, fieldResults }
  }

  let allMatch = true

  // Check each expected field
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = actual[key]

    // Flexible matching for strings (case-insensitive, partial match)
    let match = false
    if (typeof expectedValue === 'string' && typeof actualValue === 'string') {
      match =
        actualValue.toLowerCase().includes(expectedValue.toLowerCase()) ||
        expectedValue.toLowerCase().includes(actualValue.toLowerCase())
    } else if (typeof expectedValue === 'number' && typeof actualValue === 'number') {
      match = expectedValue === actualValue
    } else if (typeof expectedValue === 'boolean' && typeof actualValue === 'boolean') {
      match = expectedValue === actualValue
    } else {
      match = expectedValue === actualValue
    }

    fieldResults[key] = { expected: expectedValue, actual: actualValue, match }
    if (!match) allMatch = false
  }

  return { passed: allMatch, fieldResults }
}
