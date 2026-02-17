---
title: Core Concepts
description: Understanding schemas, intent detection, extraction, and consolidation
---

This guide explains the core concepts behind Recall Structured and how they work together to create a powerful memory system.

## Schemas

A **schema** defines a type of data you want to track. It has two parts:

### Description

The description tells the LLM what this data type represents. This is crucial for accurate classification.

```typescript
{
  description: 'Financial transactions and payments made by the user to other people or businesses',
}
```

When a user says "Paid Jayden $150", the LLM uses these descriptions to decide which schema matches.

:::tip[Writing Good Descriptions]

- Be specific about what this data represents
- Include examples of what would match
- Mention what wouldn't match to reduce false positives

**Good**: "Exercise sessions and physical fitness activities completed by the user, including running, weight training, yoga, and sports"

**Bad**: "Workouts"
:::

### Zod Schema

The schema defines the fields and their types using [Zod](https://zod.dev):

```typescript
{
  schema: z.object({
    recipient: z.string().describe('Who was paid (person or business)'),
    amount: z.number().describe('Amount paid in dollars'),
    description: z.string().optional().describe('What the payment was for'),
    date: z.string().optional().describe('When the payment was made'),
  }),
}
```

Field descriptions help the LLM extract the right values:

| User Input         | Field Descriptions                        | Extracted                     |
| ------------------ | ----------------------------------------- | ----------------------------- |
| "Paid Jayden $150" | `recipient: 'Who was paid'`               | `{ recipient: 'Jayden' }`     |
| "for training"     | `description: 'What the payment was for'` | `{ description: 'training' }` |

### Required vs Optional Fields

```typescript
z.object({
  recipient: z.string(), // Required - extraction fails without it
  amount: z.number(), // Required
  description: z.string().optional(), // Optional - can be omitted
  date: z.string().optional(), // Optional
})
```

If a required field can't be extracted, the operation fails with validation error.

---

## Intent Detection

When you call `process()`, the first step is **intent detection**. The LLM analyzes the user's message to determine:

1. **Does this match a schema?** — Is the user talking about trackable data?
2. **What's the intent?** — Insert, update, delete, or query?

### Intent Types

| Intent   | Example                       | Description          |
| -------- | ----------------------------- | -------------------- |
| `insert` | "Paid Jayden $150"            | Add new data         |
| `update` | "Change that to $200"         | Modify existing data |
| `delete` | "Remove my last workout"      | Delete data          |
| `query`  | "How much have I paid total?" | Ask a question       |
| `none`   | "Hello, how are you?"         | Not structured data  |

### How Intent Detection Works

The LLM receives:

- The user's message
- All schema descriptions
- The current date/time (for interpreting "today", "last week", etc.)

It outputs:

- Which schema matches (if any)
- The detected intent
- Confidence score
- Extracted data or match criteria

```typescript
// Input: "Paid Jayden $150 for training"

// LLM Output:
{
  matched: true,
  schema: 'payments',
  intent: 'insert',
  confidence: 0.95,
  data: {
    recipient: 'Jayden',
    amount: 150,
    description: 'training'
  }
}
```

---

## Extraction

**Extraction** is the process of parsing structured field values from natural language.

### The Challenge

Human language is messy:

```
"Paid Jayden a hundred fifty bucks for the MMA session yesterday"
```

The LLM needs to extract:

- `recipient`: "Jayden" (not "the MMA session")
- `amount`: 150 (from "a hundred fifty bucks")
- `description`: "MMA session"
- `date`: Yesterday's date

### How Extraction Works

The LLM uses:

1. **Field names and descriptions** from your schema
2. **Context clues** from the sentence structure
3. **Type information** (string vs number)

```typescript
// Schema definition
z.object({
  recipient: z.string().describe('Who was paid (person or business)'),
  amount: z.number().describe('Amount paid in dollars'),
  description: z.string().optional().describe('What the payment was for'),
})

// User input: "Paid Jayden $150 for training"

// Extraction result:
{
  recipient: 'Jayden',      // Matched "Who was paid"
  amount: 150,              // Parsed "$150" as number
  description: 'training',  // Matched "What the payment was for"
}
```

### Validation

After extraction, the data is validated against your Zod schema:

```typescript
const validationResult = schema.safeParse(extractedData)

if (!validationResult.success) {
  // Return error with missing/invalid fields
  return {
    matched: false,
    reason: 'Required field "amount" is missing',
  }
}
```

This ensures data integrity—invalid data never reaches your database.

---

## Storage

Validated data is stored in SQLite tables that Recall Structured creates automatically.

### Table Structure

For each schema, a table is created:

```sql
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- `id` — UUID generated for each record
- `user_id` — Scopes data per user
- Schema fields — Your defined fields
- `created_at`, `updated_at` — Automatic timestamps

### User Isolation

All queries are scoped by `user_id`:

```typescript
// User A's data is separate from User B's
await memory.process('Paid $100', { userId: 'user_a' }) // Stored for user_a
await memory.process('Paid $200', { userId: 'user_b' }) // Stored for user_b

await memory.list('payments', { userId: 'user_a' }) // Only user_a's payments
```

---

## Consolidation

**Consolidation** is how Recall Structured handles updates and deletes—operations that need to find existing records first.

### The Problem

When a user says "Change that payment to $200", we need to:

1. **Find** the payment they're referring to
2. **Update** it with the new amount

But how do we know which payment? The user might have multiple.

### Match Criteria

During intent detection, the LLM extracts **match criteria**:

```typescript
// User: "Update my payment to Jayden to $200"

// Intent result:
{
  intent: 'update',
  schema: 'payments',
  matchCriteria: {
    field: 'recipient',
    value: 'Jayden',
  },
  updateData: {
    amount: 200,
  },
}
```

Or for recency:

```typescript
// User: "Delete my last workout"

// Intent result:
{
  intent: 'delete',
  schema: 'workouts',
  matchCriteria: {
    recency: 'most_recent',
  },
}
```

### Finding Records

The system uses match criteria to find records:

```typescript
// By field value
const record = store.findByField('payments', userId, 'recipient', 'Jayden')

// By recency
const record = store.getMostRecent('workouts', userId)
```

### Multi-hop Agent

For complex operations, a single-hop approach isn't enough. Consider:

```
"Update my last payment to Jayden to $200"
```

This requires:

1. List payments to Jayden
2. Find the most recent one
3. Update the amount

Recall Structured uses a **multi-hop agent** that can make multiple tool calls to accomplish this. See [Multi-hop Agent](/structured/agent) for details.

---

## Queries

The query system converts natural language questions into SQL.

### How Queries Work

```typescript
const result = await memory.query('How much have I paid Jayden total?', { userId: 'user_123' })
```

The LLM generates SQL:

```sql
SELECT SUM(amount) as total
FROM payments
WHERE user_id = 'user_123'
AND recipient = 'Jayden'
```

And returns the computed result:

```typescript
{
  sql: "SELECT SUM(amount) as total FROM payments WHERE ...",
  result: 250,  // The actual answer
  explanation: "Sum of all payments to Jayden"
}
```

### Query Capabilities

| Question Type        | SQL Generated            |
| -------------------- | ------------------------ |
| "How much total?"    | `SELECT SUM(amount)`     |
| "How many workouts?" | `SELECT COUNT(*)`        |
| "What's my average?" | `SELECT AVG(amount)`     |
| "List all payments"  | `SELECT * FROM payments` |
| "Payments this week" | `WHERE date >= '...'`    |

### Query vs Process

Use **`query()`** for questions:

```typescript
await memory.query('How much did I pay?', { userId })
```

Use **`process()`** for operations:

```typescript
await memory.process('Paid $100 to Jayden', { userId })
```

---

## The Complete Flow

Here's how everything fits together:

```
User Message: "Paid Jayden $150 for MMA training"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                 INTENT DETECTION                             │
│  • Match against schema descriptions                         │
│  • Detect intent: INSERT                                     │
│  • Confidence: 95%                                           │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXTRACTION                                │
│  • Parse fields from natural language                        │
│  • recipient: "Jayden"                                       │
│  • amount: 150                                               │
│  • description: "MMA training"                               │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    VALIDATION                                │
│  • Validate against Zod schema                               │
│  • All required fields present ✓                             │
│  • Types correct ✓                                           │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                     STORAGE                                  │
│  • Generate UUID                                             │
│  • Insert into SQLite                                        │
│  • Call onInsert handler (if defined)                        │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                     RESULT                                   │
│  { matched: true, action: 'insert', id: '...', data: {...}} │
└─────────────────────────────────────────────────────────────┘
```

## Next Steps

- **[Multi-hop Agent](/structured/agent)** — How complex update/delete operations work
- **[API Reference](/structured/api)** — Full API documentation
