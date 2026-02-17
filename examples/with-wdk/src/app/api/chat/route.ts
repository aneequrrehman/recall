import { openai } from '@ai-sdk/openai'
import { streamText, UIMessage, convertToModelMessages } from 'ai'
import { recall } from '@/lib/memory'

export const maxDuration = 30
const USER_ID = 'demo-user'

/**
 * Chat endpoint using @youcraft/recall-ai-sdk wrapper
 *
 * Uses the recall() wrapper which automatically:
 * 1. Queries relevant memories based on the user's message
 * 2. Injects them into the system prompt as a <memories> block
 * 3. Triggers memory extraction via WDK workflow after response
 */
export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

    if (!process.env.OPENAI_API_KEY) {
      return new Response('Missing OPENAI_API_KEY environment variable.', {
        status: 500,
      })
    }

    // Use the recall wrapper - it automatically:
    // 1. Queries relevant memories based on the user's message
    // 2. Injects them into the system prompt as a <memories> block
    // 3. Triggers onExtract callback after the response completes
    const result = streamText({
      model: recall(openai('gpt-5-nano'), { userId: USER_ID }),
      system: 'You are a helpful assistant.',
      messages: convertToModelMessages(messages),
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Chat API Error:', error)
    return new Response('An error occurred while processing your request.', {
      status: 500,
    })
  }
}
