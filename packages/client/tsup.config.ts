import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/ai-sdk.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
})
