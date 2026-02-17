---
title: Quickstart
description: Set up structured memory in 5 minutes
---

This guide walks you through setting up Recall Structured to track payments, workouts, or any structured data in your AI application.

## Installation

```bash
npm install @youcraft/recall-structured better-sqlite3 zod
```

You'll also need an LLM provider. We'll use OpenAI:

```bash
npm install openai
```

## Define Your Schemas

First, define what data you want to track. Each schema has:

- A **description** — Helps the LLM understand what this data type is for
- A **Zod schema** — Defines the fields and their types

```typescript
import { z } from 'zod'

const schemas = {
  payments: {
    description: 'Financial transactions and payments made by the user',
    schema: z.object({
      recipient: z.string().describe('Who was paid'),
      amount: z.number().describe('Amount in dollars'),
      description: z.string().optional().describe('What the payment was for'),
      date: z.string().optional().describe('When the payment was made'),
    }),
  },

  workouts: {
    description: 'Exercise sessions completed by the user',
    schema: z.object({
      type: z.string().describe('Type of exercise (running, weights, yoga, etc)'),
      duration: z.number().optional().describe('Duration in minutes'),
      calories: z.number().optional().describe('Calories burned'),
      date: z.string().optional().describe('When the workout occurred'),
    }),
  },
}
```

:::tip[Schema Descriptions Matter]
The `description` field is used by the LLM to decide if user input matches this schema. Be specific!

**Good**: "Financial transactions and payments made by the user to other people or businesses"

**Bad**: "Money stuff"
:::

## Create the Memory Client

```typescript
import { createStructuredMemory } from '@youcraft/recall-structured'

const memory = createStructuredMemory({
  db: 'memory.db', // SQLite file path
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-5-nano', // Optional, defaults to gpt-5-nano
  },
  schemas,
})
```

## Process User Messages

The `process()` method handles everything:

```typescript
const result = await memory.process('Paid Jayden $150 for MMA training', { userId: 'user_123' })

console.log(result)
// {
//   matched: true,
//   schema: 'payments',
//   action: 'insert',
//   id: 'abc123',
//   data: { recipient: 'Jayden', amount: 150, description: 'MMA training' },
//   confidence: 0.95
// }
```

The LLM automatically:

1. Detected this is a payment (not a workout)
2. Extracted the fields (recipient, amount, description)
3. Stored it in SQLite

## Query Your Data

Ask questions in natural language:

```typescript
const result = await memory.query('How much have I paid Jayden total?', { userId: 'user_123' })

console.log(result)
// {
//   sql: "SELECT SUM(amount) FROM payments WHERE user_id = 'user_123' AND recipient = 'Jayden'",
//   result: 150,
//   explanation: "Sum of all payments to Jayden"
// }
```

## Handle Updates and Deletes

The system detects intent automatically:

```typescript
// Update
await memory.process('Actually, change that to $200', { userId: 'user_123' })
// → { action: 'update', ... }

// Delete
await memory.process('Delete my last payment', { userId: 'user_123' })
// → { action: 'delete', ... }
```

## Full Example

Here's a complete example with an Express server:

```typescript
import express from 'express'
import { createStructuredMemory } from '@youcraft/recall-structured'
import { z } from 'zod'

const app = express()
app.use(express.json())

// Define schemas
const schemas = {
  payments: {
    description: 'Financial transactions made by the user',
    schema: z.object({
      recipient: z.string().describe('Who was paid'),
      amount: z.number().describe('Amount in dollars'),
      description: z.string().optional(),
    }),
  },
}

// Create memory client
const memory = createStructuredMemory({
  db: 'memory.db',
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
  },
  schemas,
})

// Process messages
app.post('/chat', async (req, res) => {
  const { message, userId } = req.body

  // Process for structured data
  const result = await memory.process(message, { userId })

  if (result.matched) {
    res.json({
      response: `Got it! Recorded ${result.action} for ${result.schema}.`,
      data: result,
    })
  } else {
    res.json({
      response: "I didn't detect any trackable data in your message.",
      reason: result.reason,
    })
  }
})

// Query data
app.post('/query', async (req, res) => {
  const { question, userId } = req.body

  const result = await memory.query(question, { userId })

  res.json({
    answer: result.result,
    sql: result.sql,
  })
})

app.listen(3000)
```

## Adding Handlers

React to data changes with handlers:

```typescript
const memory = createStructuredMemory({
  db: 'memory.db',
  llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY },
  schemas,
  handlers: {
    payments: {
      onInsert: async (data, ctx) => {
        console.log(`New payment: $${data.amount} to ${data.recipient}`)
        // Sync to external database, send notification, etc.
      },
      onUpdate: async (id, data, ctx) => {
        console.log(`Updated payment ${id}:`, data)
      },
      onDelete: async (id, ctx) => {
        console.log(`Deleted payment ${id}`)
      },
    },
  },
})
```

## Next Steps

- **[Core Concepts](/structured/concepts)** — Understand how extraction and consolidation work
- **[Multi-hop Agent](/structured/agent)** — Learn about complex update/delete operations
- **[API Reference](/structured/api)** — Full API documentation
