import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './server'

configure({ asyncUtilTimeout: 5000 })

// O jsdom não implementa estas APIs de ponteiro e rolagem que o Radix Select usa.
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => {}
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
  // O Radix Checkbox, dentro de um formulário, mede o elemento com ResizeObserver.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

// Pedido sem handler não é só um aviso no log: ele reprova o teste que o fez.
const unhandled: string[] = []

beforeAll(() => {
  server.listen({
    async onUnhandledFrame({ frame, defaults }) {
      unhandled.push(await frame.getUnhandledMessage())
      defaults.error()
    },
  })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
  if (unhandled.length > 0) {
    const messages = unhandled.splice(0).join('\n')
    throw new Error(`Pedido sem handler MSW:\n${messages}`)
  }
})

afterAll(() => {
  server.close()
})
