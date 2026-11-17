import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutoRefresh } from './useAutoRefresh'

const KEY_A = ['widget', 'a']
const KEY_B = ['widget', 'b']
const KEY_OTHER = ['widget', 'other']

let hidden = false
let client: QueryClient
let calls: Record<string, number>

function counting(name: string) {
  return () => {
    calls[name] = (calls[name] ?? 0) + 1
    return Promise.resolve(name)
  }
}

async function seed() {
  calls = {}
  await client.fetchQuery({ queryKey: KEY_A, queryFn: counting('a') })
  await client.fetchQuery({ queryKey: KEY_B, queryFn: counting('b') })
  await client.fetchQuery({ queryKey: KEY_OTHER, queryFn: counting('other') })
  calls = {}
}

function setup(initial: {
  intervalSec: number
  paused?: boolean
  resetKey?: number
}) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(
    (props: { intervalSec: number; paused: boolean; resetKey: number }) =>
      useAutoRefresh({ ...props, queryKeys: [KEY_A, KEY_B] }),
    {
      wrapper,
      initialProps: {
        intervalSec: initial.intervalSec,
        paused: initial.paused ?? false,
        resetKey: initial.resetKey ?? 0,
      },
    },
  )
}

function setHidden(value: boolean) {
  hidden = value
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  hidden = false
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await seed()
})

afterEach(() => {
  vi.useRealTimers()
  client.clear()
})

describe('useAutoRefresh', () => {
  it('RFR-02 intervalo vencido executa de novo os widgets da aba ativa', async () => {
    setup({ intervalSec: 10 })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(calls).toEqual({ a: 1, b: 1 })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(calls).toEqual({ a: 2, b: 2 })
  })

  it('RFR-05 aba do navegador oculta não executa atualizações', async () => {
    hidden = true
    setup({ intervalSec: 10 })
    await vi.advanceTimersByTimeAsync(30_000)
    expect(calls).toEqual({})
  })

  it('RFR-06 voltar a ficar visível com o intervalo já vencido executa uma atualização', async () => {
    hidden = true
    setup({ intervalSec: 10 })
    await vi.advanceTimersByTimeAsync(25_000)
    expect(calls).toEqual({})
    setHidden(false)
    await vi.advanceTimersByTimeAsync(0)
    expect(calls).toEqual({ a: 1, b: 1 })
  })

  it('RFR-07 modo de edição não executa atualizações automáticas', async () => {
    setup({ intervalSec: 10, paused: true })
    await vi.advanceTimersByTimeAsync(30_000)
    expect(calls).toEqual({})
  })

  it('RFR-08 execução em andamento pula a atualização desse widget', async () => {
    let started = 0
    client
      .fetchQuery({
        queryKey: KEY_A,
        staleTime: 0,
        queryFn: () => {
          started += 1
          return new Promise<string>(() => {})
        },
      })
      .catch(() => {})
    await vi.advanceTimersByTimeAsync(0)
    expect(started).toBe(1)
    setup({ intervalSec: 10 })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(started).toBe(1)
    expect(calls.b).toBe(1)
  })

  it('RFR-12 mudar um filtro reinicia a contagem do intervalo', async () => {
    const view = setup({ intervalSec: 10 })
    await vi.advanceTimersByTimeAsync(8_000)
    view.rerender({ intervalSec: 10, paused: false, resetKey: 1 })
    await vi.advanceTimersByTimeAsync(2_000)
    expect(calls).toEqual({})
    await vi.advanceTimersByTimeAsync(8_000)
    expect(calls).toEqual({ a: 1, b: 1 })
  })

  it('RFR-02 intervalo 0 não agenda nada', async () => {
    setup({ intervalSec: 0 })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(calls).toEqual({})
  })
})
