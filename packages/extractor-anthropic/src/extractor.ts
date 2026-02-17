import Anthropic from '@anthropic-ai/sdk'
import type {
  ExtractorProvider,
  ExtractedMemory,
  ConsolidationDecision,
  ConsolidationMemory,
} from '@youcraft/recall'

export interface AnthropicExtractorConfig {
  apiKey: string
  /**
   * Model to use for extraction
   * @default "claude-3-5-haiku-20241022"
   */
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

const extractMemoriesTool: Anthropic.Tool = {
  name: 'extract_memories',
  description: 'Extract memories from the provided text',
  input_schema: {
    type: 'object' as const,
    properties: {
      memories: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'A single, atomic fact about the user',
            },
          },
          required: ['content'],
        },
        description: 'List of extracted memories',
      },
    },
    required: ['memories'],
  },
}

const consolidateMemoryTool: Anthropic.Tool = {
  name: 'consolidate_memory',
  description: 'Decide how to handle a new fact against existing memories',
  input_schema: {
    type: 'object' as const,
    properties: {
      action: {
        type: 'string',
        enum: ['ADD', 'UPDATE', 'DELETE', 'NONE'],
        description:
          'The action to take: ADD (new info), UPDATE (enrich existing), DELETE (contradicts existing), NONE (duplicate)',
      },
      id: {
        type: 'string',
        description: 'ID of the memory to update or delete (required for UPDATE/DELETE)',
      },
      content: {
        type: 'string',
        description: 'The memory content (required for ADD/UPDATE)',
      },
    },
    required: ['action'],
  },
}

interface ExtractMemoriesInput {
  memories: Array<{ content: string }>
}

interface ConsolidateMemoryInput {
  action: 'ADD' | 'UPDATE' | 'DELETE' | 'NONE'
  id?: string
  content?: string
}

export function anthropicExtractor(config: AnthropicExtractorConfig): ExtractorProvider {
  const client = new Anthropic({ apiKey: config.apiKey })
  const model = config.model ?? 'claude-3-5-haiku-latest'

  return {
    async extract(text: string): Promise<ExtractedMemory[]> {
      const response = await client.messages.create({
        model,
        max_tokens: 1024,
        system: EXTRACTION_PROMPT,
        tools: [extractMemoriesTool],
        tool_choice: { type: 'tool', name: 'extract_memories' },
        messages: [{ role: 'user', content: text }],
      })

      const toolUse = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      )

      if (!toolUse) {
        return []
      }

      const input = toolUse.input as ExtractMemoriesInput

      if (!input.memories || !Array.isArray(input.memories)) {
        return []
      }

      return input.memories.map(item => ({
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

      const response = await client.messages.create({
        model,
        max_tokens: 1024,
        system: CONSOLIDATION_PROMPT,
        tools: [consolidateMemoryTool],
        tool_choice: { type: 'tool', name: 'consolidate_memory' },
        messages: [{ role: 'user', content: userMessage }],
      })

      const toolUse = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      )

      // Fallback to ADD if parsing fails
      if (!toolUse) {
        return { action: 'ADD', content: newFact }
      }

      const input = toolUse.input as ConsolidateMemoryInput

      return {
        action: input.action,
        id: input.id,
        content: input.content,
      }
    },
  }
}
