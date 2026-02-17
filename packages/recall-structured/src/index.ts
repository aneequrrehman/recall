// Main API
export { createStructuredMemory } from './structured-memory'

// Types
export type {
  // Config
  LLMProvider,
  LLMConfig,
  SchemaDefinition,
  SchemaMap,
  StructuredMemoryConfig,
  // CRUD
  CRUDAction,
  // Handlers (Iteration 2)
  HandlerContext,
  InsertHandler,
  UpdateHandler,
  DeleteHandler,
  SchemaHandlers,
  HandlersMap,
  // Process
  ProcessOptions,
  ProcessResult,
  ProcessResultNotMatched,
  ProcessResultInsert,
  ProcessResultUpdate,
  ProcessResultDelete,
  ProcessResultQuery,
  // Query
  QueryOptions,
  QueryResult,
  // List/Get
  ListOptions,
  BaseRecord,
  RecordWithBase,
  // Schema Info
  SchemaInfo,
  ColumnInfo,
  // Internal (for advanced use)
  QueryGenerator,
  QueryGeneratorResult,
  StructuredStore,
  // Client
  StructuredMemoryClient,
} from './types'

// Error classes
export { SchemaValidationError, QueryGenerationError, RecordNotFoundError } from './types'

// Pure Classification (Iteration 0)
// Separated classification layer for testable accuracy
export { createPureClassifier } from './classification'
export type { CreatePureClassifierConfig } from './classification'
export type { ClassificationResult, PureClassifier, ClassificationOptions } from './classification'

// Extraction (Iteration 1)
// Classification + data extraction
export { createExtractor } from './classification'
export type { CreateExtractorConfig } from './classification'
export type { ExtractionResult, Extractor } from './classification'

// Intent Processing (Iteration 3 & 4)
// Intent detection + extraction/query/update/delete
export { createIntentProcessor } from './classification'
export type { CreateIntentProcessorConfig } from './classification'
export type { Intent, IntentResult, IntentProcessor, RecordMatchCriteria } from './classification'

// Agent (AI SDK v6)
// Multi-hop agent with CRUD tools
export {
  createStructuredMemoryAgent,
  createStructuredMemoryTools,
  STRUCTURED_MEMORY_SYSTEM_PROMPT,
} from './agent'
export type {
  StructuredMemoryAgentConfig,
  StructuredMemoryTools,
  AgentProcessOptions,
  AgentProcessResult,
  AgentContext,
  ExtractedContext,
} from './agent'
