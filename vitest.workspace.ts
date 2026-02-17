import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/adapter-mysql',
  'packages/adapter-postgresql',
  'packages/adapter-sqlite',
  'packages/ai-sdk',
  'packages/core',
  'packages/embeddings-cohere',
  'packages/embeddings-openai',
  'packages/embeddings-voyage',
  'packages/extractor-anthropic',
  'packages/extractor-openai',
  'packages/mcp',
  'packages/mcp-server',
  'packages/recall-structured',
])
