import { openai } from '@ai-sdk/openai'
import { streamText, UIMessage, convertToModelMessages } from 'ai'
import { queryMemories, getStructuredTables, formatMemoriesAsContext } from '@/lib/memory'
import { inngest } from '@/lib/inngest/client'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

// For demo purposes, using a hardcoded user ID
// In production, get this from authentication
const USER_ID = 'demo-user'

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

    if (!process.env.OPENAI_API_KEY) {
      return new Response('Missing OPENAI_API_KEY environment variable.', {
        status: 500,
      })
    }

    // Get the last user message for memory query
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')

    const userQuery =
      lastUserMessage?.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map(p => p.text)
        .join(' ') || ''

    // Query relevant memories and structured data (real-time)
    const [memories, tables] = await Promise.all([
      queryMemories(USER_ID, userQuery),
      getStructuredTables(),
    ])

    console.log('fetched memories...', memories)
    console.log(
      'fetched tables...',
      tables.map(t => t.name)
    )

    const memoryContext = formatMemoriesAsContext(memories, tables)

    // Build system prompt with memories and structured data
    const systemPrompt = `You are a helpful assistant that remembers information about the user.

Be succinct and direct in your responses. Keep answers brief - one or two sentences max unless more detail is needed.

When the user mentions trackable data (payments, workouts, medications), briefly confirm you've noted it.
When they ask questions about their data, answer with the specific information requested.

${memoryContext ? `\n${memoryContext}` : ''}`

    const result = streamText({
      model: openai('gpt-5-nano'),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      onFinish: async ({ text }) => {
        // Trigger memory/structured processing in the background after AI responds
        const allMessages = [
          ...messages.map(m => ({
            role: m.role,
            content:
              m.parts
                ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                .map(p => p.text)
                .join(' ') || '',
          })),
          { role: 'assistant', content: text },
        ]

        try {
          await inngest.send({
            name: 'chat/message.completed',
            data: {
              userId: USER_ID,
              messages: allMessages,
            },
          })
        } catch (err) {
          console.error('Failed to send Inngest event:', err)
        }
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Chat API Error:', error)
    return new Response('An error occurred while processing your request.', {
      status: 500,
    })
  }
}
