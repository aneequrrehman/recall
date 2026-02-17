---
title: API Reference
description: Complete API documentation for @youcraft/recall-structured
---

## Installation

```bash
npm install @youcraft/recall-structured better-sqlite3 zod
```

Peer dependencies:

- `better-sqlite3` — SQLite database
- `zod` — Schema validation
- `openai` — LLM provider (for extraction)
- `ai` — AI SDK v6 (for multi-hop agent, optional)

---

## createStructuredMemory()

Creates a structured memory client.

```typescript
import { createStructuredMemory } from '@youcraft/recall-structured'

const memory = createStructuredMemory(config)
```

### Config

| Property   | Type         | Required | Description               |
| ---------- | ------------ | -------- | ------------------------- |
| `db`       | `string`     | Yes      | SQLite database file path |
| `llm`      | `LLMConfig`  | Yes      | LLM configuration         |
| `schemas`  | `SchemaMap`  | Yes      | Schema definitions        |
| `handlers` | `HandlerMap` | No       | Event handlers            |

### LLMConfig

```typescript
interface LLMConfig {
  provider: 'openai'
  apiKey: string
  model?: string // Default: 'gpt-5-nano'
}
```

### SchemaMap

```typescript
interface SchemaMap {
  [name: string]: {
    description: string
    schema: z.ZodObject<any>
  }
}
```

### HandlerMap

```typescript
interface HandlerMap {
  [schemaName: string]: {
    onInsert?: (data: any, ctx: HandlerContext) => Promise<void>
    onUpdate?: (id: string, data: any, ctx: HandlerContext) => Promise<void>
    onDelete?: (id: string, ctx: HandlerContext) => Promise<void>
  }
}

interface HandlerContext {
  userId: string
  schema: string
  input: string
  confidence: number
  reason: string
}
```

### Example

```typescript
const memory = createStructuredMemory({
  db: 'memory.db',
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-5-nano',
  },
  schemas: {
    payments: {
      description: 'Financial transactions',
      schema: z.object({
        recipient: z.string(),
        amount: z.number(),
      }),
    },
  },
  handlers: {
    payments: {
      onInsert: async (data, ctx) => {
        console.log('New payment:', data)
      },
    },
  },
})
```

---

## StructuredMemoryClient

The client returned by `createStructuredMemory()`.

### process()

Process a user message for structured data operations.

```typescript
const result = await memory.process(input, options)
```

**Parameters:**

| Name             | Type     | Description                        |
| ---------------- | -------- | ---------------------------------- |
| `input`          | `string` | User message to process            |
| `options.userId` | `string` | User ID for data scoping           |
| `options.date`   | `string` | Optional date context (ISO string) |

**Returns:** `ProcessResult`

```typescript
// Insert result
{
  matched: true,
  schema: 'payments',
  action: 'insert',
  id: 'uuid',
  data: { recipient: 'Jayden', amount: 150 },
  confidence: 0.95,
  handlerCalled: true,
}

// Query result
{
  matched: true,
  schema: 'payments',
  action: 'query',
  question: 'How much total?',
  sql: 'SELECT SUM(amount)...',
  result: 250,
  explanation: 'Sum of all payments',
  confidence: 0.92,
}

// Update result
{
  matched: true,
  schema: 'payments',
  action: 'update',
  id: 'uuid',
  data: { amount: 200 },
  confidence: 0.90,
  handlerCalled: true,
}

// Delete result
{
  matched: true,
  schema: 'payments',
  action: 'delete',
  id: 'uuid',
  confidence: 0.88,
  handlerCalled: true,
}

// Not matched
{
  matched: false,
  reason: 'No schema matched the input',
}
```

### query()

Execute a natural language query.

```typescript
const result = await memory.query(question, options)
```

**Parameters:**

| Name             | Type     | Description               |
| ---------------- | -------- | ------------------------- |
| `question`       | `string` | Natural language question |
| `options.userId` | `string` | User ID for data scoping  |

**Returns:** `QueryResult`

```typescript
{
  sql: 'SELECT SUM(amount) FROM payments WHERE user_id = ?',
  result: 250,
  explanation: 'Sum of all payments for the user',
}
```

### list()

List records from a schema.

```typescript
const records = await memory.list(schema, options)
```

**Parameters:**

| Name             | Type     | Description                |
| ---------------- | -------- | -------------------------- |
| `schema`         | `string` | Schema name                |
| `options.userId` | `string` | User ID                    |
| `options.limit`  | `number` | Max records (default: 100) |
| `options.offset` | `number` | Skip records (default: 0)  |

**Returns:** Array of records with base fields (`id`, `user_id`, `created_at`, `updated_at`).

### get()

Get a single record by ID.

```typescript
const record = await memory.get(schema, id)
```

**Returns:** Record or `null`.

### update()

Update a record directly (bypasses LLM).

```typescript
const updated = await memory.update(schema, id, data)
```

**Parameters:**

| Name     | Type         | Description      |
| -------- | ------------ | ---------------- |
| `schema` | `string`     | Schema name      |
| `id`     | `string`     | Record ID        |
| `data`   | `Partial<T>` | Fields to update |

**Returns:** Updated record.

**Throws:** `RecordNotFoundError` if record doesn't exist.

### delete()

Delete a record directly (bypasses LLM).

```typescript
await memory.delete(schema, id)
```

**Throws:** `RecordNotFoundError` if record doesn't exist.

### getSchemas()

Get schema information.

```typescript
const schemas = memory.getSchemas()
// → [{ name: 'payments', description: '...', columns: [...] }]
```

### close()

Close the database connection.

```typescript
memory.close()
```

---

## createStructuredMemoryAgent()

Creates a multi-hop agent for complex operations.

```typescript
import { createStructuredMemoryAgent } from '@youcraft/recall-structured'

const agent = createStructuredMemoryAgent(config)
```

### Config

| Property  | Type        | Required | Description               |
| --------- | ----------- | -------- | ------------------------- |
| `db`      | `string`    | Yes      | SQLite database file path |
| `schemas` | `SchemaMap` | Yes      | Schema definitions        |

### Example

```typescript
const agent = createStructuredMemoryAgent({
  db: 'memory.db',
  schemas: {
    payments: {
      description: 'Financial transactions',
      schema: z.object({
        recipient: z.string(),
        amount: z.number(),
      }),
    },
  },
})
```

---

## StructuredMemoryAgent

The agent returned by `createStructuredMemoryAgent()`.

### process()

Process a message with multi-hop tool calls.

```typescript
import { openai } from '@ai-sdk/openai'

const result = await agent.process(model, input, options)
```

**Parameters:**

| Name                       | Type               | Description                       |
| -------------------------- | ------------------ | --------------------------------- |
| `model`                    | `LanguageModel`    | AI SDK v6 language model          |
| `input`                    | `string`           | User message                      |
| `options.userId`           | `string`           | User ID                           |
| `options.maxSteps`         | `number`           | Max tool call steps (default: 10) |
| `options.extractedContext` | `ExtractedContext` | Pre-extracted data from Phase 1   |

**ExtractedContext:**

```typescript
interface ExtractedContext {
  schema: string
  intent: 'insert' | 'update' | 'delete' | 'query'
  data?: Record<string, unknown>
  confidence: number
}
```

**Returns:** `AgentProcessResult`

```typescript
{
  text: "Updated your payment to Jayden from $150 to $200",
  steps: 2,
  toolCalls: [
    { toolName: 'searchRecords', input: {...}, output: {...} },
    { toolName: 'updateRecord', input: {...}, output: {...} },
  ],
  dataModified: true,
}
```

### getTools()

Get CRUD tools for a user.

```typescript
const tools = agent.getTools(userId)
```

Returns tools compatible with AI SDK v6's `generateText()` or `streamText()`.

### getSystemPrompt()

Get the agent's system prompt (regenerated with current date/time).

```typescript
const prompt = agent.getSystemPrompt()
```

### getAgentContext()

Get tools and system prompt together.

```typescript
const { tools, systemPrompt, schemaInfo } = agent.getAgentContext(userId)
```

### getSchemas()

Get schema information.

```typescript
const schemas = agent.getSchemas()
```

### close()

Close the database connection.

```typescript
agent.close()
```

---

## Error Classes

### SchemaValidationError

Thrown when data fails Zod validation.

```typescript
import { SchemaValidationError } from '@youcraft/recall-structured'

try {
  await memory.update('payments', id, { amount: 'invalid' })
} catch (e) {
  if (e instanceof SchemaValidationError) {
    console.log(e.schema) // 'payments'
    console.log(e.data) // { amount: 'invalid' }
    console.log(e.error) // ZodError
  }
}
```

### QueryGenerationError

Thrown when a query can't be answered.

```typescript
import { QueryGenerationError } from '@youcraft/recall-structured'

try {
  await memory.query("What's the meaning of life?", { userId })
} catch (e) {
  if (e instanceof QueryGenerationError) {
    console.log(e.question) // "What's the meaning of life?"
    console.log(e.explanation) // "This question cannot be answered..."
  }
}
```

### RecordNotFoundError

Thrown when a record doesn't exist.

```typescript
import { RecordNotFoundError } from '@youcraft/recall-structured'

try {
  await memory.delete('payments', 'nonexistent-id')
} catch (e) {
  if (e instanceof RecordNotFoundError) {
    console.log(e.schema) // 'payments'
    console.log(e.id) // 'nonexistent-id'
  }
}
```

---

## Types

### ProcessResult

```typescript
type ProcessResult =
  | ProcessResultInsert
  | ProcessResultUpdate
  | ProcessResultDelete
  | ProcessResultQuery
  | ProcessResultNotMatched

interface ProcessResultInsert {
  matched: true
  schema: string
  action: 'insert'
  id: string
  data: Record<string, unknown>
  confidence: number
  handlerCalled: boolean
}

interface ProcessResultUpdate {
  matched: true
  schema: string
  action: 'update'
  id: string
  data: Record<string, unknown>
  confidence: number
  handlerCalled: boolean
}

interface ProcessResultDelete {
  matched: true
  schema: string
  action: 'delete'
  id: string
  confidence: number
  handlerCalled: boolean
}

interface ProcessResultQuery {
  matched: true
  schema: string
  action: 'query'
  question: string
  sql: string
  result: unknown
  explanation: string
  confidence: number
}

interface ProcessResultNotMatched {
  matched: false
  reason: string
}
```

### QueryResult

```typescript
interface QueryResult {
  sql: string
  result: unknown
  explanation: string
}
```

### AgentProcessResult

```typescript
interface AgentProcessResult {
  text: string
  steps: number
  toolCalls: Array<{
    toolName: string
    input: unknown
    output: unknown
  }>
  dataModified: boolean
}
```

### SchemaInfo

```typescript
interface SchemaInfo {
  name: string
  description: string
  columns: ColumnInfo[]
}

interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  description?: string
}
```
