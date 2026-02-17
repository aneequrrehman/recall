import type {
  ExtractorProvider,
  ExtractedMemory,
  ConsolidationDecision,
  ConsolidationMemory,
} from '@youcraft/recall'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'

export interface OpenAIExtractorConfig {
  apiKey: string
  model?: string
}

const EXTRACTION_PROMPT = `You are a memory extraction system. Given a conversation or text, extract discrete facts and statements that would be valuable to remember about the user.

Rules:
- Extract only meaningful, persistent information (not transient queries)
- Each memory should be a single, atomic fact
- Write memories in third person (e.g., "User's name is John", "User lives in NYC")
- ALWAYS extract the user's name if mentioned - this is high priority
- Focus on: name, preferences, facts about the user, relationships, goals, opinions, experiences, location, job, interests
- Skip pure greetings with no information (e.g., "Hello", "How are you?")

If no meaningful memories can be extracted, return an empty array.`

const MemoryExtractionSchema = z.object({
  memories: z.array(
    z.object({
      content: z.string().describe('A single, atomic fact about the user'),
    })
  ),
})

const CONSOLIDATION_PROMPT = `You are a memory management assistant responsible for maintaining an accurate and up-to-date memory store for a user.

Your task is to analyze a NEW FACT against EXISTING MEMORIES and decide the appropriate action.

## Actions

1. **ADD**: The new fact contains genuinely new information not present in any existing memory.

2. **UPDATE**: The new fact enriches, corrects, or provides more detail about an existing memory. Return the MERGED content combining old and new information.

3. **DELETE**: The new fact directly contradicts an existing memory, making it invalid. (e.g., "User no longer lives in NYC" contradicts "User lives in NYC")

4. **NONE**: The new fact is already captured by an existing memory (duplicate or semantically equivalent).

## Important Rules

- For UPDATE: Combine the old memory with new information into a single, coherent fact
- For DELETE: Only use when new information explicitly invalidates old information
- Use memory IDs exactly as provided
- Return exactly ONE action per request
- If no existing memories are provided, always return ADD

## Examples

Example 1 - UPDATE (enrichment):
New fact: "User's name is John Doe"
Existing: [{"id": "0", "content": "User's name is John"}]
Response: {"action": "UPDATE", "id": "0", "content": "User's name is John Doe"}

Example 2 - ADD (new information):
New fact: "User works at Google"
Existing: [{"id": "0", "content": "User's name is John"}]
Response: {"action": "ADD", "content": "User works at Google"}

Example 3 - DELETE (contradiction):
New fact: "User no longer works at Google, now at Microsoft"
Existing: [{"id": "0", "content": "User works at Google"}]
Response: {"action": "DELETE", "id": "0"}

Example 4 - NONE (duplicate):
New fact: "User's name is John"
Existing: [{"id": "0", "content": "User's name is John"}]
Response: {"action": "NONE"}`

const ConsolidationResponseSchema = z.object({
  action: z
    .enum(['ADD', 'UPDATE', 'DELETE', 'NONE'])
    .describe(
      'The action to take: ADD (new info), UPDATE (enrich existing), DELETE (contradicts existing), NONE (duplicate)'
    ),
  id: z
    .string()
    .nullable()
    .describe('ID of the memory to update or delete (required for UPDATE/DELETE, null otherwise)'),
  content: z
    .string()
    .nullable()
    .describe('The memory content (required for ADD/UPDATE, null otherwise)'),
})

export function openaiExtractor(config: OpenAIExtractorConfig): ExtractorProvider {
  let client: OpenAI | null = null
  const model = config.model ?? 'gpt-5-nano'

  function getClient(): OpenAI {
    if (!client) {
      client = new OpenAI({ apiKey: config.apiKey })
    }
    return client
  }

  return {
    async extract(text: string): Promise<ExtractedMemory[]> {
      const response = await getClient().beta.chat.completions.parse({
        model,
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: text },
        ],
        response_format: zodResponseFormat(MemoryExtractionSchema, 'memory_extraction'),
      })

      const message = response.choices[0]?.message

      const parsed = message?.parsed

      if (!parsed || !parsed.memories) return []

      return parsed.memories.map(item => ({
        content: item.content,
      }))
    },

    async consolidate(
      newFact: string,
      existingMemories: ConsolidationMemory[]
    ): Promise<ConsolidationDecision> {
      // Skip LLM call if no existing memories - always ADD
      if (existingMemories.length === 0) {
        return { action: 'ADD', content: newFact }
      }

      const userMessage = `New fact: "${newFact}"

Existing memories:
${JSON.stringify(existingMemories, null, 2)}

Decide the appropriate action.`

      const response = await getClient().beta.chat.completions.parse({
        model,
        messages: [
          { role: 'system', content: CONSOLIDATION_PROMPT },
          { role: 'user', content: userMessage },
        ],
        response_format: zodResponseFormat(ConsolidationResponseSchema, 'consolidation_decision'),
      })

      const parsed = response.choices[0]?.message?.parsed

      // Fallback to ADD if parsing fails
      if (!parsed) {
        return { action: 'ADD', content: newFact }
      }

      return {
        action: parsed.action,
        id: parsed.id ?? undefined,
        content: parsed.content ?? undefined,
      }
    },
  }
}
