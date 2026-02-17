---
title: Core Concepts
description: How memory works in AI applications
---

This guide explains how AI memory systems work, from the ground up. By the end, you'll understand exactly what happens when Recall extracts, stores, and retrieves memories.

## The Problem: AI Has No Memory

Large Language Models (LLMs) like GPT or Claude are stateless. Every request starts fresh—they don't remember previous conversations.

```typescript
// First request
await chat('My name is Sarah')
// AI: "Nice to meet you, Sarah!"

// Second request (new conversation)
await chat('What is my name?')
// AI: "I don't know your name. You haven't told me."
```

The AI forgot. It processes each request independently.

### The Naive Solution: Send Everything

You could send the entire conversation history with every request:

```typescript
const messages = [
  { role: 'user', content: 'My name is Sarah' },
  { role: 'assistant', content: 'Nice to meet you, Sarah!' },
  { role: 'user', content: 'I work at Acme Corp' },
  { role: 'assistant', content: 'Cool! What do you do there?' },
  // ... 100 more messages
  { role: 'user', content: 'What is my name?' },
]

await chat(messages) // Send everything
```

This works, but has problems:

1. **Token limits** — LLMs have context windows (8K-128K tokens). Long conversations get truncated.
2. **Cost** — You pay per token. Sending 10,000 tokens every request gets expensive.
3. **Noise** — Most of the conversation is irrelevant to the current question.
4. **Cross-session** — What about facts from last week's conversation?

### The Solution: Extract and Retrieve

Instead of sending everything, extract the important facts and retrieve only what's relevant:

```
Conversation                    Extracted Facts
─────────────                   ─────────────────
"My name is Sarah"          →   "User's name is Sarah"
"I work at Acme Corp"       →   "User works at Acme Corp"
"I love TypeScript"         →   "User loves TypeScript"
```

Later, when the user asks "What programming languages do I like?", you retrieve just the relevant fact:

```
Query: "What programming languages do I like?"
    ↓
Retrieved: "User loves TypeScript"
    ↓
AI Response: "You mentioned you love TypeScript!"
```

This is what Recall does. Let's break down each step.

---

## Step 1: Extraction

**Extraction** is the process of identifying important facts from a conversation.

### How It Works

An LLM reads the conversation and outputs structured facts:

```typescript
// Input conversation
const conversation = `
User: Hey! I just moved to Seattle last month.
Assistant: Welcome to Seattle! How are you finding it?
User: Love it! The coffee culture is amazing.
`

// Recall extracts facts
const facts = await memory.extract(conversation, { userId: 'sarah_123' })[
  // Output
  ({ content: 'User moved to Seattle last month' },
  { content: "User loves Seattle's coffee culture" })
]
```

### What Gets Extracted?

The extractor is prompted to identify:

- **Personal facts** — Name, location, job, preferences
- **Stated opinions** — Likes, dislikes, beliefs
- **Important context** — Projects, goals, relationships
- **Corrections** — "Actually, I meant..." updates previous facts

The extractor ignores:

- Greetings and small talk
- Questions the user asks
- The AI's responses (unless they confirm facts)

### The Prompt Behind Extraction

Under the hood, Recall sends something like this to the LLM:

```
You are a fact extractor. Given a conversation, identify important
facts about the user that would be useful to remember for future
conversations.

Output facts in third person: "User likes coffee" not "I like coffee"

Conversation:
{conversation}

Extract facts:
```

The LLM returns structured JSON that Recall parses and stores.

---

## Step 2: Embeddings

Once we have facts, we need to store them in a way that makes retrieval fast. This is where **embeddings** come in.

### What Are Embeddings?

An embedding is a list of numbers (a vector) that represents the meaning of text:

```typescript
embed('User loves coffee')
// → [0.023, -0.041, 0.089, ..., 0.012]  (1536 numbers)

embed('User enjoys drinking coffee')
// → [0.025, -0.039, 0.091, ..., 0.014]  (similar numbers!)

embed('User has a red car')
// → [-0.082, 0.056, -0.033, ..., 0.098]  (very different numbers)
```

Similar meanings produce similar vectors. Different meanings produce different vectors.

### Why Embeddings Matter

Embeddings let us find relevant memories without exact keyword matching:

```
Query: "What does the user like to drink?"
Query embedding: [0.021, -0.038, 0.085, ...]

Stored memories:
├─ "User loves coffee"        → similarity: 0.89 ✓ High match!
├─ "User works at Acme Corp"  → similarity: 0.12
└─ "User moved to Seattle"    → similarity: 0.23
```

The query doesn't contain "coffee", but the embedding captures that "drink" and "coffee" are semantically related.

### How Recall Uses Embeddings

When you extract a fact, Recall:

1. Generates an embedding for the fact
2. Stores both the text and embedding in your database

```typescript
// What gets stored
{
  content: "User loves coffee",
  embedding: [0.023, -0.041, 0.089, ...],  // 1536 floats
  userId: "sarah_123",
  createdAt: "2024-01-15T10:30:00Z"
}
```

---

## Step 3: Retrieval

**Retrieval** finds relevant memories for a given query using vector similarity.

### Vector Similarity

Given two embeddings, we can calculate how similar they are using **cosine similarity**:

```
similarity(A, B) = (A · B) / (|A| × |B|)
```

This returns a value between -1 and 1:

- **1.0** = Identical meaning
- **0.5+** = Related
- **~0** = Unrelated
- **-1.0** = Opposite meaning

### How Query Works

```typescript
const memories = await memory.query('What does the user drink?', {
  userId: 'sarah_123',
  limit: 5,
})
```

Under the hood:

1. **Embed the query** — Convert "What does the user drink?" to a vector
2. **Search the database** — Find stored embeddings closest to the query embedding
3. **Return top matches** — Sort by similarity, return the top N

```
Query embedding: [0.021, -0.038, 0.085, ...]
    ↓
Database search (cosine similarity)
    ↓
Results:
1. "User loves coffee"        (0.89)
2. "User prefers tea at night" (0.76)
3. "User is vegetarian"       (0.34)
4. "User lives in Seattle"    (0.21)
5. "User works at Acme"       (0.18)
    ↓
Return top 5 (or filtered by threshold)
```

### Setting a Threshold

You can filter out low-relevance results:

```typescript
const memories = await memory.query('coffee preferences', {
  userId: 'sarah_123',
  limit: 10,
  threshold: 0.5, // Only return if similarity > 0.5
})
```

---

## Step 4: Consolidation

**Consolidation** prevents duplicate and outdated memories.

### The Problem

Without consolidation, you'd end up with:

```
Memory 1: "User's name is John"
Memory 2: "User's name is John"           ← Duplicate!
Memory 3: "User's name is John Smith"     ← Should update, not add
Memory 4: "User's name is John"           ← Another duplicate
```

### How Consolidation Works

When extracting a new fact, Recall:

1. **Finds similar existing memories** using vector search
2. **Asks the LLM to decide** what to do:
   - `ADD` — New fact, store it
   - `UPDATE` — Similar fact exists, update it
   - `DELETE` — Fact contradicts/invalidates existing memory
   - `NONE` — Fact already exists, skip it

### Example

```typescript
// Existing memory
"User's name is John"

// New extraction
"User's full name is John Doe"

// Consolidation decision
{
  action: "UPDATE",
  id: "existing_memory_id",
  content: "User's name is John Doe"
}
```

The old memory is updated, not duplicated.

### The Consolidation Prompt

Recall asks the LLM something like:

```
You are deciding how to handle a new fact given existing memories.

New fact: "User's name is John Doe"

Existing similar memories:
1. "User's name is John"

Decide:
- ADD: If this is genuinely new information
- UPDATE [id]: If this updates/expands an existing memory
- DELETE [id]: If this contradicts an existing memory
- NONE: If this is already captured

Decision:
```

---

## Step 5: Injection

**Injection** adds relevant memories to the AI's context before generating a response.

### Manual Injection

Without the AI SDK wrapper, you inject manually:

```typescript
// Query relevant memories
const memories = await memory.query(userMessage, { userId })

// Format as context
const context = memories.map(m => `- ${m.content}`).join('\n')

// Add to system prompt
const systemPrompt = `
You are a helpful assistant.

Things you know about this user:
${context}
`

// Generate response
await generateText({
  model: openai('gpt-5-nano'),
  system: systemPrompt,
  prompt: userMessage,
})
```

### Automatic Injection with Recall

The `@youcraft/recall-ai-sdk` wrapper does this automatically:

```typescript
const recall = createRecall({ memory })

// Memories are queried and injected automatically
await generateText({
  model: recall(openai('gpt-5-nano'), { userId }),
  prompt: userMessage,
})
```

The wrapper:

1. Intercepts the request
2. Queries memories based on the user's message
3. Injects them into the system prompt as a `<memories>` block
4. Forwards to the actual model

---

## The Complete Lifecycle

Here's how it all fits together:

```
┌─────────────────────────────────────────────────────────────────┐
│                     User sends message                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    1. RETRIEVE                                  │
│    • Embed the user's message                                   │
│    • Search for similar memories                                │
│    • Return top matches                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    2. INJECT                                    │
│    • Format memories as context                                 │
│    • Add to system prompt                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    3. GENERATE                                  │
│    • LLM generates response with memory context                 │
│    • Stream response to user                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    4. EXTRACT                                   │
│    • Identify new facts from conversation                       │
│    • Generate embeddings                                        │
│    • Consolidate with existing memories                         │
│    • Store in database                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Memories ready for next conversation               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Takeaways

1. **LLMs are stateless** — They don't remember between requests
2. **Extraction** — Use an LLM to identify important facts from conversations
3. **Embeddings** — Convert text to vectors for semantic similarity search
4. **Retrieval** — Find relevant memories using vector similarity
5. **Consolidation** — Prevent duplicates by deciding ADD/UPDATE/DELETE/NONE
6. **Injection** — Add relevant memories to the prompt before generating

Recall handles all of this with two simple APIs:

```typescript
// Extract and store (with consolidation)
await memory.extract(conversation, { userId })

// Retrieve relevant memories
await memory.query(question, { userId })
```

Or even simpler with the AI SDK wrapper:

```typescript
const recall = createRecall({ memory, onExtract })

// Everything happens automatically
generateText({
  model: recall(openai('gpt-5-nano'), { userId }),
  prompt: userMessage,
})
```

## Next Steps

- **[Quickstart](/quickstart)** — Build a memory-enabled chatbot
- **[AI SDK Integration](/integrations/ai-sdk)** — Deep dive into the wrapper
