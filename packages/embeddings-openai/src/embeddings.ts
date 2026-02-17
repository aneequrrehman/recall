import type { EmbeddingsProvider } from '@youcraft/recall'
import OpenAI from 'openai'

export interface OpenAIEmbeddingsConfig {
  apiKey: string
  model?: string
}

export function openaiEmbeddings(config: OpenAIEmbeddingsConfig): EmbeddingsProvider {
  let client: OpenAI | null = null
  const model = config.model ?? 'text-embedding-3-small'

  const dimensions = model.includes('large') ? 3072 : 1536

  function getClient(): OpenAI {
    if (!client) {
      client = new OpenAI({ apiKey: config.apiKey })
    }
    return client
  }

  return {
    dimensions,

    async embed(text: string): Promise<number[]> {
      const response = await getClient().embeddings.create({
        model,
        input: text,
      })

      return response.data[0].embedding
    },

    async embedBatch(texts: string[]): Promise<number[][]> {
      const response = await getClient().embeddings.create({
        model,
        input: texts,
      })

      return response.data.map(d => d.embedding)
    },
  }
}
