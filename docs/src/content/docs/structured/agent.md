---
title: Multi-hop Agent
description: How complex update and delete operations work with the AI SDK v6 agent
---

Some operations can't be completed in a single step. "Update my last payment to Jayden to $200" requires searching for records, identifying the right one, then updating it. Recall Structured handles this with a **multi-hop agent**.

## Why Multi-hop?

### Single-hop Limitations

A single LLM call can detect intent and extract data, but it can't see your actual data:

```typescript
// User: "Update my last payment to Jayden to $200"

// Single-hop can detect:
{
  intent: 'update',
  schema: 'payments',
  matchCriteria: { field: 'recipient', value: 'Jayden' },
  updateData: { amount: 200 },
}

// But what if there are multiple payments to Jayden?
// The LLM is guessing which one to update!
```

### Multi-hop Solution

With multi-hop, the agent can query your data before acting:

```
Step 1: Agent calls searchRecords({ schema: 'payments', field: 'recipient', value: 'Jayden' })
   → Returns: [
       { id: 'abc', amount: 150, date: 'Dec 5' },
       { id: 'def', amount: 100, date: 'Nov 20' }
     ]

Step 2: Agent identifies the most recent one (id: 'abc')

Step 3: Agent calls updateRecord({ schema: 'payments', id: 'abc', data: { amount: 200 } })
   → Returns: { success: true }

Step 4: Agent responds: "Updated your payment to Jayden from $150 to $200"
```

The agent can see the actual records and make informed decisions.

---

## Two-Phase Architecture

Recall Structured uses a **two-phase architecture** to combine accurate extraction with multi-hop capability:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Phase 1: EXTRACTION                         │
│    • Dedicated LLM call for intent + data extraction            │
│    • High accuracy for parsing natural language                 │
│    • Handles INSERT and QUERY directly                          │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
     ┌─────────┐        ┌──────────┐       ┌───────────────┐
     │ INSERT  │        │  QUERY   │       │ UPDATE/DELETE │
     │ ✓ Done  │        │  ✓ Done  │       │   → Phase 2   │
     └─────────┘        └──────────┘       └───────────────┘
                                                  │
                                                  ▼
                    ┌─────────────────────────────────────────────┐
                    │            Phase 2: AGENT                    │
                    │    • Receives extracted context               │
                    │    • Multi-hop tool calls                     │
                    │    • Search → Identify → Modify               │
                    └─────────────────────────────────────────────┘
```

### Why Two Phases?

**Phase 1 (Extraction)** is optimized for:

- Understanding natural language
- Extracting structured field values
- Classifying intent

**Phase 2 (Agent)** is optimized for:

- Searching and filtering data
- Making decisions based on actual records
- Executing multi-step operations

By separating these concerns, each phase can use the most appropriate approach.

---

## Agent Tools

The agent has access to these tools:

### listSchemas

See available data types:

```typescript
listSchemas()
// → [
//     { name: 'payments', description: '...', fields: ['recipient', 'amount', ...] },
//     { name: 'workouts', description: '...', fields: ['type', 'duration', ...] }
//   ]
```

### listRecords

Get records from a schema:

```typescript
listRecords({ schema: 'payments', limit: 10 })
// → { schema: 'payments', count: 3, records: [...] }
```

### searchRecords

Find records by field value:

```typescript
searchRecords({ schema: 'payments', field: 'recipient', value: 'Jayden' })
// → { schema: 'payments', field: 'recipient', value: 'Jayden', count: 2, records: [...] }
```

### getRecord

Get a specific record by ID:

```typescript
getRecord({ schema: 'payments', id: 'abc123' })
// → { recipient: 'Jayden', amount: 150, ... }
```

### insertRecord

Add a new record:

```typescript
insertRecord({
  schema: 'payments',
  data: { recipient: 'Jayden', amount: 150, description: 'training' },
})
// → { success: true, action: 'inserted', id: 'abc123', data: {...} }
```

### updateRecord

Update an existing record:

```typescript
updateRecord({
  schema: 'payments',
  id: 'abc123',
  data: { amount: 200 },
})
// → { success: true, action: 'updated', id: 'abc123', changes: { amount: 200 } }
```

### deleteRecord

Remove a record:

```typescript
deleteRecord({ schema: 'payments', id: 'abc123' })
// → { success: true, action: 'deleted', id: 'abc123' }
```

---

## Extracted Context

When Phase 2 runs, the agent receives **extracted context** from Phase 1:

```typescript
// Phase 1 extraction result:
{
  schema: 'payments',
  intent: 'update',
  confidence: 0.92,
  data: { amount: 200 },  // The new value
}

// Agent prompt includes:
`
User message: "Update my last payment to Jayden to $200"

## Pre-extracted Information
Schema: payments
Intent: update
Confidence: 92%
Extracted data: { "amount": 200 }

Use this extracted information to perform the update operation.
First search for the matching record, then call updateRecord with the extracted data.
`
```

This gives the agent:

1. **What schema** to work with
2. **What action** to take
3. **What data** to use
4. **Clear instructions** on the approach

---

## Example: Complex Update

Let's trace through "Update my last payment to Jayden to $200":

### Phase 1: Extraction

```typescript
const extraction = await memory.process(message, { userId })

// Result:
{
  matched: true,
  schema: 'payments',
  action: 'update',
  confidence: 0.92,
  data: { amount: 200 },
  // Note: Phase 1 detected update intent but didn't complete it
  // because it needs to search for the right record first
}
```

### Phase 2: Agent Execution

The agent receives the extracted context and makes tool calls:

**Tool Call 1**: Search for Jayden's payments

```typescript
searchRecords({ schema: 'payments', field: 'recipient', value: 'Jayden' })
// → {
//     records: [
//       { id: 'abc', recipient: 'Jayden', amount: 150, date: '2024-12-05' },
//       { id: 'def', recipient: 'Jayden', amount: 100, date: '2024-11-20' }
//     ]
//   }
```

**Tool Call 2**: Update the most recent one

```typescript
updateRecord({ schema: 'payments', id: 'abc', data: { amount: 200 } })
// → { success: true, action: 'updated', id: 'abc' }
```

**Final Response**:

```
"Updated your payment to Jayden from $150 to $200"
```

---

## Using the Agent Directly

You can also use the agent directly for advanced use cases:

```typescript
import { createStructuredMemoryAgent } from '@youcraft/recall-structured'
import { openai } from '@ai-sdk/openai'

const agent = createStructuredMemoryAgent({
  db: 'memory.db',
  schemas,
})

// Process with the agent (multi-hop enabled)
const result = await agent.process(
  openai('gpt-5-nano'),
  'Update my last payment to Jayden to $200',
  {
    userId: 'user_123',
    maxSteps: 10,
    extractedContext: {
      schema: 'payments',
      intent: 'update',
      confidence: 0.92,
      data: { amount: 200 },
    },
  }
)

console.log(result)
// {
//   text: "Updated your payment to Jayden from $150 to $200",
//   steps: 2,
//   toolCalls: [
//     { toolName: 'searchRecords', input: {...}, output: {...} },
//     { toolName: 'updateRecord', input: {...}, output: {...} }
//   ],
//   dataModified: true
// }
```

---

## Agent Configuration

### Max Steps

Control how many tool calls the agent can make:

```typescript
await agent.process(model, message, {
  userId,
  maxSteps: 10, // Default: 10
})
```

More steps allow more complex operations but increase latency and cost.

### System Prompt

The agent's system prompt includes:

- Available schemas and their fields
- Current date and time (for interpreting "today", "last week")
- Instructions for each operation type

You can access it:

```typescript
const systemPrompt = agent.getSystemPrompt()
// Regenerated fresh each call with current date/time
```

---

## Best Practices

### 1. Use Descriptive Field Names

The agent uses field names to understand data:

```typescript
// Good - clear field names
z.object({
  recipient: z.string(), // Agent knows this is who was paid
  amount: z.number(),
})

// Bad - unclear field names
z.object({
  r: z.string(),
  a: z.number(),
})
```

### 2. Keep Schemas Focused

Each schema should represent one type of data:

```typescript
// Good - separate schemas
schemas: {
  payments: { ... },
  workouts: { ... },
}

// Bad - mixed data in one schema
schemas: {
  userStuff: {
    schema: z.object({
      paymentRecipient: z.string().optional(),
      workoutType: z.string().optional(),
      // Confusing for the agent
    }),
  },
}
```

### 3. Handle Agent Results

Check if data was modified:

```typescript
const result = await agent.process(model, message, options)

if (result.dataModified) {
  // Trigger side effects, notifications, etc.
  await syncToExternalDB(result.toolCalls)
}
```

---

## Next Steps

- **[API Reference](/structured/api)** — Full API documentation
- **[Core Concepts](/structured/concepts)** — Deep dive into extraction and validation
