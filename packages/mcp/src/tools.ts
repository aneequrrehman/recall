import type { MCPToolSchema } from './types'

export const RECALL_ADD_TOOL: MCPToolSchema = {
  name: 'recall_add',
  description:
    'Extract and store memories from text using intelligent fact extraction. The system automatically identifies and stores relevant facts, preferences, and information about the user.',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text to extract memories from (conversation, notes, etc.)',
      },
      userId: {
        type: 'string',
        description: 'User ID to associate memories with (uses default if not provided)',
      },
      source: {
        type: 'string',
        description: 'Optional source identifier (e.g., "chat", "document")',
      },
      sourceId: {
        type: 'string',
        description: 'Optional source-specific ID for tracing',
      },
    },
    required: ['text'],
  },
}

export const RECALL_QUERY_TOOL: MCPToolSchema = {
  name: 'recall_query',
  description:
    'Search memories using semantic similarity. Returns memories most relevant to the query context.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query or context to find relevant memories',
      },
      userId: {
        type: 'string',
        description: 'User ID to search memories for (uses default if not provided)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of memories to return (default: 10)',
      },
      threshold: {
        type: 'number',
        description: 'Minimum similarity threshold (0-1) for results',
      },
    },
    required: ['query'],
  },
}

export const RECALL_LIST_TOOL: MCPToolSchema = {
  name: 'recall_list',
  description: 'List all memories for a user with optional pagination.',
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'User ID to list memories for (uses default if not provided)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of memories to return',
      },
      offset: {
        type: 'number',
        description: 'Number of memories to skip for pagination',
      },
    },
    required: [],
  },
}

export const RECALL_GET_TOOL: MCPToolSchema = {
  name: 'recall_get',
  description: 'Retrieve a specific memory by its ID.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The unique identifier of the memory to retrieve',
      },
    },
    required: ['id'],
  },
}

export const RECALL_UPDATE_TOOL: MCPToolSchema = {
  name: 'recall_update',
  description: 'Update an existing memory. Can modify content and/or metadata.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The unique identifier of the memory to update',
      },
      content: {
        type: 'string',
        description: 'New content for the memory (will re-embed if changed)',
      },
      metadata: {
        type: 'object',
        description: 'New metadata to replace existing metadata',
      },
    },
    required: ['id'],
  },
}

export const RECALL_DELETE_TOOL: MCPToolSchema = {
  name: 'recall_delete',
  description: 'Delete a specific memory by its ID.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The unique identifier of the memory to delete',
      },
    },
    required: ['id'],
  },
}

export const RECALL_CLEAR_TOOL: MCPToolSchema = {
  name: 'recall_clear',
  description: 'Clear all memories for a user. Destructive — ask user to confirm first.',
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'User ID to clear memories for (uses default if not provided)',
      },
    },
    required: [],
  },
}

/**
 * All Recall MCP tools
 */
export const RECALL_TOOLS: MCPToolSchema[] = [
  RECALL_ADD_TOOL,
  RECALL_QUERY_TOOL,
  RECALL_LIST_TOOL,
  RECALL_GET_TOOL,
  RECALL_UPDATE_TOOL,
  RECALL_DELETE_TOOL,
  RECALL_CLEAR_TOOL,
]
