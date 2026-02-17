import type {
  ClassificationTestCase,
  ClassificationResult,
  AccuracyReport,
  CategoryAccuracy,
  ClassificationCategory,
  TestResult,
} from '../../classification/types'
import { allCategories } from './test-cases'

/**
 * Evaluate a single test result
 */
export function evaluateResult(
  testCase: ClassificationTestCase,
  actual: ClassificationResult
): TestResult {
  let passed = false

  if (testCase.expected.matched) {
    // Expected a match - check that it matched AND schema is correct
    passed = actual.matched && actual.schema === testCase.expected.schema
  } else {
    // Expected no match - just check that it didn't match
    passed = !actual.matched
  }

  return {
    testCase,
    actual,
    passed,
  }
}

/**
 * Compute accuracy report from test results
 */
export function computeAccuracy(results: TestResult[]): AccuracyReport {
  const byCategory = {} as Record<ClassificationCategory, CategoryAccuracy>

  // Initialize all categories
  for (const category of allCategories) {
    const categoryResults = results.filter(r => r.testCase.category === category)
    const correct = categoryResults.filter(r => r.passed).length
    const total = categoryResults.length

    byCategory[category] = {
      total,
      correct,
      accuracy: total > 0 ? correct / total : 0,
    }
  }

  // Calculate overall accuracy
  const totalCorrect = results.filter(r => r.passed).length
  const overall = results.length > 0 ? totalCorrect / results.length : 0

  return {
    overall,
    byCategory,
    results,
  }
}

/**
 * Expected accuracy thresholds by category
 */
export const accuracyThresholds: Record<ClassificationCategory, number> = {
  clear_match: 1.0, // 100% expected
  clear_non_match: 1.0, // 100% expected
  ambiguous_match: 0.8, // 80%+ acceptable
  partial_information: 0.9, // 90%+ expected
  multi_schema: 0.8, // 80%+ acceptable
  tricky_non_match: 0.85, // 85%+ expected
}

/**
 * Format accuracy report for console output
 */
export function formatReport(report: AccuracyReport): string {
  const lines: string[] = []

  lines.push('='.repeat(60))
  lines.push('CLASSIFICATION ACCURACY REPORT')
  lines.push('='.repeat(60))
  lines.push('')

  // Overall accuracy
  const overallPct = (report.overall * 100).toFixed(1)
  const overallStatus = report.overall >= 0.9 ? 'PASS' : 'FAIL'
  lines.push(`Overall Accuracy: ${overallPct}% [${overallStatus}]`)
  lines.push('')

  // By category
  lines.push('By Category:')
  lines.push('-'.repeat(60))

  for (const category of allCategories) {
    const cat = report.byCategory[category]
    const pct = (cat.accuracy * 100).toFixed(1)
    const threshold = accuracyThresholds[category]
    const thresholdPct = (threshold * 100).toFixed(0)
    const status = cat.accuracy >= threshold ? 'PASS' : 'FAIL'
    const categoryLabel = category.replace(/_/g, ' ').padEnd(22)
    lines.push(
      `  ${categoryLabel} ${cat.correct}/${cat.total} (${pct}%) - threshold ${thresholdPct}% [${status}]`
    )
  }

  // Failed cases
  const failures = report.results.filter(r => !r.passed)
  if (failures.length > 0) {
    lines.push('')
    lines.push('-'.repeat(60))
    lines.push(`FAILED CASES (${failures.length}):`)
    lines.push('')

    for (const f of failures) {
      const expectedStr = f.testCase.expected.matched
        ? `matched: ${f.testCase.expected.schema}`
        : 'not matched'
      const actualStr = f.actual.matched ? `matched: ${f.actual.schema}` : 'not matched'

      lines.push(`  [${f.testCase.category}] ${f.testCase.id}`)
      lines.push(`    Input: "${f.testCase.input}"`)
      lines.push(`    Expected: ${expectedStr}`)
      lines.push(`    Actual: ${actualStr} (confidence: ${f.actual.confidence.toFixed(2)})`)
      lines.push(`    Reason: ${f.actual.reason}`)
      lines.push('')
    }
  }

  lines.push('='.repeat(60))

  return lines.join('\n')
}

/**
 * Check if all categories meet their thresholds
 */
export function allCategoriesPass(report: AccuracyReport): boolean {
  for (const category of allCategories) {
    const cat = report.byCategory[category]
    const threshold = accuracyThresholds[category]
    if (cat.accuracy < threshold) {
      return false
    }
  }
  return true
}
