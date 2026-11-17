import type { QueryResultDto } from '@ninbi/contracts'
import { screen, waitFor } from '@testing-library/react'
import { delay, HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockElementSize } from '@/test/element-size'
import { connectionsHandler } from '@/test/fixtures/connections'
import {
  makeDashboard,
  makeQueryResult,
  makeWidget,
} from '@/test/fixtures/dashboards'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

const { toPng } = vi.hoisted(() => ({ toPng: vi.fn() }))
vi.mock('html-to-image', () => ({ toPng }))

const blobs: Blob[] = []
const downloads: string[] = []
let restoreSize: () => void

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 16, 12, 0, 0))
  restoreSize = mockElementSize(600, 300)
  blobs.length = 0
  downloads.length = 0
  toPng.mockReset()
  toPng.mockResolvedValue('data:image/png;base64,AAAA')
  URL.createObjectURL = vi.fn((blob: Blob) => {
    blobs.push(blob)
    return 'blob:teste'
  })
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push(this.download)
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  restoreSize()
})

const MANY = makeQueryResult({
  columns: ['loja', 'total'],
  rows: Array.from({ length: 120 }, (_, i) => [`Loja ${i + 1}`, i + 1]),
})

function open(
  result: () => Response | Promise<Response>,
  options: {
    visualization?: string
    config?: Record<string, unknown>
    viewer?: boolean
  } = {},
) {
  const dashboard = makeDashboard({
    permissions: options.viewer
      ? { edit: false, delete: false, share: false }
      : { edit: true, delete: true, share: true },
    tabs: [
      {
        id: 't-1',
        name: 'Aba 1',
        widgets: [
          makeWidget({
            id: 'w-1',
            title: 'Vendas por mês',
            cypher: options.viewer ? null : 'MATCH (l:Loja) RETURN l',
            hasQuery: true,
            visualization: options.visualization ?? 'TABLE',
            config: options.config ?? {},
          }),
        ],
      },
    ],
  })
  return renderApp('/dashboards/d-1', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser({ role: options.viewer ? 'VIEWER' : 'ADMIN' })),
      connectionsHandler(),
      http.get('/api/dashboards/d-1', () => HttpResponse.json(dashboard)),
      http.post('/api/dashboards/:id/widgets/:widgetId/run', () => result()),
    ],
  })
}

type App = ReturnType<typeof open>

async function openMenu(app: App) {
  await app.user.click(
    await screen.findByRole('button', {
      name: 'Exportar widget Vendas por mês',
    }),
  )
}

const ok = () => HttpResponse.json(MANY)

describe('WidgetExportMenu', () => {
  it('EXP-01 menu do widget em visualização mostra Exportar CSV e Exportar PNG', async () => {
    const dono = open(ok)
    await openMenu(dono)
    expect(
      await screen.findByRole('menuitem', { name: 'Exportar CSV' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Exportar PNG' }),
    ).toBeInTheDocument()
    dono.unmount()

    const viewer = open(ok, { viewer: true })
    await openMenu(viewer)
    expect(
      await screen.findByRole('menuitem', { name: 'Exportar CSV' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Exportar PNG' }),
    ).toBeInTheDocument()
  })

  it('EXP-02 Exportar CSV baixa as 120 linhas com a página 1 visível', async () => {
    const app = open(ok)
    expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument()
    await openMenu(app)
    const item = await screen.findByRole('menuitem', { name: 'Exportar CSV' })
    await waitFor(() => expect(item).not.toHaveAttribute('aria-disabled'))
    await app.user.click(item)

    await waitFor(() => expect(blobs).toHaveLength(1))
    const bytes = new Uint8Array(await blobs[0]?.arrayBuffer())
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf])
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)
    expect(text.split('\r\n')).toHaveLength(121)
    expect(text.startsWith('﻿loja;total')).toBe(true)
  })

  it('EXP-06 Exportar PNG gera a imagem do card no dobro da resolução', async () => {
    const app = open(ok, {
      visualization: 'BAR',
      config: {
        mapping: {
          x: 'loja',
          series: ['total'],
          stacked: false,
          horizontal: false,
        },
      },
    })
    await openMenu(app)
    const item = await screen.findByRole('menuitem', { name: 'Exportar PNG' })
    await waitFor(() => expect(item).not.toHaveAttribute('aria-disabled'))
    await app.user.click(item)

    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(1))
    const [card, options] = toPng.mock.calls[0] as [
      HTMLElement,
      { pixelRatio: number; filter: (node: unknown) => boolean },
    ]
    expect(card).toContainElement(
      screen.getByRole('heading', { name: 'Vendas por mês' }),
    )
    expect(card.querySelector('.recharts-wrapper')).not.toBeNull()
    expect(options.pixelRatio).toBe(1 * 2)
    const trigger = screen.getByRole('button', {
      name: 'Exportar widget Vendas por mês',
    })
    expect(options.filter(trigger)).toBe(false)
    expect(
      options.filter(screen.getByRole('heading', { name: 'Vendas por mês' })),
    ).toBe(true)
    await waitFor(() => expect(downloads).toHaveLength(1))

    // tela com o dobro de pixels: o dobro da resolução da tela
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 2,
    })
    await openMenu(app)
    await app.user.click(
      await screen.findByRole('menuitem', { name: 'Exportar PNG' }),
    )
    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(2))
    expect(
      (toPng.mock.calls[1] as [unknown, { pixelRatio: number }])[1].pixelRatio,
    ).toBe(4)
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 1,
    })

    // falha da imagem: aviso
    toPng.mockRejectedValueOnce(new Error('canvas contaminado'))
    await openMenu(app)
    await app.user.click(
      await screen.findByRole('menuitem', { name: 'Exportar PNG' }),
    )
    expect(
      await screen.findByText('Não foi possível exportar a imagem'),
    ).toBeInTheDocument()
  })

  it('EXP-07 arquivos baixados usam o título e a data', async () => {
    const app = open(ok)
    await screen.findByText('Página 1 de 3')
    await openMenu(app)
    await app.user.click(
      await screen.findByRole('menuitem', { name: 'Exportar CSV' }),
    )
    await waitFor(() =>
      expect(downloads).toEqual(['Vendas-por-mês-2026-11-16.csv']),
    )
    await openMenu(app)
    await app.user.click(
      await screen.findByRole('menuitem', { name: 'Exportar PNG' }),
    )
    await waitFor(() =>
      expect(downloads).toEqual([
        'Vendas-por-mês-2026-11-16.csv',
        'Vendas-por-mês-2026-11-16.png',
      ]),
    )
  })

  it('EXP-08 exportar fica desabilitado carregando, sem dados ou com erro', async () => {
    const respostas: Array<{
      name: string
      result: () => Response | Promise<Response>
    }> = [
      {
        name: 'carregando',
        result: async () => {
          await delay('infinite')
          return HttpResponse.json(MANY)
        },
      },
      {
        name: 'sem dados',
        result: () =>
          HttpResponse.json(
            makeQueryResult({
              columns: ['loja'],
              rows: [],
            } as Partial<QueryResultDto>),
          ),
      },
      {
        name: 'erro',
        result: () =>
          HttpResponse.json(
            { code: 'QUERY_FAILED', message: 'falhou' },
            { status: 422 },
          ),
      },
    ]
    for (const { result } of respostas) {
      const app = open(result)
      await new Promise((resolve) => setTimeout(resolve, 150))
      await openMenu(app)
      for (const name of ['Exportar CSV', 'Exportar PNG']) {
        expect(await screen.findByRole('menuitem', { name })).toHaveAttribute(
          'aria-disabled',
          'true',
        )
      }
      app.unmount()
    }

    const app = open(ok)
    await screen.findByText('Página 1 de 3')
    await openMenu(app)
    for (const name of ['Exportar CSV', 'Exportar PNG']) {
      expect(await screen.findByRole('menuitem', { name })).not.toHaveAttribute(
        'aria-disabled',
      )
    }
  })
})
