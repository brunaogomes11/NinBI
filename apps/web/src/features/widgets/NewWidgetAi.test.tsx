import { MESSAGES } from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http, type RequestHandler } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockElementSize } from '@/test/element-size'
import { connectionsHandler, makeConnection } from '@/test/fixtures/connections'
import {
  makeDashboard,
  makeQueryResult,
  sidebarHandler,
} from '@/test/fixtures/dashboards'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

const URL_PATH = '/api/dashboards/d-1/ai/widget'
const FIELD = 'Descreva o que você quer ver'
const GENERATED_CYPHER =
  'MATCH (p:Produto) RETURN p.categoria AS categoria, count(*) AS total'

let restoreSize: () => void
beforeEach(() => {
  restoreSize = mockElementSize(600, 300)
})
afterEach(() => restoreSize())

function ndjson(events: object[]): Response {
  const text = events.map((event) => `${JSON.stringify(event)}\n`).join('')
  return new HttpResponse(text, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  })
}

const done = {
  type: 'done',
  attempts: 1,
  cypher: GENERATED_CYPHER,
  visualization: 'BAR',
  mapping: {
    x: 'categoria',
    series: ['total'],
    stacked: false,
    horizontal: false,
  },
  title: 'Itens por categoria',
  result: makeQueryResult({
    columns: ['categoria', 'total'],
    rows: [
      ['A', 3],
      ['B', 5],
    ],
  }),
}

function open(configured: boolean, ...handlers: RequestHandler[]) {
  return renderApp('/dashboards/d-1?editar=1', {
    handlers: [
      ...handlers,
      http.get('/api/ai/status', () => HttpResponse.json({ configured })),
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      sidebarHandler([{ type: 'dashboard', id: 'd-1', name: 'Vendas' }]),
      connectionsHandler([makeConnection({ id: 'c-1', name: 'Vendas' })]),
      http.get('/api/dashboards/d-1', () => HttpResponse.json(makeDashboard())),
      http.post('/api/dashboards/:id/query', () =>
        HttpResponse.json(makeQueryResult()),
      ),
      http.post('/api/dashboards/:id/widgets/:widgetId/run', () =>
        HttpResponse.json(makeQueryResult()),
      ),
    ],
  })
}

async function statusLoaded(view: ReturnType<typeof open>) {
  await screen.findByRole('heading', { name: 'Vendas por loja' })
  await waitFor(() =>
    expect(view.queryClient.getQueryData(['ai-status'])).toBeDefined(),
  )
}

async function newWidget(user: ReturnType<typeof open>['user']) {
  await user.click(await screen.findByRole('button', { name: 'Novo widget' }))
  return screen.findByRole('dialog', { name: 'Editar widget' })
}

describe('Novo widget com a IA', () => {
  it('AIQ-02 Novo widget mostra Descreva o que você quer ver antes do editor de Cypher', async () => {
    const withAi = open(true)
    // aguarda o status chegar antes de abrir o diálogo
    await screen.findByRole('heading', { name: 'Vendas por loja' })
    await statusLoaded(withAi)
    await withAi.user.click(screen.getByRole('button', { name: 'Novo widget' }))
    await screen.findByLabelText(FIELD)
    const dialog = screen.getByRole('dialog', { name: 'Editar widget' })
    const field = within(dialog).getByLabelText(FIELD)
    const cypher = within(dialog).getByLabelText('Cypher')
    expect(
      field.compareDocumentPosition(cypher) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    withAi.unmount()

    // AIQ-16: sem provedor o campo continua lá, desabilitado, com a mensagem.
    const withoutAi = open(false)
    await statusLoaded(withoutAi)
    const dialogWithout = await newWidget(withoutAi.user)
    expect(within(dialogWithout).getByLabelText('Cypher')).toBeInTheDocument()
    expect(within(dialogWithout).getByLabelText(FIELD)).toBeDisabled()
    expect(
      within(dialogWithout).getByText(MESSAGES.llmNotConfigured),
    ).toBeInTheDocument()
    expect(
      within(dialogWithout).getByRole('button', { name: 'Enviar' }),
    ).toBeDisabled()
  })

  it('AIQ-02 enviar a descrição com done fecha o diálogo e o widget mostra o título gerado', async () => {
    const view = open(
      true,
      http.post(URL_PATH, () => ndjson([done])),
    )
    await screen.findByRole('heading', { name: 'Vendas por loja' })
    await statusLoaded(view)
    await view.user.click(screen.getByRole('button', { name: 'Novo widget' }))
    await screen.findByLabelText(FIELD)

    await view.user.type(screen.getByLabelText(FIELD), 'itens por categoria')
    await view.user.click(screen.getByRole('button', { name: 'Enviar' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Editar widget' }),
      ).toBeNull(),
    )
    expect(
      await screen.findByRole('heading', { name: 'Itens por categoria' }),
    ).toBeInTheDocument()
  })

  it('AIQ-02 falha da IA deixa o diálogo aberto com o Cypher e a mensagem', async () => {
    const message = 'Somente consultas de leitura são permitidas'
    const view = open(
      true,
      http.post(URL_PATH, () =>
        ndjson([
          {
            type: 'failed',
            attempts: 4,
            cypher: 'MATCH (n) DELETE n',
            message,
          },
        ]),
      ),
    )
    await screen.findByRole('heading', { name: 'Vendas por loja' })
    await statusLoaded(view)
    await view.user.click(screen.getByRole('button', { name: 'Novo widget' }))
    await screen.findByLabelText(FIELD)

    await view.user.type(screen.getByLabelText(FIELD), 'apague tudo')
    await view.user.click(screen.getByRole('button', { name: 'Enviar' }))

    const dialog = await screen.findByRole('dialog', { name: 'Editar widget' })
    await waitFor(() =>
      expect(within(dialog).getByLabelText('Cypher')).toHaveValue(
        'MATCH (n) DELETE n',
      ),
    )
    expect(within(dialog).getByText(message)).toBeInTheDocument()
  })
})
