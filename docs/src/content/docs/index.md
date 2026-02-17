---
title: Introduction
description: Memory infrastructure for AI apps
---

**Recall** is memory infrastructure for AI apps that combines semantic search with record-based storage — so AI can actually run computations on what it remembers.

## The Problem

Existing memory solutions (graph + vector databases) handle relationships and fuzzy recall well, but you can't compute on them. Ask "how much have I spent on groceries this month?" and the LLM will hallucinate a number.

Recall adds **structured, record-based memory** alongside semantic memory. This unlocks precise aggregations — sums, averages, filters, counts — that LLMs otherwise get wrong.

## Two Memory Systems

|               | Semantic Memory             | Structured Memory                      |
| ------------- | --------------------------- | -------------------------------------- |
| **Best for**  | Facts, preferences, context | Trackable data, logs, records          |
| **Storage**   | Embeddings + vector search  | Schema-defined tables                  |
| **Retrieval** | "What does the user like?"  | "Sum all payments to Jayden"           |
| **Example**   | "User prefers dark mode"    | `{ recipient: "Jayden", amount: 150 }` |

Both systems run in your existing database. Zero vendor lock-in.

## Why Recall?

Building AI memory is harder than it looks:

- **Extraction** — What facts should be remembered from a conversation?
- **Deduplication** — How do you avoid storing "User likes coffee" 50 times?
- **Retrieval** — How do you find relevant memories without loading everything?
- **Computation** — How do you answer "how much?" or "how many?" accurately?
- **Infrastructure** — Where do you store this? Another service to manage?

Recall handles all of this. Semantic memory for fuzzy recall, structured memory for precise queries — both running in your existing database.

## Key Features

- **Two memory systems** — Semantic for fuzzy recall, structured for precise computation
- **LLM-powered extraction** — Automatically identify facts from conversations
- **Smart consolidation** — Deduplicate with ADD/UPDATE/DELETE decisions
- **Schema-based storage** — Define Zod schemas, get automatic SQL queries
- **Pluggable architecture** — Swap databases, embeddings, and extractors
- **Zero lock-in** — All data stays in your existing infrastructure

## Packages

Recall is modular. Combine packages based on your stack:

| Category          | Available                                           |
| ----------------- | --------------------------------------------------- |
| Core              | `@youcraft/recall` (semantic memory)                |
| Structured        | `@youcraft/recall-structured` (record-based memory) |
| Database Adapters | SQLite, PostgreSQL, MySQL                           |
| Embeddings        | OpenAI, Cohere                                      |
| Extractors        | OpenAI, Anthropic                                   |
| Integrations      | Vercel AI SDK, MCP Server, MCP Tools                |

See [Packages](/packages) for installation and details.

## Get Started

- **[Overview](/overview)** — See how Recall works with code examples
- **[Quickstart](/quickstart)** — Build a memory-enabled chatbot in 5 minutes
- **[Core Concepts](/concepts)** — Learn how AI memory systems work
- **[Structured Memory](/structured)** — Schema-based memory with precise queries
