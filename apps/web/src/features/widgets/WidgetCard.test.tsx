import { MESSAGES, type WidgetDto } from '@ninbi/contracts'
import { screen, waitFor } from '@testing-library/react'
import { delay, HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { makeQueryResult, makeWidget } from '@/test/fixtures/dashboards'
import { renderApp } from '@/test/renderApp'
import { WidgetCard } from './WidgetCard'

const RUN_URL = '/api/dashboards/d-1/widgets/w-1/run'

function openCard(
  widget: WidgetDto,
  handler: ReturnType<typeof http.post>[] = [],
) {
  return renderApp('/', {
    routes: [
      {
        path: '/',
        element: <WidgetCard dashboardId="d-1" version={1} widget={widget} />,
      },
    ],
    handlers: handler,
  })
}

describe('WidgetCard', () => {
  it('GRID-07 widget é um card do tema com o título no topo', async () => {
    openCard(makeWidget({ title: 'Vendas por loja' }), [
      http.post(RUN_URL, () => HttpResponse.json(makeQueryResult())),
    ])
    const title = await screen.findByRole('heading', {
      name: 'Vendas por loja',
    })
    const card = title.parentElement
    expect(card).toHaveClass('bg-card', 'rounded-card')
    expect(card?.firstElementChild).toBe(title)
    expect(await screen.findByText('Centro')).toBeInTheDocument()
  })

  it('TBL-09 esqueleto no card enquanto a consulta roda', async () => {
    const { container } = openCard(makeWidget(), [
      http.post(RUN_URL, async () => {
        await delay('infinite')
        return HttpResponse.json(makeQueryResult())
      }),
    ])
    await waitFor(() =>
      expect(
        container.querySelectorAll('[data-slot="skeleton"]').length,
      ).toBeGreaterThan(0),
    )
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('TBL-10 consulta sem linhas mostra A consulta não retornou dados', async () => {
    openCard(makeWidget(), [
      http.post(RUN_URL, () =>
        HttpResponse.json(makeQueryResult({ rows: [] })),
      ),
    ])
    expect(await screen.findByText(MESSAGES.queryNoData)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('TBL-11 erro mostra a mensagem e Tentar novamente para quem edita', async () => {
    let failing = true
    const { user } = openCard(makeWidget(), [
      http.post(RUN_URL, () =>
        failing
          ? HttpResponse.json(
              { code: 'QUERY_FAILED', message: 'Variable `l` not defined' },
              { status: 422 },
            )
          : HttpResponse.json(makeQueryResult()),
      ),
    ])
    expect(
      await screen.findByText('Variable `l` not defined'),
    ).toBeInTheDocument()

    failing = false
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Centro')).toBeInTheDocument()
    expect(
      screen.queryByText('Variable `l` not defined'),
    ).not.toBeInTheDocument()
  })

  it('TBL-12 erro mostra Não foi possível carregar este widget para quem só vê', async () => {
    openCard(makeWidget({ cypher: null, hasQuery: true }), [
      http.post(RUN_URL, () =>
        HttpResponse.json(
          { code: 'QUERY_FAILED', message: MESSAGES.widgetLoadFailed },
          { status: 422 },
        ),
      ),
    ])
    expect(
      await screen.findByText('Não foi possível carregar este widget'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/MATCH/)).not.toBeInTheDocument()
  })

  it('TBL-12 mensagem crua do servidor não aparece para quem só vê', async () => {
    openCard(makeWidget({ cypher: null, hasQuery: true }), [
      http.post(RUN_URL, () =>
        HttpResponse.json(
          {
            code: 'QUERY_WRITE_BLOCKED',
            message: MESSAGES.queryWriteBlocked('CREATE'),
          },
          { status: 400 },
        ),
      ),
    ])
    expect(
      await screen.findByText('Não foi possível carregar este widget'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/CREATE/)).not.toBeInTheDocument()
  })

  it('TBL-14 widget sem Cypher mostra Widget sem consulta', async () => {
    let requests = 0
    openCard(makeWidget({ cypher: null, hasQuery: false }), [
      http.post(RUN_URL, () => {
        requests += 1
        return HttpResponse.json(makeQueryResult())
      }),
    ])
    expect(await screen.findByText('Widget sem consulta')).toBeInTheDocument()
    await delay(50)
    expect(requests).toBe(0)
  })
})
