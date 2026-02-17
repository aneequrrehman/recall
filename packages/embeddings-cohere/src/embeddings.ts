import type { EmbeddingsProvider } from '@youcraft/recall'
import { CohereClient } from 'cohere-ai'

export type CohereEmbeddingModel =
  | 'embed-english-v3.0'
  | 'embed-english-light-v3.0'
  | 'embed-multilingual-v3.0'
  | 'embed-multilingual-light-v3.0'
  | (string & {})

export type CohereInputType = 'search_document' | 'search_query' | 'classification' | 'clustering'

export interface CohereEmbeddingsConfig {
  apiKey: string
  model?: CohereEmbeddingModel
  inputType?: CohereInputType
}

const MODEL_DIMENSIONS: Record<string, number> = {
  'embed-english-v3.0': 1024,
  'embed-english-light-v3.0': 384,
  'embed-multilingual-v3.0': 1024,
  'embed-multilingual-light-v3.0': 384,
}

export function cohereEmbeddings(config: CohereEmbeddingsConfig): EmbeddingsProvider {
  const client = new CohereClient({ token: config.apiKey })
  const model = config.model ?? 'embed-english-light-v3.0'
  const inputType = config.inputType ?? 'search_document'

  const dimensions = MODEL_DIMENSIONS[model] ?? 384

  return {
    dimensions,

    async embed(text: string): Promise<number[]> {
      const response = await client.v2.embed({
        texts: [text],
        model,
        inputType,
        embeddingTypes: ['float'],
      })

      const embeddings = response.embeddings as { float?: number[][] }
      if (!embeddings.float || embeddings.float.length === 0) {
        throw new Error('No embeddings returned from Cohere API')
      }

      return embeddings.float[0]
    },

    async embedBatch(texts: string[]): Promise<number[][]> {
      // Cohere API accepts max 96 texts per request
      const batchSize = 96
      const results: number[][] = []

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize)
        const response = await client.v2.embed({
          texts: batch,
          model,
          inputType,
          embeddingTypes: ['float'],
        })

        const embeddings = response.embeddings as { float?: number[][] }
        if (!embeddings.float) {
          throw new Error('No embeddings returned from Cohere API')
        }

        results.push(...embeddings.float)
      }

      return results
    },
  }
}
