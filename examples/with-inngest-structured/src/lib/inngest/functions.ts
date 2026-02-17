import { inngest } from './client'
import { memory, getStructuredAgent, getStructuredMemory } from '../memory'
import { openai } from '@ai-sdk/openai'
import type { ExtractedContext } from '@youcraft/recall-structured'

/**
 * Process a message through the structured memory system
 *
 * Triggered after AI responds to a message.
 *
 * TWO-PHASE APPROACH:
 * 1. EXTRACTION: Use intent processor to extract structured data from natural language
 * 2. CONSOLIDATION: Pass extracted context to agent for multi-hop CRUD operations
 *
 * This ensures accurate data extraction while allowing the agent to handle
 * complex operations like "update my last payment to Jayden" (search then update).
 */
export const processStructuredMemory = inngest.createFunction(
  {
    id: 'process-structured-memory',
    name: 'Process Structured Memory',
  },
  { event: 'chat/message.completed' },
  async ({ event, step }) => {
    const { userId, messages } = event.data

    // Get the last user message for processing
    const lastUserMessage = await step.run('get-last-user-message', async () => {
      const userMessages = messages.filter((m: { role: string }) => m.role === 'user')
      return userMessages[userMessages.length - 1]?.content || ''
    })

    if (!lastUserMessage) {
      return { action: 'skipped', reason: 'no user message' }
    }

    // PHASE 1: Extract structured data using the intent processor
    const extraction = await step.run('extract-structured-data', async () => {
      const structured = getStructuredMemory()
      return structured.process(lastUserMessage, { userId })
    })

    console.log('[Phase 1] Extraction result:', extraction)

    // If not matched, this is not structured data - extract as traditional memory
    if (!extraction.matched) {
      const extractedMemories = await step.run('extract-memories', async () => {
        const conversation = messages
          .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
          .join('\n')
        return memory.extract(conversation, { userId })
      })

      return {
        action: 'memory',
        result: {
          matched: false,
          reason: extraction.reason,
        },
        memoriesExtracted: extractedMemories.length,
        memories: extractedMemories.map(m => m.content),
      }
    }

    // For simple inserts with high confidence, the extraction already did the work
    // No need for agent - data is already stored
    if (extraction.action === 'insert') {
      console.log(`[Phase 1] INSERT completed: ${extraction.schema} (id: ${extraction.id})`)

      // Also extract as traditional memory for context enrichment
      await step.run('extract-memories-backup', async () => {
        const conversation = messages
          .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
          .join('\n')
        return memory.extract(conversation, { userId })
      })

      return {
        action: 'insert',
        result: {
          schema: extraction.schema,
          id: extraction.id,
          data: extraction.data,
          confidence: extraction.confidence,
        },
      }
    }

    // For queries, the extraction already executed the SQL
    if (extraction.action === 'query') {
      console.log(`[Phase 1] QUERY completed: ${extraction.schema}`)
      return {
        action: 'query',
        result: {
          schema: extraction.schema,
          question: extraction.question,
          sql: extraction.sql,
          answer: extraction.result,
          explanation: extraction.explanation,
          confidence: extraction.confidence,
        },
      }
    }

    // PHASE 2: For UPDATE/DELETE, use the agent for multi-hop operations
    // The agent needs to search for the right record first
    if (extraction.action === 'update' || extraction.action === 'delete') {
      console.log(`[Phase 2] Using agent for ${extraction.action} operation`)

      // Build extracted context for the agent
      const extractedContext: ExtractedContext = {
        schema: extraction.schema,
        intent: extraction.action,
        confidence: extraction.confidence,
        ...(extraction.action === 'update' && extraction.data ? { data: extraction.data } : {}),
      }

      const agentResult = await step.run('agent-consolidation', async () => {
        const agent = getStructuredAgent()
        return agent.process(openai('gpt-5-nano'), lastUserMessage, {
          userId,
          maxSteps: 10,
          extractedContext,
        })
      })

      console.log('[Phase 2] Agent result:', {
        text: agentResult.text,
        steps: agentResult.steps,
        dataModified: agentResult.dataModified,
      })

      // Log each tool call for debugging
      for (const tc of agentResult.toolCalls) {
        console.log(`[Agent] Tool: ${tc.toolName}`)
        console.log(`  Input:`, JSON.stringify(tc.input, null, 2))
        console.log(`  Output:`, JSON.stringify(tc.output, null, 2))
      }

      // Extract as traditional memory for context enrichment if data was modified
      if (agentResult.dataModified) {
        await step.run('extract-memories-backup', async () => {
          const conversation = messages
            .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
            .join('\n')
          return memory.extract(conversation, { userId })
        })
      }

      return {
        action: extraction.action,
        result: {
          schema: extraction.schema,
          agentResponse: agentResult.text,
          steps: agentResult.steps,
          toolCalls: agentResult.toolCalls.map(tc => ({
            tool: tc.toolName,
            input: tc.input,
          })),
          dataModified: agentResult.dataModified,
        },
      }
    }

    // Fallback - shouldn't reach here
    return {
      action: 'unknown',
      extraction,
    }
  }
)
