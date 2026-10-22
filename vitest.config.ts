import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  // tsconfig usa jsx: preserve (lo transforma Next); los tests .tsx necesitan el runtime automático.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.mjs'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
})
