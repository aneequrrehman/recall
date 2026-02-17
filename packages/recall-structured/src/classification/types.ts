import type { SchemaInfo } from '../types'

/**
 * Result of pure classification (no extraction, no action detection)
 */
export interface ClassificationResult {
  /** Whether the input matches any schema */
  matched: boolean

  /** Which schema matched (null if no match) */
  schema: string | null

  /** Confidence score between 0 and 1 */
  confidence: number

  /** Human-readable explanation for the classification decision */
  reason: string
}

/**
 * Pure classifier interface - classification only, no extraction
 */
export interface PureClassifier {
  classify(
    input: string,
    schemas: SchemaInfo[],
    options?: ClassificationOptions
  ): Promise<ClassificationResult>
}

/**
 * Options for classification
 */
export interface ClassificationOptions {
  /** Override current date for testing */
  date?: string
}

/**
 * Test case structure for classification testing
 */
export interface ClassificationTestCase {
  /** Unique identifier for the test case */
  id: string

  /** The category this test belongs to */
  category: ClassificationCategory

  /** The input text to classify */
  input: string

  /** Expected result */
  expected: {
    matched: boolean
    /** Required if matched is true */
    schema?: string
  }

  /** Optional description of why this is the expected result */
  description?: string
}

/**
 * Test case categories as defined in requirements
 */
export type ClassificationCategory =
  | 'clear_match'
  | 'clear_non_match'
  | 'ambiguous_match'
  | 'partial_information'
  | 'multi_schema'
  | 'tricky_non_match'

/**
 * Accuracy report for a test run
 */
export interface AccuracyReport {
  /** Overall accuracy across all categories */
  overall: number

  /** Accuracy breakdown by category */
  byCategory: Record<ClassificationCategory, CategoryAccuracy>

  /** Individual test results */
  results: TestResult[]
}

export interface CategoryAccuracy {
  total: number
  correct: number
  accuracy: number
}

export interface TestResult {
  testCase: ClassificationTestCase
  actual: ClassificationResult
  passed: boolean
  error?: string
}

// ============================================
// ITERATION 1: EXTRACTION TYPES
// ============================================

/**
 * Result of classification AND extraction.
 * Extends ClassificationResult with extracted data.
 */
export interface ExtractionResult extends ClassificationResult {
  /** Extracted field values (null if no match) */
  data: Record<string, unknown> | null
}

/**
 * Classifier that also extracts data from matched input.
 */
export interface Extractor {
  classifyAndExtract(
    input: string,
    schemas: SchemaInfo[],
    options?: ClassificationOptions
  ): Promise<ExtractionResult>
}

/**
 * Test case for extraction testing.
 * Extends classification test case with expected data.
 */
export interface ExtractionTestCase {
  /** Unique identifier for the test case */
  id: string

  /** The input text to classify and extract from */
  input: string

  /** Expected result */
  expected: {
    matched: boolean
    schema?: string
    /** Expected extracted data (for matched cases) */
    data?: Record<string, unknown>
  }

  /** Optional description */
  description?: string
}

/**
 * Result of evaluating an extraction test case
 */
export interface ExtractionTestResult {
  testCase: ExtractionTestCase
  actual: ExtractionResult
  passed: boolean
  /** Details about which fields matched/mismatched */
  fieldResults?: Record<string, { expected: unknown; actual: unknown; match: boolean }>
}

// ============================================
// ITERATION 3 & 4: INTENT DETECTION TYPES
// ============================================

/**
 * Intent type - what the user wants to do
 * - insert: Log new data
 * - query: Ask about existing data
 * - update: Modify existing data (Iteration 4)
 * - delete: Remove existing data (Iteration 4)
 * - none: Not related to any schema
 */
export type Intent = 'insert' | 'query' | 'update' | 'delete' | 'none'

/**
 * Criteria for finding an existing record to update/delete
 */
export interface RecordMatchCriteria {
  /** Field to match on (e.g., "recipient" for payments) */
  field: string
  /** Value to match */
  value: unknown
  /** How recent to look (e.g., "today", "this_week", "most_recent") */
  recency?: 'most_recent' | 'today' | 'this_week' | 'any'
}

/**
 * Result of intent detection + extraction.
 * Extends ExtractionResult with intent information.
 */
export interface IntentResult extends ExtractionResult {
  /** Detected intent */
  intent: Intent

  /** For query intent: the natural language question to answer */
  query?: string

  /** For update/delete intent: criteria to find the target record */
  matchCriteria?: RecordMatchCriteria

  /** For update intent: the fields to update (partial data) */
  updateData?: Record<string, unknown>
}

/**
 * Processor that detects intent and extracts data.
 */
export interface IntentProcessor {
  process(
    input: string,
    schemas: SchemaInfo[],
    options?: ClassificationOptions
  ): Promise<IntentResult>
}

/**
 * Test case for intent detection testing.
 */
export interface IntentTestCase {
  /** Unique identifier for the test case */
  id: string

  /** The input text to process */
  input: string

  /** Expected result */
  expected: {
    intent: Intent
    matched?: boolean
    schema?: string
    data?: Record<string, unknown>
    query?: string
  }

  /** Optional description */
  description?: string
}
