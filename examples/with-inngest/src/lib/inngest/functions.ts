import { inngest } from './client'
import { memory } from '../memory'

/**
 * Extract memories from a conversation
 *
 * Triggered after AI responds to a message.
 * Extracts important facts from the conversation and stores them
 * so they're available for the next message.
 */
export const extractMemories = inngest.createFunction(
  {
    id: 'extract-memories',
    name: 'Extract Memories from Conversation',
  },
  { event: 'chat/message.completed' },
  async ({ event, step }) => {
    const { userId, messages } = event.data

    // Format messages into a conversation string
    const conversation = await step.run('format-conversation', async () => {
      return messages
        .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
        .join('\n')
    })

    // Extract memories from the conversation
    const extractedMemories = await step.run('extract-memories', async () => {
      return memory.extract(conversation, { userId })
    })

    return {
      userId,
      memoriesExtracted: extractedMemories.length,
      memories: extractedMemories,
    }
  }
)
