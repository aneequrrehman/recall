---
title: Build a Memory-Enabled MCP Server
description: Give Claude, Cursor, and other AI assistants persistent memory using Recall's MCP server. Set up in 5 minutes.
---

The Model Context Protocol (MCP) lets AI assistants like Claude Desktop, Cursor, and Windsurf use external tools. With Recall's MCP server, you can give any MCP-compatible assistant persistent memory.

## What You'll Get

After this tutorial, your AI assistant will be able to:

- **Remember facts** you tell it across sessions
- **Recall information** when relevant to conversations
- **Update memories** when information changes
- **Forget things** when you ask it to

## Option 1: Use the Pre-built Server (Easiest)

Recall provides a ready-to-use MCP server. Just install and configure.

### Step 1: Install the Server

```bash
npm install -g @youcraft/recall-mcp-server
```

### Step 2: Configure Your Client

#### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "recall": {
      "command": "recall-mcp",
      "args": ["--db", "~/memories.db"],
      "env": {
        "OPENAI_API_KEY": "sk-your-api-key"
      }
    }
  }
}
```

#### Cursor

Edit `.cursor/mcp.json` in your project or home directory:

```json
{
  "mcpServers": {
    "recall": {
      "command": "recall-mcp",
      "args": ["--db", "~/memories.db"],
      "env": {
        "OPENAI_API_KEY": "sk-your-api-key"
      }
    }
  }
}
```

#### Windsurf / Cline

Similar configuration in their respective settings files.

### Step 3: Restart Your Client

Restart Claude Desktop, Cursor, or your MCP client. You should see "recall" tools available.

### Step 4: Try It Out

Tell your assistant:

> "Remember that my favorite programming language is TypeScript and I prefer functional programming."

Later, ask:

> "What do you know about my programming preferences?"

It will recall the information you stored!

## Available Tools

The MCP server provides these tools:

| Tool            | Description               |
| --------------- | ------------------------- |
| `memory_store`  | Store a new memory        |
| `memory_query`  | Find relevant memories    |
| `memory_list`   | List all memories         |
| `memory_update` | Update an existing memory |
| `memory_delete` | Delete a memory           |
| `memory_clear`  | Delete all memories       |

## Option 2: Build a Custom MCP Server

For more control, build your own server using the `@youcraft/recall-mcp` package.

### Step 1: Create a New Project

```bash
mkdir my-memory-server
cd my-memory-server
npm init -y
npm install @youcraft/recall @youcraft/recall-mcp \
  @youcraft/recall-adapter-sqlite @youcraft/recall-embeddings-openai \
  @youcraft/recall-extractor-openai @modelcontextprotocol/sdk
```

### Step 2: Create the Server

Create `server.ts`:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createMemory } from '@youcraft/recall'
import { createMcpTools, handleMcpToolCall } from '@youcraft/recall-mcp'
import { sqliteAdapter } from '@youcraft/recall-adapter-sqlite'
import { openaiEmbeddings } from '@youcraft/recall-embeddings-openai'
import { openaiExtractor } from '@youcraft/recall-extractor-openai'

// Create memory instance
const memory = createMemory({
  db: sqliteAdapter({ filename: process.env.DB_PATH || 'memories.db' }),
  embeddings: openaiEmbeddings({ apiKey: process.env.OPENAI_API_KEY! }),
  extractor: openaiExtractor({ apiKey: process.env.OPENAI_API_KEY! }),
})

// Create MCP server
const server = new Server(
  { name: 'my-memory-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

// Register tools
server.setRequestHandler('tools/list', async () => ({
  tools: createMcpTools(),
}))

// Handle tool calls
server.setRequestHandler('tools/call', async request => {
  const { name, arguments: args } = request.params

  // Default userId - in production, get this from auth
  const userId = args.userId || 'default'

  return handleMcpToolCall(memory, name, { ...args, userId })
})

// Start server
const transport = new StdioServerTransport()
await server.connect(transport)
```

### Step 3: Add Custom Tools

Extend with your own tools:

```typescript
import { createMcpTools } from '@youcraft/recall-mcp'

// Get base tools
const baseTools = createMcpTools()

// Add custom tools
const allTools = [
  ...baseTools,
  {
    name: 'memory_summarize',
    description: 'Get a summary of all memories for a user',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID' },
      },
      required: ['userId'],
    },
  },
]

server.setRequestHandler('tools/list', async () => ({
  tools: allTools,
}))

server.setRequestHandler('tools/call', async request => {
  const { name, arguments: args } = request.params

  if (name === 'memory_summarize') {
    const memories = await memory.list(args.userId)
    return {
      content: [
        {
          type: 'text',
          text: `User has ${memories.length} memories:\n${memories
            .map(m => `- ${m.content}`)
            .join('\n')}`,
        },
      ],
    }
  }

  return handleMcpToolCall(memory, name, args)
})
```

### Step 4: Build and Configure

```bash
npx tsc
```

Configure your MCP client to use your custom server:

```json
{
  "mcpServers": {
    "my-memory": {
      "command": "node",
      "args": ["/path/to/my-memory-server/server.js"],
      "env": {
        "OPENAI_API_KEY": "sk-your-api-key",
        "DB_PATH": "~/my-memories.db"
      }
    }
  }
}
```

## Multi-User Setup

For applications with multiple users, pass the userId dynamically:

```typescript
server.setRequestHandler('tools/call', async request => {
  const { name, arguments: args } = request.params

  // Get userId from the request context or arguments
  const userId = args.userId || request.context?.userId || 'anonymous'

  return handleMcpToolCall(memory, name, { ...args, userId })
})
```

## Using PostgreSQL for Production

For production deployments, use PostgreSQL instead of SQLite:

```bash
npm install @youcraft/recall-adapter-postgresql pg pgvector
```

```typescript
import { postgresAdapter } from '@youcraft/recall-adapter-postgresql'

const memory = createMemory({
  db: postgresAdapter({
    connectionString: process.env.DATABASE_URL!,
    usePgVector: true,
  }),
  embeddings: openaiEmbeddings({ apiKey: process.env.OPENAI_API_KEY! }),
  extractor: openaiExtractor({ apiKey: process.env.OPENAI_API_KEY! }),
})
```

## Debugging

### View Server Logs

Run the server manually to see logs:

```bash
OPENAI_API_KEY=sk-xxx recall-mcp --db ./test.db
```

### Test Tools Directly

Use the MCP inspector:

```bash
npx @modelcontextprotocol/inspector recall-mcp --db ./test.db
```

### Check Memory Contents

Query your database directly:

```bash
sqlite3 memories.db "SELECT * FROM memories"
```

## Security Considerations

1. **API Keys**: Never commit API keys. Use environment variables.
2. **User Isolation**: Always scope memories by userId to prevent data leaks.
3. **Database Location**: Store the database in a secure location.
4. **Input Validation**: The MCP server validates inputs, but add additional checks for production.

## Next Steps

- [MCP Tools Reference](/integrations/mcp) — Full API documentation
- [MCP Server Reference](/integrations/mcp-server) — Server configuration options
- [PostgreSQL Setup](/database-adapters/postgresql) — Production database
