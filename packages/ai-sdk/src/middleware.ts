import type {
  LanguageModelV2Middleware,
  LanguageModelV2Prompt,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider'
import type { RecallConfig, WrapOptions } from './types'

/**
 * Extract the last user message content as context for memory query
 */
function extractUserContext(prompt: LanguageModelV2Prompt): string | null {
  // Iterate backwards to find the last user message
  for (let i = prompt.length - 1; i >= 0; i--) {
    const message = prompt[i]
    if (message.role === 'user') {
      // Handle different content types
      if (typeof message.content === 'string') {
        return message.content
      }
      // For array content, extract text parts
      if (Array.isArray(message.content)) {
        const textParts = message.content
          .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
          .map(part => part.text)
        if (textParts.length > 0) {
          return textParts.join(' ')
        }
      }
    }
  }
  return null
}

/**
 * Format memories into a string block for injection
 */
function formatMemories(memories: { content: string }[]): string {
  if (memories.length === 0) return ''

  const memoryList = memories.map(m => `- ${m.content}`).join('\n')
  return `<memories>\n${memoryList}\n</memories>`
}

/**
 * Inject memories into the prompt's system message
 */
function injectMemoriesIntoPrompt(
  prompt: LanguageModelV2Prompt,
  memoriesBlock: string
): LanguageModelV2Prompt {
  if (!memoriesBlock) return prompt

  const newPrompt = [...prompt]

  // Find existing system message
  const systemIndex = newPrompt.findIndex(m => m.role === 'system')

  if (systemIndex !== -1) {
    // Prepend memories to existing system message
    const systemMessage = newPrompt[systemIndex]
    if (systemMessage.role === 'system') {
      newPrompt[systemIndex] = {
        ...systemMessage,
        content: `${memoriesBlock}\n\n${systemMessage.content}`,
      }
    }
  } else {
    // Add new system message at the beginning
    newPrompt.unshift({
      role: 'system',
      content: memoriesBlock,
    })
  }

  return newPrompt
}

/**
 * Create the recall middleware for memory injection and extraction
 */
export function createRecallMiddleware(
  config: RecallConfig,
  options: WrapOptions
): LanguageModelV2Middleware {
  const { memory, onExtract } = config
  const { userId, limit = 10, threshold } = options

  return {
    async transformParams({ params }) {
      // Extract context from user's message
      const context = extractUserContext(params.prompt)

      if (!context) {
        // No user message to query against
        return params
      }

      // Query relevant memories
      const memories = await memory.query(context, {
        userId,
        limit,
        threshold,
      })

      if (memories.length === 0) {
        return params
      }

      // Format and inject memories
      const memoriesBlock = formatMemories(memories)
      const newPrompt = injectMemoriesIntoPrompt(params.prompt, memoriesBlock)

      return {
        ...params,
        prompt: newPrompt,
      }
    },

    async wrapGenerate({ doGenerate, params }) {
      const result = await doGenerate()

      // Call onExtract after generation completes
      if (onExtract) {
        // Fire and forget - don't block the response
        Promise.resolve(
          onExtract({
            messages: params.prompt,
            userId,
          })
        ).catch(() => {
          // Silently ignore extraction errors
        })
      }

      return result
    },

    async wrapStream({ doStream, params }) {
      const { stream, ...rest } = await doStream()

      if (!onExtract) {
        return { stream, ...rest }
      }

      // Wrap the stream to detect completion
      const transformStream = new TransformStream<
        LanguageModelV2StreamPart,
        LanguageModelV2StreamPart
      >({
        transform(chunk, controller) {
          controller.enqueue(chunk)
        },
        flush() {
          // Stream completed - call onExtract
          Promise.resolve(
            onExtract({
              messages: params.prompt,
              userId,
            })
          ).catch(() => {
            // Silently ignore extraction errors
          })
        },
      })

      return {
        stream: stream.pipeThrough(transformStream),
        ...rest,
      }
    },
  }
}
