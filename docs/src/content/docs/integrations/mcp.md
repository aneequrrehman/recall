---
title: MCP Tools
description: Add Recall tools to your existing MCP server
---

The `@youcraft/recall-mcp` package provides MCP tool definitions and handlers for integrating Recall into your own MCP server.

## Installation

```bash
npm install @youcraft/recall-mcp
```

## Basic Usage

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { RECALL_TOOLS, createRecallHandlers } from '@youcraft/recall-mcp'
import { memory } from './your-recall-setup'

const server = new Server({ name: 'my-server', version: '1.0.0' }, { capabilities: { tools: {} } })

const recallHandlers = createRecallHandlers({ memory })

// Register Recall tools alongside your other tools
server.setRequestHandler('tools/list', async () => ({
  tools: [...RECALL_TOOLS, ...myOtherTools],
}))

server.setRequestHandler('tools/call', async request => {
  const { name, arguments: args } = request.params

  // Handle Recall tools
  if (name.startsWith('recall_')) {
    return recallHandlers[name](args)
  }

  // Handle your other tools
  return myOtherHandlers[name](args)
})
```

## Configuration

```typescript
import { createRecallHandlers } from '@youcraft/recall-mcp'
import { createMemory } from '@youcraft/recall'
import { sqliteAdapter } from '@youcraft/recall-adapter-sqlite'
import { openaiEmbeddings } from '@youcraft/recall-embeddings-openai'
import { openaiExtractor } from '@youcraft/recall-extractor-openai'

const memory = createMemory({
  db: sqliteAdapter({ filename: './memories.db' }),
  embeddings: openaiEmbeddings({ apiKey: process.env.OPENAI_API_KEY }),
  extractor: openaiExtractor({ apiKey: process.env.OPENAI_API_KEY }),
})

const handlers = createRecallHandlers({
  memory, // Required: Recall memory instance
  defaultUserId: 'default', // Optional: Default user ID
})
```

## API Reference

### `RECALL_TOOLS`

Array of MCP tool schemas for all 7 Recall tools.

```typescript
import { RECALL_TOOLS } from '@youcraft/recall-mcp'

// RECALL_TOOLS = [
//   { name: 'recall_add', description: '...', inputSchema: {...} },
//   { name: 'recall_query', ... },
//   ...
// ]
```

### `createRecallHandlers(config)`

Creates handler functions for each tool.

```typescript
const handlers = createRecallHandlers({ memory, defaultUserId: 'default' })

// handlers = {
//   recall_add: async (args) => {...},
//   recall_query: async (args) => {...},
//   recall_list: async (args) => {...},
//   recall_get: async (args) => {...},
//   recall_update: async (args) => {...},
//   recall_delete: async (args) => {...},
//   recall_clear: async (args) => {...},
// }
```

### Individual Tool Exports

```typescript
import {
  RECALL_TOOLS,
  createRecallHandlers,
  // Individual tool schemas
  RECALL_ADD_TOOL,
  RECALL_QUERY_TOOL,
  RECALL_LIST_TOOL,
  RECALL_GET_TOOL,
  RECALL_UPDATE_TOOL,
  RECALL_DELETE_TOOL,
  RECALL_CLEAR_TOOL,
} from '@youcraft/recall-mcp'
```

## Tools Reference

| Tool            | Description                                                            |
| --------------- | ---------------------------------------------------------------------- |
| `recall_add`    | Extract and store memories from text using intelligent fact extraction |
| `recall_query`  | Search memories using semantic similarity                              |
| `recall_list`   | List all memories for a user with pagination                           |
| `recall_get`    | Retrieve a specific memory by ID                                       |
| `recall_update` | Update an existing memory's content or metadata                        |
| `recall_delete` | Delete a specific memory                                               |
| `recall_clear`  | Clear all memories for a user                                          |

### `recall_add`

Extract and store memories from text.

**Input:**

```json
{
  "text": "I'm a software engineer at Acme Corp. I prefer TypeScript.",
  "userId": "default"
}
```

**Output:**

```json
{
  "success": true,
  "data": {
    "extractedCount": 2,
    "memories": [
      { "id": "...", "content": "User is a software engineer at Acme Corp", ... },
      { "id": "...", "content": "User prefers TypeScript", ... }
    ]
  }
}
```

### `recall_query`

Search memories using natural language.

**Input:**

```json
{
  "query": "What programming languages does the user prefer?",
  "userId": "default",
  "limit": 5
}
```

**Output:**

```json
{
  "success": true,
  "data": {
    "count": 1,
    "memories": [
      { "id": "...", "content": "User prefers TypeScript", ... }
    ]
  }
}
```

### `recall_list`

List memories with pagination.

**Input:**

```json
{
  "userId": "default",
  "limit": 20,
  "offset": 0
}
```

**Output:**

```json
{
  "success": true,
  "data": {
    "memories": [...],
    "total": 42,
    "limit": 20,
    "offset": 0
  }
}
```

## Handler Response Format

All handlers return a consistent format:

```typescript
interface ToolResult {
  success: boolean
  data?: unknown // Present on success
  error?: string // Present on failure
}
```

Memory objects in responses exclude the `embedding` field for brevity.

## See Also

- [MCP Server](/integrations/mcp-server) — Standalone MCP server for Claude Desktop, Cursor, etc.
- [Packages](/packages) — All available Recall packages
