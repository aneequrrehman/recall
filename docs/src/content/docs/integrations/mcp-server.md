---
title: MCP Server
description: Standalone MCP server for Claude Desktop, Cursor, and other clients
---

The `@youcraft/recall-mcp-server` package is a standalone MCP server for Recall. Zero-config memory for Claude Desktop, Cursor, Windsurf, and other MCP clients.

## Installation

```bash
# Run directly with npx
npx @youcraft/recall-mcp-server

# Or install globally
npm install -g @youcraft/recall-mcp-server
```

## Quick Start

### 1. Start the server

```bash
# With SQLite persistence
npx @youcraft/recall-mcp-server --db ./memories.db

# In-memory (ephemeral)
npx @youcraft/recall-mcp-server --db :memory:
```

### 2. Add to Claude Desktop

Edit your Claude Desktop config:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "recall": {
      "command": "npx",
      "args": ["@youcraft/recall-mcp-server", "--db", "/path/to/memories.db"],
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Done. Claude now has persistent memory.

## CLI Options

```bash
npx @youcraft/recall-mcp-server [options]

Options:
  --db <path>           SQLite database path (default: recall.db)
                        Use ":memory:" for in-memory storage
  --openai-key <key>    OpenAI API key (or use OPENAI_API_KEY env var)
  --model <model>       Extraction model (default: gpt-5-nano)
  --embedding <model>   Embedding model (default: text-embedding-3-small)
  --user-id <id>        Default user ID for operations
  --verbose             Enable verbose logging
  --help                Show help
  --version             Show version
```

## Environment Variables

```bash
OPENAI_API_KEY=sk-...                    # Required
RECALL_DB=./memories.db                  # Optional, overrides --db
RECALL_MODEL=gpt-5-nano                 # Optional
RECALL_EMBEDDING_MODEL=text-embedding-3-small  # Optional
RECALL_USER_ID=default                   # Optional
RECALL_VERBOSE=true                      # Optional
```

## Programmatic Usage

```typescript
import { createRecallMCPServer } from '@youcraft/recall-mcp-server'

const server = createRecallMCPServer({
  db: './memories.db',
  openaiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-5-nano',
  embeddingModel: 'text-embedding-3-small',
  userId: 'default',
  verbose: false,
})

await server.start()
```

### With Custom Recall Instance

```typescript
import { createRecallMCPServer } from '@youcraft/recall-mcp-server'
import { createMemory } from '@youcraft/recall'
import { sqliteAdapter } from '@youcraft/recall-adapter-sqlite'
import { openaiEmbeddings } from '@youcraft/recall-embeddings-openai'
import { openaiExtractor } from '@youcraft/recall-extractor-openai'

const memory = createMemory({
  db: sqliteAdapter({ filename: './memories.db' }),
  embeddings: openaiEmbeddings({ apiKey: process.env.OPENAI_API_KEY }),
  extractor: openaiExtractor({ apiKey: process.env.OPENAI_API_KEY }),
})

const server = createRecallMCPServer({
  openaiKey: process.env.OPENAI_API_KEY,
})

// server.memory - the Recall memory instance
// server.handlers - the MCP tool handlers
// server.start() - start the MCP server
// server.close() - stop the server
```

## Client Configurations

### Claude Desktop

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "recall": {
      "command": "npx",
      "args": ["@youcraft/recall-mcp-server", "--db", "/absolute/path/to/memories.db"],
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

### Cursor

Add to Cursor's MCP settings:

```json
{
  "mcpServers": {
    "recall": {
      "command": "npx",
      "args": ["@youcraft/recall-mcp-server", "--db", "~/.cursor/memories.db"],
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

## Available Tools

The server exposes 7 MCP tools:

| Tool            | Description                               |
| --------------- | ----------------------------------------- |
| `recall_add`    | Extract and store memories from text      |
| `recall_query`  | Search memories using semantic similarity |
| `recall_list`   | List all memories with pagination         |
| `recall_get`    | Retrieve a specific memory by ID          |
| `recall_update` | Update an existing memory                 |
| `recall_delete` | Delete a specific memory                  |
| `recall_clear`  | Clear all memories for a user             |

## Example Conversations

### Memory Creation

```
User: I'm a backend engineer at Stripe. I mostly work with Go and PostgreSQL.

Claude: [calls recall_add with the text]
        I'll remember that! You're a backend engineer at Stripe working with
        Go and PostgreSQL.
```

### Memory Retrieval

```
User: Can you help me set up a new database?

Claude: [calls recall_query with "user database preferences tech stack"]

        Since you work with PostgreSQL, I'll help you set that up.
        Would you like me to include any specific extensions?
```

### Memory Correction

```
User: Actually I switched to Vercel last month.

Claude: [calls recall_query to find the Stripe memory]
        [calls recall_update to change "engineer at Stripe" to "engineer at Vercel"]

        Got it, I've updated my memory. You're now at Vercel!
```

## See Also

- [MCP Tools](/integrations/mcp) — Add Recall tools to your own MCP server
- [Packages](/packages) — All available Recall packages
