import type { DashboardDto } from '@ninbi/contracts'
import { act, screen, waitFor, within } from '@testing-library/react'
import { delay, HttpResponse, http, type RequestHandler } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  makeDashboard,
  makeQueryResult,
  makeWidget,
  sidebarHandler,
} from '@/test/fixtures/dashboards'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

const widget1 = makeWidget({ id: 'w-1', title: 'Vendas por loja' })
const widget2 = makeWidget({ id: 'w-2', title: 'Estoque por depósito' })

const twoTabs = (overrides: Partial<DashboardDto> = {}) =>
  makeDashboard({
    tabs: [
      { id: 't-1', name: 'Resumo', widgets: [widget1] },
      { id: 't-2', name: 'Estoque', widgets: [widget2] },
    ],
    ...overrides,
  })

const getDashboard = (dashboard: DashboardDto): RequestHandler =>
  http.get(`/api/dashboards/${dashboard.id}`, () =>
    HttpResponse.json(dashboard),
  )

const notFound = () =>
  HttpResponse.json(
    { code: 'DASHBOARD_NOT_FOUND', message: 'Dashboard não encontrado' },
    { status: 404 },
  )

/** `POST .../widgets/:widgetId/run`: guarda o id de cada chamada e responde com `respond`. */
function runHandler(
  calls: string[],
  respond: (
    widgetId: string,
    request: Request,
  ) => Response | Promise<Response> = () =>
    HttpResponse.json(makeQueryResult()),
): RequestHandler {
  return http.post(
    '/api/dashboards/:id/widgets/:widgetId/run',
    ({ params, request }) => {
      calls.push(String(params.widgetId))
      return respond(String(params.widgetId), request)
    },
  )
}

function open(path: string, ...handlers: RequestHandler[]) {
  return renderApp(path, {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      ...handlers,
    ],
  })
}

describe('DashboardPage', () => {
  it('DASH-08 abrir o dashboard mostra a primeira aba em visualização', async () => {
    const dashboard = twoTabs()
    const { user } = open(
      '/',
      sidebarHandler([{ type: 'dashboard', id: 'd-1', name: 'Vendas' }]),
      getDashboard(dashboard),
      runHandler([]),
    )

    await user.click(await screen.findByRole('link', { name: 'Vendas' }))

    expect(await screen.findByText('Vendas por loja')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Resumo' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Estoque' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(screen.queryByText('Estoque por depósito')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull()
  })

  it('DASH-13 URL de dashboard inexistente mostra Dashboard não encontrado com link para a página inicial', async () => {
    const { user, router } = open(
      '/dashboards/nao-existe',
      http.get('/api/dashboards/nao-existe', notFound),
    )

    expect(
      await screen.findByRole('heading', { name: 'Dashboard não encontrado' }),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('link', { name: 'Ir para a página inicial' }),
    )

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('DASH-15 dashboard excluído por outra pessoa mostra Dashboard não encontrado na próxima ação', async () => {
    const dashboard = twoTabs()
    let deleted = false
    const { user } = open(
      '/dashboards/d-1',
      getDashboard(dashboard),
      runHandler([], () =>
        deleted ? notFound() : HttpResponse.json(makeQueryResult()),
      ),
    )
    expect(await screen.findByText('Centro')).toBeInTheDocument()

    deleted = true
    await user.click(screen.getByRole('button', { name: 'Atualizar' }))

    expect(
      await screen.findByRole('heading', { name: 'Dashboard não encontrado' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Vendas por loja')).toBeNull()
  })

  it('DASH-18 Editar e Excluir aparecem só para quem pode', async () => {
    const cases = [
      { edit: false, delete: false },
      { edit: true, delete: false },
      { edit: true, delete: true },
    ]
    for (const permissions of cases) {
      const dashboard = twoTabs({ permissions })
      const { user, unmount } = open(
        '/dashboards/d-1',
        getDashboard(dashboard),
        runHandler([]),
      )
      await screen.findByRole('heading', { name: 'Vendas' })

      expect(
        await screen.findByRole('button', { name: 'Atualizar' }),
      ).toBeInTheDocument()
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: 'Editar' }) !== null).toBe(
          permissions.edit,
        ),
      )
      expect(
        screen.queryByRole('button', { name: 'Mais ações' }) !== null,
      ).toBe(permissions.delete)
      if (permissions.delete) {
        await user.click(screen.getByRole('button', { name: 'Mais ações' }))
        expect(
          await screen.findByRole('menuitem', { name: 'Excluir' }),
        ).toBeInTheDocument()
      }
      unmount()
    }
  })

  it('TAB-01 clicar numa aba mostra os widgets dela e a marca como ativa', async () => {
    const { user } = open(
      '/dashboards/d-1',
      getDashboard(twoTabs()),
      runHandler([]),
    )
    await screen.findByText('Vendas por loja')

    await user.click(screen.getByRole('tab', { name: 'Estoque' }))

    expect(await screen.findByText('Estoque por depósito')).toBeInTheDocument()
    expect(screen.queryByText('Vendas por loja')).toBeNull()
    expect(screen.getByRole('tab', { name: 'Estoque' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Resumo' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('TAB-02 a primeira exibição de uma aba executa as consultas dos widgets dela', async () => {
    const calls: string[] = []
    const { user } = open(
      '/dashboards/d-1',
      getDashboard(twoTabs()),
      runHandler(calls),
    )
    await screen.findByText('Centro')
    expect(calls).toEqual(['w-1'])

    await user.click(screen.getByRole('tab', { name: 'Estoque' }))
    await waitFor(() => expect(calls).toEqual(['w-1', 'w-2']))
    await screen.findByText('Estoque por depósito')
    await screen.findByText('Centro')

    await user.click(screen.getByRole('tab', { name: 'Resumo' }))
    await screen.findByText('Vendas por loja')
    await screen.findByText('Centro')
    expect(calls).toEqual(['w-1', 'w-2'])
  })

  it('TAB-07 aba sem widgets mostra Esta aba está vazia', async () => {
    const dashboard = makeDashboard({
      tabs: [{ id: 't-1', name: 'Aba 1', widgets: [] }],
    })
    open('/dashboards/d-1', getDashboard(dashboard))

    expect(await screen.findByText('Esta aba está vazia')).toBeInTheDocument()
  })

  it('TAB-08 barra de abas rola na horizontal sem quebrar linha', async () => {
    open('/dashboards/d-1', getDashboard(twoTabs()), runHandler([]))

    const bar = await screen.findByRole('tablist')

    expect(bar).toHaveClass('overflow-x-auto')
    expect(bar).toHaveClass('whitespace-nowrap')
  })

  it('GRID-04 em visualização não dá para arrastar nem redimensionar', async () => {
    const { container } = open(
      '/dashboards/d-1',
      getDashboard(twoTabs()),
      runHandler([]),
    )
    await screen.findByText('Vendas por loja')

    expect(
      container.querySelectorAll('.react-grid-item').length,
    ).toBeGreaterThan(0)
    expect(container.querySelectorAll('.react-draggable').length).toBe(0)
    expect(container.querySelectorAll('.react-resizable-handle').length).toBe(0)
  })

  it('TBL-13 widget com erro não impede os demais', async () => {
    const dashboard = makeDashboard({
      tabs: [
        {
          id: 't-1',
          name: 'Aba 1',
          widgets: [
            makeWidget({ id: 'w-ok', title: 'Com dados' }),
            makeWidget({ id: 'w-vazio', title: 'Sem linhas' }),
            makeWidget({ id: 'w-erro', title: 'Com erro' }),
          ],
        },
      ],
    })
    open(
      '/dashboards/d-1',
      getDashboard(dashboard),
      runHandler([], (id) => {
        if (id === 'w-vazio') {
          return HttpResponse.json(makeQueryResult({ rows: [] }))
        }
        if (id === 'w-erro') {
          return HttpResponse.json(
            { code: 'QUERY_FAILED', message: 'Falha do Neo4j' },
            { status: 422 },
          )
        }
        return HttpResponse.json(makeQueryResult())
      }),
    )

    expect(await screen.findByText('Centro')).toBeInTheDocument()
    expect(
      await screen.findByText('A consulta não retornou dados'),
    ).toBeInTheDocument()
    expect(await screen.findByText('Falha do Neo4j')).toBeInTheDocument()
  })

  it('TBL-15 Atualizar executa de novo os widgets da aba ativa', async () => {
    const calls: string[] = []
    const { user } = open(
      '/dashboards/d-1',
      getDashboard(twoTabs()),
      runHandler(calls),
    )
    await screen.findByText('Centro')
    await user.click(screen.getByRole('tab', { name: 'Estoque' }))
    await screen.findByText('Estoque por depósito')
    await screen.findByText('Centro')
    await user.click(screen.getByRole('tab', { name: 'Resumo' }))
    await screen.findByText('Vendas por loja')
    expect(calls).toEqual(['w-1', 'w-2'])

    await user.click(screen.getByRole('button', { name: 'Atualizar' }))

    await waitFor(() => expect(calls).toEqual(['w-1', 'w-2', 'w-1']))
  })

  it('TBL-17 resultado que chega depois de trocar de aba ou sair é descartado', async () => {
    const requests: Request[] = []
    const releases: (() => void)[] = []
    let widget1Calls = 0
    const { user, router, queryClient } = open(
      '/dashboards/d-1',
      getDashboard(twoTabs()),
      runHandler([], async (id, request) => {
        if (id === 'w-1') {
          widget1Calls += 1
          // 1ª e 3ª execuções do widget 1 ficam pendentes; a 2ª responde.
          if (widget1Calls !== 2) {
            requests.push(request)
            // O servidor ignora o aborto e entrega o resultado só depois (liberado no fim).
            await new Promise<void>((resolve) => releases.push(resolve))
            return HttpResponse.json(makeQueryResult({ rows: [['Tardio', 1]] }))
          }
        }
        return HttpResponse.json(makeQueryResult())
      }),
    )
    await waitFor(() => expect(requests).toHaveLength(1))
    expect(requests[0].signal.aborted).toBe(false)

    await user.click(screen.getByRole('tab', { name: 'Estoque' }))
    await waitFor(() => expect(requests[0].signal.aborted).toBe(true))
    await screen.findByText('Estoque por depósito')

    await user.click(screen.getByRole('tab', { name: 'Resumo' }))
    expect(await screen.findByText('Centro')).toBeInTheDocument()
    expect(widget1Calls).toBe(2)

    await user.click(screen.getByRole('button', { name: 'Atualizar' }))
    await waitFor(() => expect(requests).toHaveLength(2))
    expect(requests[1].signal.aborted).toBe(false)
    await act(() => router.navigate('/'))

    await waitFor(() => expect(requests[1].signal.aborted).toBe(true))
    expect(
      within(document.body).queryByText('Vendas por loja'),
    ).not.toBeInTheDocument()

    // Os resultados entregues depois do aborto não chegam à tela nem ao cache.
    for (const release of releases) release()
    await delay(100)
    expect(screen.queryByText('Tardio')).not.toBeInTheDocument()
    expect(JSON.stringify(queryClient.getQueryCache().findAll())).not.toContain(
      'Tardio',
    )
  })
})
