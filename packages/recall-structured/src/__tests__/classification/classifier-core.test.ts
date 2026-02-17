import { describe, it, expect, beforeAll } from 'vitest'
import { createPureClassifier } from '../../classification/classifier-core'
import type { PureClassifier } from '../../classification/types'
import { getTestSchemaInfo } from './test-schemas'
import { testCases, allCategories } from './test-cases'
import {
  computeAccuracy,
  evaluateResult,
  formatReport,
  accuracyThresholds,
} from './accuracy-reporter'

// Skip API tests if no API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const describeWithApi = OPENAI_API_KEY ? describe : describe.skip

describe('PureClassifier - Unit Tests (no API)', () => {
  it('exports createPureClassifier function', () => {
    expect(typeof createPureClassifier).toBe('function')
  })

  it('returns classifier with classify method', () => {
    const classifier = createPureClassifier({ apiKey: 'test-key' })
    expect(typeof classifier.classify).toBe('function')
  })

  it('test schemas are properly defined', () => {
    const schemas = getTestSchemaInfo()
    expect(schemas).toHaveLength(3)
    expect(schemas.map(s => s.name)).toEqual(['payments', 'workouts', 'medications'])
  })

  it('test cases cover all categories', () => {
    for (const category of allCategories) {
      const cases = testCases.filter(tc => tc.category === category)
      expect(cases.length).toBeGreaterThan(0)
    }
  })
})

describeWithApi('PureClassifier - API Tests', () => {
  let classifier: PureClassifier
  const schemas = getTestSchemaInfo()

  beforeAll(() => {
    classifier = createPureClassifier({
      apiKey: OPENAI_API_KEY!,
      model: 'gpt-5-nano',
    })
  })

  describe('individual test cases', () => {
    // Test each case individually
    it.each(testCases)(
      '$category: $id',
      async ({ input, expected, id }) => {
        const result = await classifier.classify(input, schemas)

        if (expected.matched) {
          expect(result.matched).toBe(true)
          expect(result.schema).toBe(expected.schema)
        } else {
          expect(result.matched).toBe(false)
        }
      },
      30000 // 30s timeout per test
    )
  })

  describe('accuracy by category', () => {
    // Test accuracy per category
    it.each(allCategories)(
      '%s category meets threshold',
      async category => {
        const cases = testCases.filter(tc => tc.category === category)
        const results = []

        for (const testCase of cases) {
          const actual = await classifier.classify(testCase.input, schemas)
          results.push(evaluateResult(testCase, actual))
        }

        const correct = results.filter(r => r.passed).length
        const accuracy = correct / results.length
        const threshold = accuracyThresholds[category]

        // Log failures for debugging
        const failures = results.filter(r => !r.passed)
        if (failures.length > 0) {
          console.log(`\n${category} failures:`)
          for (const f of failures) {
            console.log(`  - ${f.testCase.id}: ${f.testCase.input}`)
            console.log(`    Expected: ${JSON.stringify(f.testCase.expected)}`)
            console.log(`    Actual: matched=${f.actual.matched}, schema=${f.actual.schema}`)
          }
        }

        expect(accuracy).toBeGreaterThanOrEqual(threshold)
      },
      180000 // 3 min timeout per category
    )
  })

  describe('full accuracy report', () => {
    it('overall accuracy meets 90% threshold', async () => {
      const results = []

      for (const testCase of testCases) {
        const actual = await classifier.classify(testCase.input, schemas)
        results.push(evaluateResult(testCase, actual))
      }

      const report = computeAccuracy(results)

      // Print the full report
      console.log('\n' + formatReport(report))

      // Assert overall accuracy
      expect(report.overall).toBeGreaterThanOrEqual(0.9)
    }, 600000) // 10 min timeout for all tests
  })
})
