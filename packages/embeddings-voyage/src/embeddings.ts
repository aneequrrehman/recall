import type { EmbeddingsProvider } from '@youcraft/recall'
import { VoyageAIClient } from 'voyageai'

export type VoyageEmbeddingModel =
  | 'voyage-3-large'
  | 'voyage-3'
  | 'voyage-3-lite'
  | 'voyage-code-3'
  | 'voyage-finance-2'
  | 'voyage-law-2'
  | 'voyage-multilingual-2'
  | (string & {})

export type VoyageInputType = 'query' | 'document'

export interface VoyageEmbeddingsConfig {
  apiKey: string
  model?: VoyageEmbeddingModel
  inputType?: VoyageInputType
}

const MODEL_DIMENSIONS: Record<string, number> = {
  'voyage-3-large': 1024,
  'voyage-3': 1024,
  'voyage-3-lite': 512,
  'voyage-code-3': 1024,
  'voyage-finance-2': 1024,
  'voyage-law-2': 1024,
  'voyage-multilingual-2': 1024,
}

export function voyageEmbeddings(config: VoyageEmbeddingsConfig): EmbeddingsProvider {
  const client = new VoyageAIClient({ apiKey: config.apiKey })
  const model = config.model ?? 'voyage-3-lite'
  const inputType = config.inputType ?? 'document'

  const dimensions = MODEL_DIMENSIONS[model] ?? 1024

  return {
    dimensions,

    async embed(text: string): Promise<number[]> {
      const response = await client.embed({
        input: [text],
        model,
        inputType,
      })

      if (!response.data || response.data.length === 0) {
        throw new Error('No embeddings returned from Voyage API')
      }

      return response.data[0].embedding as number[]
    },

    async embedBatch(texts: string[]): Promise<number[][]> {
      // Voyage API accepts max 128 texts per request
      const batchSize = 128
      const results: number[][] = []

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize)
        const response = await client.embed({
          input: batch,
          model,
          inputType,
        })

        if (!response.data) {
          throw new Error('No embeddings returned from Voyage API')
        }

        results.push(...response.data.map(d => d.embedding as number[]))
      }

      return results
    },
  }
}
