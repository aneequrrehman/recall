---
title: Examples
description: Complete example applications demonstrating Recall in action.
---

We provide several example applications to help you get started with Recall. Each example is a complete, runnable Next.js application that demonstrates different aspects of the memory system.

## Available Examples

| Example                                                      | Memory Type       | Background Jobs | Description                       |
| ------------------------------------------------------------ | ----------------- | --------------- | --------------------------------- |
| [with-inngest](/examples/with-inngest)                       | Recall Core       | Inngest         | Chat app with unstructured memory |
| [with-wdk](/examples/with-wdk)                               | Recall Core       | Vercel WDK      | Chat app with unstructured memory |
| [with-inngest-structured](/examples/with-inngest-structured) | Recall Structured | Inngest         | Chat app with schema-based memory |

## Quick Start

All examples follow the same setup pattern:

```bash
# Clone the repo
git clone https://github.com/youcraftinc/recall.git
cd recall

# Install dependencies
pnpm install

# Navigate to example
cd examples/with-inngest  # or with-wdk, with-inngest-structured

# Set up environment
cp .env.example .env
# Add your OPENAI_API_KEY to .env

# Run the example
pnpm dev
```

## Choosing an Example

### Recall Core Examples

If you want to store **unstructured facts** like user preferences, interests, and general information:

- **[with-inngest](/examples/with-inngest)** — Best for production deployments. Inngest provides reliable background job processing with retries and monitoring.
- **[with-wdk](/examples/with-wdk)** — Best for Vercel deployments. WDK integrates natively with Vercel's infrastructure.

### Recall Structured Example

If you want to store **structured data** with schemas like payments, workouts, or tasks:

- **[with-inngest-structured](/examples/with-inngest-structured)** — Demonstrates schema-based memory with full CRUD operations and multi-hop agent capabilities.

## What Each Example Includes

All examples include:

- Chat interface with streaming responses
- Real-time memory panel showing stored memories
- SQLite database for local persistence
- OpenAI integration for LLM and embeddings

## Source Code

All examples are available in the [examples directory](https://github.com/youcraftinc/recall/tree/main/examples) on GitHub.
