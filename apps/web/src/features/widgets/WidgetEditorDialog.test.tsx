import { MESSAGES } from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { delay, HttpResponse, http, type RequestHandler } from 'msw'
import { describe, expect, it } from 'vitest'
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

type Respond = (body: {
  cypher: string
  connectionId: string
}) => Response | Promise<Response>

/** Abre o dashboard em edição, sem widgets, e abre o editor de um widget novo. */
async function openEditor(respond: Respond, bodies: unknown[] = []) {
  const dashboard = makeDashboard({
    tabs: [{ id: 't-1', name: 'Aba 1', widgets: [] }],
  })
  const handlers: RequestHandler[] = [
    setupStatusHandler(false),
    sessionHandler(makeUser()),
    sidebarHandler(),
    connectionsHandler([makeConnection({ id: 'c-1', name: 'Vendas' })]),
    http.get('/api/dashboards/d-1', () => HttpResponse.json(dashboard)),
    http.post('/api/dashboards/:id/query', async ({ request }) => {
      const body = (await request.json()) as {
        cypher: string
        connectionId: string
      }
      bodies.push(body)
      return respond(body)
    }),
  ]
  const app = renderApp('/dashboards/d-1?editar=1', { handlers })
  await app.user.click(
    await screen.findByRole('button', { name: 'Novo widget' }),
  )
  const dialog = await screen.findByRole('dialog')
  return { ...app, dialog: within(dialog) }
}

const ok: Respond = () => HttpResponse.json(makeQueryResult())

describe('WidgetEditorDialog', () => {
  it('WDG-01 Editar widget abre Título, editor de Cypher com realce, Executar e prévia', async () => {
    const { user, dialog } = await openEditor(ok)

    expect(dialog.getByLabelText('Título')).toHaveValue('Novo widget')
    expect(dialog.getByRole('button', { name: 'Executar' })).toBeInTheDocument()
    expect(dialog.getByRole('region', { name: 'Prévia' })).toBeInTheDocument()
    await user.type(
      dialog.getByRole('textbox', { name: 'Cypher' }),
      'MATCH (n) RETURN n',
    )

    const keywords = Array.from(
      document.querySelectorAll('.token.keyword'),
    ).map((token) => token.textContent)
    expect(keywords).toEqual(['MATCH', 'RETURN'])
  })

  it('WDG-02 Executar mostra o resultado em tabela na prévia', async () => {
    const bodies: unknown[] = []
    const { user, dialog } = await openEditor(
      () =>
        HttpResponse.json(
          makeQueryResult({
            columns: ['label', 'total'],
            rows: [['Loja', 12]],
          }),
        ),
      bodies,
    )
    const cypher = 'MATCH (n) RETURN labels(n) AS label, count(*) AS total'
    await user.type(dialog.getByRole('textbox', { name: 'Cypher' }), cypher)

    await user.click(dialog.getByRole('button', { name: 'Executar' }))

    expect(
      await dialog.findByRole('columnheader', { name: /label/ }),
    ).toBeInTheDocument()
    expect(
      dialog.getByRole('columnheader', { name: /total/ }),
    ).toBeInTheDocument()
    expect(bodies).toEqual([{ cypher, connectionId: 'c-1' }])
  })

  it('WDG-03 falha na execução mostra o erro na prévia e mantém o Cypher', async () => {
    const message =
      'Somente consultas de leitura são permitidas. Cláusula bloqueada: CREATE'
    const { user, dialog } = await openEditor(() =>
      HttpResponse.json(
        { code: 'QUERY_WRITE_BLOCKED', message },
        { status: 400 },
      ),
    )
    const editor = dialog.getByRole('textbox', { name: 'Cypher' })
    await user.type(editor, 'CREATE (n)')

    await user.click(dialog.getByRole('button', { name: 'Executar' }))

    expect(await dialog.findByText(message)).toBeInTheDocument()
    expect(editor).toHaveValue('CREATE (n)')
  })

  it('WDG-04 Executar fica desabilitado com o editor vazio', async () => {
    const { user, dialog } = await openEditor(ok)

    expect(dialog.getByRole('button', { name: 'Executar' })).toBeDisabled()

    await user.type(dialog.getByRole('textbox', { name: 'Cypher' }), 'RETURN 1')
    expect(dialog.getByRole('button', { name: 'Executar' })).toBeEnabled()
  })

  it('WDG-05 Aplicar fecha o editor e atualiza título e Cypher do widget', async () => {
    const bodies: unknown[] = []
    const { user, dialog } = await openEditor(ok, bodies)
    const title = dialog.getByLabelText('Título')
    await user.clear(title)
    await user.type(title, 'Pedidos')
    await user.type(dialog.getByRole('textbox', { name: 'Cypher' }), 'RETURN 1')

    await user.click(dialog.getByRole('button', { name: 'Aplicar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(
      await screen.findByRole('heading', { name: 'Pedidos' }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(bodies).toEqual([{ cypher: 'RETURN 1', connectionId: 'c-1' }]),
    )
  })

  it('WDG-06 Cancelar fecha o editor sem alterar o widget', async () => {
    const bodies: unknown[] = []
    const { user, dialog } = await openEditor(ok, bodies)
    await user.type(dialog.getByLabelText('Título'), ' mudou')
    await user.type(dialog.getByRole('textbox', { name: 'Cypher' }), 'RETURN 1')

    await user.click(dialog.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(
      screen.getByRole('heading', { name: 'Novo widget' }),
    ).toBeInTheDocument()
    expect(screen.getByText(MESSAGES.widgetNoQuery)).toBeInTheDocument()
    expect(bodies).toEqual([])
  })

  it('WDG-07 título inválido recusa Aplicar com a mensagem no campo Título', async () => {
    const { user, dialog } = await openEditor(ok)
    const title = dialog.getByLabelText('Título')

    await user.clear(title)
    await user.click(dialog.getByRole('button', { name: 'Aplicar' }))
    expect(await dialog.findByText(MESSAGES.widgetTitleRequired)).toBeVisible()

    await user.type(title, 'x'.repeat(81))
    await user.click(dialog.getByRole('button', { name: 'Aplicar' }))
    expect(await dialog.findByText(MESSAGES.widgetTitleTooLong)).toBeVisible()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('WDG-10 durante a execução mostra Executando e Executar fica desabilitado', async () => {
    const { user, dialog } = await openEditor(async () => {
      await delay('infinite')
      return HttpResponse.json(makeQueryResult())
    })
    await user.type(dialog.getByRole('textbox', { name: 'Cypher' }), 'RETURN 1')

    await user.click(dialog.getByRole('button', { name: 'Executar' }))

    const running = await dialog.findByRole('button', {
      name: MESSAGES.running,
    })
    expect(running).toBeDisabled()
  })
})
