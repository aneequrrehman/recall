import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

import { createMemory, inMemoryAdapter } from '@youcraft/recall'
import { sqliteAdapter } from '@youcraft/recall-adapter-sqlite'
import { openaiEmbeddings } from '@youcraft/recall-embeddings-openai'
import { openaiExtractor } from '@youcraft/recall-extractor-openai'
import { RECALL_TOOLS, createRecallHandlers, type RecallHandlers } from '@youcraft/recall-mcp'

import type { RecallMCPServerConfig } from './config'

export function createRecallMCPServer(config: RecallMCPServerConfig) {
  // Initialize database adapter
  const db = config.db === ':memory:' ? inMemoryAdapter() : sqliteAdapter({ filename: config.db })

  // Initialize providers
  const embeddings = openaiEmbeddings({
    apiKey: config.openaiKey,
    model: config.embeddingModel,
  })

  const extractor = openaiExtractor({
    apiKey: config.openaiKey,
    model: config.model,
  })

  // Create memory client
  const memory = createMemory({ db, embeddings, extractor })

  // Create handlers
  const handlers = createRecallHandlers({
    memory,
    defaultUserId: config.userId,
  })

  // Create MCP server
  const server = new Server(
    {
      name: 'recall-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: RECALL_TOOLS.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    }
  })

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params

    if (config.verbose) {
      console.error(`[recall-mcp] Tool called: ${name}`, args)
    }

    const handler = handlers[name as keyof RecallHandlers]

    if (!handler) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: false, error: `Unknown tool: ${name}` }),
          },
        ],
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await handler(args as any)

    if (config.verbose) {
      console.error(`[recall-mcp] Result:`, result)
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  })

  return {
    server,
    memory,
    handlers,

    async start() {
      const transport = new StdioServerTransport()
      await server.connect(transport)

      if (config.verbose) {
        console.error('[recall-mcp] Server started')
      }
    },

    async close() {
      await server.close()

      if (config.verbose) {
        console.error('[recall-mcp] Server closed')
      }
    },
  }
}

export type RecallMCPServer = ReturnType<typeof createRecallMCPServer>
