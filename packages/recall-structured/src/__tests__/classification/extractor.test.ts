import { describe, it, expect, beforeAll } from 'vitest'
import { createExtractor } from '../../classification/extractor'
import type { Extractor } from '../../classification/types'
import { getTestSchemaInfo } from './test-schemas'
import { extractionTestCases, compareExtractedData } from './extraction-test-cases'

// Skip API tests if no API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const describeWithApi = OPENAI_API_KEY ? describe : describe.skip

describe('Extractor - Unit Tests (no API)', () => {
  it('exports createExtractor function', () => {
    expect(typeof createExtractor).toBe('function')
  })

  it('returns extractor with classifyAndExtract method', () => {
    const extractor = createExtractor({ apiKey: 'test-key' })
    expect(typeof extractor.classifyAndExtract).toBe('function')
  })

  it('extraction test cases are properly defined', () => {
    expect(extractionTestCases.length).toBeGreaterThan(0)

    // Check some cases have expected data
    const withData = extractionTestCases.filter(tc => tc.expected.data)
    expect(withData.length).toBeGreaterThan(0)
  })
})

describeWithApi('Extractor - API Tests', () => {
  let extractor: Extractor
  const schemas = getTestSchemaInfo()

  beforeAll(() => {
    extractor = createExtractor({
      apiKey: OPENAI_API_KEY!,
      model: 'gpt-5-nano',
    })
  })

  describe('individual extraction cases', () => {
    it.each(extractionTestCases)(
      '$id: $input',
      async ({ input, expected, id }) => {
        const result = await extractor.classifyAndExtract(input, schemas)

        // Check classification
        expect(result.matched).toBe(expected.matched)
        if (expected.matched && expected.schema) {
          expect(result.schema).toBe(expected.schema)
        }

        // Check extraction
        if (expected.data) {
          expect(result.data).not.toBeNull()

          const { passed, fieldResults } = compareExtractedData(expected.data, result.data)

          // Log field comparison for debugging
          if (!passed) {
            console.log(`\n[${id}] Field comparison:`)
            for (const [field, { expected: exp, actual: act, match }] of Object.entries(
              fieldResults
            )) {
              const status = match ? '✓' : '✗'
              console.log(`  ${status} ${field}: expected "${exp}", got "${act}"`)
            }
          }

          expect(passed).toBe(true)
        } else {
          // Non-match case
          expect(result.data).toBeNull()
        }
      },
      30000 // 30s timeout per test
    )
  })

  describe('extraction accuracy summary', () => {
    it('achieves 85%+ extraction accuracy on matched cases', async () => {
      const matchedCases = extractionTestCases.filter(tc => tc.expected.matched)
      let correctExtractions = 0

      for (const testCase of matchedCases) {
        const result = await extractor.classifyAndExtract(testCase.input, schemas)

        if (result.matched && result.data && testCase.expected.data) {
          const { passed } = compareExtractedData(testCase.expected.data, result.data)
          if (passed) correctExtractions++
        }
      }

      const accuracy = correctExtractions / matchedCases.length
      console.log(
        `\nExtraction accuracy: ${correctExtractions}/${matchedCases.length} (${(accuracy * 100).toFixed(1)}%)`
      )

      expect(accuracy).toBeGreaterThanOrEqual(0.85)
    }, 300000) // 5 min timeout
  })

  describe('full extraction report', () => {
    it('generates complete extraction report', async () => {
      const results = []
      let classificationCorrect = 0
      let extractionCorrect = 0
      const matchedCases = extractionTestCases.filter(tc => tc.expected.matched)

      for (const testCase of extractionTestCases) {
        const result = await extractor.classifyAndExtract(testCase.input, schemas)

        // Check classification
        const classificationMatch =
          result.matched === testCase.expected.matched &&
          (!testCase.expected.schema || result.schema === testCase.expected.schema)

        if (classificationMatch) classificationCorrect++

        // Check extraction for matched cases
        let extractionMatch = false
        let fieldResults = {}

        if (testCase.expected.matched && testCase.expected.data) {
          const comparison = compareExtractedData(testCase.expected.data, result.data)
          extractionMatch = comparison.passed
          fieldResults = comparison.fieldResults
          if (extractionMatch) extractionCorrect++
        } else if (!testCase.expected.matched) {
          extractionMatch = result.data === null
          if (extractionMatch) extractionCorrect++
        }

        results.push({
          testCase,
          result,
          classificationMatch,
          extractionMatch,
          fieldResults,
        })
      }

      // Print report
      console.log('\n' + '='.repeat(60))
      console.log('EXTRACTION REPORT')
      console.log('='.repeat(60))
      console.log(
        `Classification: ${classificationCorrect}/${extractionTestCases.length} (${((classificationCorrect / extractionTestCases.length) * 100).toFixed(1)}%)`
      )
      console.log(
        `Extraction: ${extractionCorrect}/${extractionTestCases.length} (${((extractionCorrect / extractionTestCases.length) * 100).toFixed(1)}%)`
      )

      // Show failures
      const failures = results.filter(r => !r.extractionMatch)
      if (failures.length > 0) {
        console.log('\nFailed extractions:')
        for (const f of failures) {
          console.log(`\n  [${f.testCase.id}] "${f.testCase.input}"`)
          console.log(`    Expected: ${JSON.stringify(f.testCase.expected.data)}`)
          console.log(`    Actual: ${JSON.stringify(f.result.data)}`)
        }
      }

      console.log('='.repeat(60))

      // Assert overall accuracy
      expect(classificationCorrect / extractionTestCases.length).toBeGreaterThanOrEqual(0.9)
      expect(extractionCorrect / matchedCases.length).toBeGreaterThanOrEqual(0.85)
    }, 600000) // 10 min timeout
  })
})
