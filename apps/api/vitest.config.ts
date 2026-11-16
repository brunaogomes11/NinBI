import { resolve } from 'node:path'
import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [swc.vite()],
  resolve: {
    alias: {
      '@ninbi/contracts': resolve(
        __dirname,
        '../../packages/contracts/src/index.ts',
      ),
    },
  },
  test: {
    include: ['test/**/*.spec.ts'],
    passWithNoTests: true,
  },
})
