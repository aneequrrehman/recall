---
title: Packages
description: All Recall packages and what they do
---

Recall is modular by design. The core package handles memory operations, while adapters and providers can be swapped based on your stack.

## Core

The foundation of Recall. Provides the memory API for extracting, storing, and querying memories.

| Package            | Description                                         |
| ------------------ | --------------------------------------------------- |
| `@youcraft/recall` | Memory API with extract, query, and CRUD operations |

```bash
npm install @youcraft/recall
```

## Extractors

Extractors identify important facts from conversations using LLMs. They also handle consolidation—deciding whether to ADD, UPDATE, DELETE, or ignore a new fact based on existing memories.

| Package                                | Description             |
| -------------------------------------- | ----------------------- |
| `@youcraft/recall-extractor-openai`    | OpenAI GPT models       |
| `@youcraft/recall-extractor-anthropic` | Anthropic Claude models |

See [Extractors](/extractors) for installation, usage, and how to build custom extractors.

## Embeddings Providers

Embeddings providers convert text into vectors for semantic similarity search. When you extract a memory or run a query, the embeddings provider generates vectors that capture the meaning of the text.

| Package                              | Description                         |
| ------------------------------------ | ----------------------------------- |
| `@youcraft/recall-embeddings-openai` | OpenAI text-embedding-3-small/large |
| `@youcraft/recall-embeddings-cohere` | Cohere embed-v3.0 models            |

See [Embeddings](/embeddings) for installation, usage, and how to build custom providers.

## Database Adapters

Database adapters handle where memories are stored. Each adapter implements the same interface, so you can switch databases without changing your application code.

| Package                               | Description                |
| ------------------------------------- | -------------------------- |
| `@youcraft/recall-adapter-sqlite`     | SQLite with better-sqlite3 |
| `@youcraft/recall-adapter-postgresql` | PostgreSQL with pg driver  |
| `@youcraft/recall-adapter-mysql`      | MySQL with mysql2 driver   |

See [Database Adapters](/database-adapters) for installation, usage, and how to build custom adapters.

## Integrations

Integrations connect Recall with AI frameworks, handling memory injection and extraction automatically.

| Package                       | Description                                            |
| ----------------------------- | ------------------------------------------------------ |
| `@youcraft/recall-ai-sdk`     | Vercel AI SDK wrapper                                  |
| `@youcraft/recall-mcp`        | MCP tool definitions for custom servers                |
| `@youcraft/recall-mcp-server` | Standalone MCP server for Claude Desktop, Cursor, etc. |

See the integration guides:

- [Vercel AI SDK](/integrations/ai-sdk)
- [MCP Tools](/integrations/mcp)
- [MCP Server](/integrations/mcp-server)

## Quick Start Installation

For a typical setup with OpenAI and SQLite:

```bash
npm install @youcraft/recall \
  @youcraft/recall-adapter-sqlite \
  @youcraft/recall-embeddings-openai \
  @youcraft/recall-extractor-openai
```

Add the AI SDK integration if using Vercel AI SDK:

```bash
npm install @youcraft/recall-ai-sdk
```
