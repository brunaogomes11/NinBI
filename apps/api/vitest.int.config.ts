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
    env: {
      NINBI_ENCRYPTION_KEY: 'bmluYmktdGVzdC1rZXluaW5iaS10ZXN0LWtleW5pbmI=',
    },
    include: ['test-int/**/*.int.spec.ts'],
    fileParallelism: false,
    testTimeout: 60000,
    passWithNoTests: true,
  },
})
