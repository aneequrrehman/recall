// Core classifier (Iteration 0)
export { createPureClassifier } from './classifier-core'
export type { CreatePureClassifierConfig } from './classifier-core'

// Extractor (Iteration 1)
export { createExtractor } from './extractor'
export type { CreateExtractorConfig } from './extractor'

// Intent Processor (Iteration 3)
export { createIntentProcessor } from './intent-processor'
export type { CreateIntentProcessorConfig } from './intent-processor'

// Types
export type {
  // Classification (Iteration 0)
  ClassificationResult,
  PureClassifier,
  ClassificationOptions,
  ClassificationTestCase,
  ClassificationCategory,
  AccuracyReport,
  CategoryAccuracy,
  TestResult,
  // Extraction (Iteration 1)
  ExtractionResult,
  Extractor,
  ExtractionTestCase,
  ExtractionTestResult,
  // Intent (Iteration 3 & 4)
  Intent,
  IntentResult,
  IntentProcessor,
  IntentTestCase,
  RecordMatchCriteria,
} from './types'

// Schemas (for advanced use cases)
export { ClassificationOutputSchema, ExtractionOutputSchema } from './schemas'
export type { ClassificationOutput, ExtractionOutput } from './schemas'
