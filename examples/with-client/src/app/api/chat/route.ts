import { openai } from '@ai-sdk/openai'
import { streamText, UIMessage, convertToModelMessages } from 'ai'
import { recall } from '@/lib/recall'

export const maxDuration = 30

/**
 * Chat endpoint using @youcraft/recall-client AI SDK wrapper
 *
 * Uses the recall() wrapper which automatically:
 * 1. Queries relevant memories from the hosted Recall API
 * 2. Injects them into the system prompt as a <memories> block
 *
 * Memory extraction happens server-side on the hosted Recall instance.
 */
export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

    if (!process.env.OPENAI_API_KEY) {
      return new Response('Missing OPENAI_API_KEY environment variable.', {
        status: 500,
      })
    }

    if (!process.env.RECALL_API_KEY) {
      return new Response('Missing RECALL_API_KEY environment variable.', {
        status: 500,
      })
    }

    // Use the recall wrapper - it automatically:
    // 1. Queries relevant memories from the hosted Recall API
    // 2. Injects them into the system prompt as a <memories> block
    const result = streamText({
      model: recall(openai('gpt-5-nano')),
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
