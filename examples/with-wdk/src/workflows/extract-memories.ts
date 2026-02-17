import { memory } from '../lib/memory'

/**
 * Step: Format messages into a conversation string
 */
async function formatConversation(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  'use step'
  return messages.map(m => `${m.role}: ${m.content}`).join('\n')
}

/**
 * Step: Extract memories from the conversation
 */
async function extractMemoriesFromConversation(
  conversation: string,
  userId: string
): Promise<Array<{ id: string; content: string }>> {
  'use step'
  return memory.extract(conversation, { userId })
}

/**
 * Workflow: Extract memories from a conversation
 *
 * Triggered after AI responds to a message.
 * Extracts important facts from the conversation and stores them
 * so they're available for the next message.
 */
export async function extractMemories(
  userId: string,
  messages: Array<{ role: string; content: string }>
) {
  'use workflow'

  // Format messages into a conversation string
  const conversation = await formatConversation(messages)

  // Extract memories from the conversation
  const extractedMemories = await extractMemoriesFromConversation(conversation, userId)

  console.log(`Extracted ${extractedMemories.length} memories for user ${userId}`)

  return {
    userId,
    memoriesExtracted: extractedMemories.length,
    memories: extractedMemories,
  }
}
