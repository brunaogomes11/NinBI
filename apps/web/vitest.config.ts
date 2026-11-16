import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['src/test/setup.ts'],
      passWithNoTests: true,
      // `pnpm test` roda os três pacotes juntos: sob carga, os testes de tela demoram mais.
      testTimeout: 30000,
      hookTimeout: 30000,
    },
  }),
)
