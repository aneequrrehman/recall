import { describe, it, expect } from 'vitest'
import { cosineSimilarity } from '../memory'

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const vector = [1, 2, 3, 4, 5]
    expect(cosineSimilarity(vector, vector)).toBeCloseTo(1, 5)
  })

  it('returns 1 for proportional vectors', () => {
    const a = [1, 2, 3]
    const b = [2, 4, 6]
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5)
  })

  it('returns 0 for orthogonal vectors', () => {
    const a = [1, 0]
    const b = [0, 1]
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5)
  })

  it('returns -1 for opposite vectors', () => {
    const a = [1, 2, 3]
    const b = [-1, -2, -3]
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5)
  })

  it('handles normalized vectors', () => {
    const a = [0.6, 0.8]
    const b = [0.8, 0.6]
    const expected = 0.6 * 0.8 + 0.8 * 0.6
    expect(cosineSimilarity(a, b)).toBeCloseTo(expected, 5)
  })

  it('handles high-dimensional vectors', () => {
    const dimension = 1536
    const a = Array.from({ length: dimension }, (_, i) => Math.sin(i))
    const b = Array.from({ length: dimension }, (_, i) => Math.sin(i))
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5)
  })

  it('returns value between -1 and 1', () => {
    const a = [0.5, -0.3, 0.8, 0.1]
    const b = [-0.2, 0.7, 0.4, -0.5]
    const result = cosineSimilarity(a, b)
    expect(result).toBeGreaterThanOrEqual(-1)
    expect(result).toBeLessThanOrEqual(1)
  })
})
