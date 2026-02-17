/**
 * Structured Memory Agent (AI SDK v6)
 *
 * Multi-hop agent that can query, insert, update, and delete records
 * using the AI SDK v6 tool loop.
 */

export { createStructuredMemoryTools, type StructuredMemoryTools } from './tools'
export {
  createStructuredMemoryAgent,
  type StructuredMemoryAgentConfig,
  type AgentProcessOptions,
  type AgentProcessResult,
  type AgentContext,
  type ExtractedContext,
} from './agent'
export { STRUCTURED_MEMORY_SYSTEM_PROMPT } from './prompts'
