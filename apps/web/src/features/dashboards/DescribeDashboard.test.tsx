import { type AssistantMessageDto, MESSAGES } from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { connectionsHandler, makeConnection } from '@/test/fixtures/connections'
import { makeDashboard } from '@/test/fixtures/dashboards'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

const CONNECTION_ID = '5f0c1f2e-5d2b-4a53-9a77-2f6f1d6a8c10'
const NEW_ID = '9b1e6a6e-1b8f-4c3f-8d3e-0c6a7a5b2d11'
const MESSAGES_URL = `/api/dashboards/${NEW_ID}/assistant/messages`
const DESCRIPTION = 'Quero ver vendas por loja e estoque por categoria'

interface State {
  sidebarGets: number
  creates: unknown[]
  requests: Array<{ message: string; retryOf?: string }>
  stored: AssistantMessageDto[]
}

const userMessage = (text: string): AssistantMessageDto => ({
  id: 'm-1',
  role: 'USER',
  text,
  details: null,
  createdAt: '2026-11-17T10:00:00Z',
})

const ndjson = (events: object[]) =>
  new HttpResponse(events.map((e) => `${JSON.stringify(e)}\n`).join(''), {
    headers: { 'Content-Type': 'application/x-ndjson' },
  })

function open(options: {
  configured?: boolean
  stream?: (state: State, message: string) => Response
}) {
  const state: State = {
    sidebarGets: 0,
    creates: [],
    requests: [],
    stored: [],
  }
  const view = renderApp('/', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser({ role: 'EDITOR' })),
      connectionsHandler([
        makeConnection({ id: CONNECTION_ID, name: 'Vendas' }),
      ]),
      http.get('/api/sidebar', () => {
        state.sidebarGets += 1
        return HttpResponse.json({ items: [], shared: [] })
      }),
      http.get('/api/ai/status', () =>
        HttpResponse.json({ configured: options.configured ?? true }),
      ),
      http.post('/api/dashboards', async ({ request }) => {
        state.creates.push(await request.json())
        return HttpResponse.json(
          makeDashboard({
            id: NEW_ID,
            name: 'Painel novo',
            tabs: [{ id: 't-1', name: 'Aba 1', widgets: [] }],
          }),
          { status: 201 },
        )
      }),
      http.get(`/api/dashboards/${NEW_ID}`, () =>
        HttpResponse.json(
          makeDashboard({
            id: NEW_ID,
            name: 'Painel novo',
            tabs: [{ id: 't-1', name: 'Aba 1', widgets: [] }],
          }),
        ),
      ),
      http.get(MESSAGES_URL, () => HttpResponse.json(state.stored)),
      http.post(MESSAGES_URL, async ({ request }) => {
        const body = (await request.json()) as State['requests'][number]
        state.requests.push(body)
        return (
          options.stream?.(state, body.message) ??
          ndjson([
            { type: 'accepted', userMessage: userMessage(body.message) },
            {
              type: 'done',
              reply: {
                id: 'm-2',
                role: 'ASSISTANT',
                text: 'Pronto.',
                details: {
                  changes: [],
                  notApplied: [],
                  createdWidgets: 0,
                  failedWidgets: [],
                  discardedWidgets: 0,
                },
                createdAt: '2026-11-17T10:00:05Z',
              },
              actions: [],
            },
          ])
        )
      }),
    ],
  })
  return { ...view, state }
}

async function openDialog(user: ReturnType<typeof open>['user']) {
  await user.click(
    await screen.findByRole('button', { name: 'Novo dashboard' }),
  )
  return screen.findByRole('dialog')
}

async function chooseConnection(
  user: ReturnType<typeof open>['user'],
  dialog: HTMLElement,
) {
  await user.click(within(dialog).getByRole('combobox', { name: 'Conexão' }))
  await user.click(await screen.findByRole('option', { name: 'Vendas' }))
}

async function startDescribe(
  user: ReturnType<typeof open>['user'],
  dialog: HTMLElement,
) {
  await waitFor(() =>
    expect(
      within(dialog).getByRole('tab', { name: 'Descrever para a IA' }),
    ).toBeEnabled(),
  )
  await user.click(
    within(dialog).getByRole('tab', { name: 'Descrever para a IA' }),
  )
}

describe('Descrever para a IA', () => {
  it('GEN-01 Novo dashboard oferece Descrever para a IA com Nome, Conexão e Descrição', async () => {
    const { user } = open({})
    const dialog = await openDialog(user)
    expect(
      within(dialog).getByRole('tab', { name: 'Em branco' }),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Nome')).toBeInTheDocument()
    expect(
      within(dialog).getByRole('combobox', { name: 'Conexão' }),
    ).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Descrição')).toBeNull()

    await startDescribe(user, dialog)
    expect(within(dialog).getByLabelText('Nome')).toBeInTheDocument()
    expect(
      within(dialog).getByRole('combobox', { name: 'Conexão' }),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Descrição')).toBeInTheDocument()
  })

  it('GEN-10 Descrição vazia ou longa mostra a mensagem no campo', async () => {
    const { user, state } = open({})
    const dialog = await openDialog(user)
    await startDescribe(user, dialog)
    await user.type(within(dialog).getByLabelText('Nome'), 'Painel novo')
    await chooseConnection(user, dialog)

    await user.click(within(dialog).getByRole('button', { name: 'Criar' }))
    expect(
      await within(dialog).findByText('Informe a descrição'),
    ).toBeInTheDocument()

    const field = within(dialog).getByLabelText('Descrição')
    await user.click(field)
    await user.paste('a'.repeat(4001))
    await user.click(within(dialog).getByRole('button', { name: 'Criar' }))
    expect(
      await within(dialog).findByText('A descrição passa de 4.000 caracteres'),
    ).toBeInTheDocument()
    expect(within(dialog).queryByText('Informe a descrição')).toBeNull()
    expect(state.creates).toEqual([])
  })

  it('GEN-11 sem provedor Descrever para a IA fica desabilitado com Nenhum provedor de IA configurado', async () => {
    const { user } = open({ configured: false })
    const dialog = await openDialog(user)
    expect(
      await within(dialog).findByText(MESSAGES.llmNotConfigured),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('tab', { name: 'Descrever para a IA' }),
    ).toBeDisabled()
  })

  it('GEN-02 Descrever para a IA cria o dashboard e abre o assistente com a descrição como primeira mensagem', async () => {
    const { user, router, state } = open({})
    const dialog = await openDialog(user)
    await waitFor(() => expect(state.sidebarGets).toBe(1))
    await startDescribe(user, dialog)
    await user.type(within(dialog).getByLabelText('Nome'), 'Painel novo')
    await chooseConnection(user, dialog)
    await user.type(within(dialog).getByLabelText('Descrição'), DESCRIPTION)
    await user.click(within(dialog).getByRole('button', { name: 'Criar' }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/dashboards/${NEW_ID}`),
    )
    expect(state.creates).toEqual([
      { name: 'Painel novo', connectionId: CONNECTION_ID },
    ])
    const panel = await screen.findByRole('complementary', {
      name: 'Assistente',
    })
    expect(await within(panel).findByText(DESCRIPTION)).toBeInTheDocument()
    expect(await within(panel).findByText('Pronto.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
    expect(state.requests).toEqual([
      { message: DESCRIPTION, draft: expect.anything() },
    ])
    await waitFor(() => expect(state.sidebarGets).toBeGreaterThan(1))
    // o estado da navegação some: recarregar não envia de novo
    await waitFor(() => expect(router.state.location.state).toBeNull())
    expect(router.state.location.search).toBe('?editar=1')
    expect(state.requests).toHaveLength(1)
  })

  it('GEN-14 falha da geração inicial mantém o dashboard vazio em edição com o erro na conversa', async () => {
    const { user, router } = open({
      stream: (_state, message) =>
        ndjson([
          { type: 'accepted', userMessage: userMessage(message) },
          {
            type: 'provider_error',
            code: 'AI_PROVIDER_AUTH',
            message: 'O provedor de IA recusou a chave configurada',
          },
        ]),
    })
    const dialog = await openDialog(user)
    await startDescribe(user, dialog)
    await user.type(within(dialog).getByLabelText('Nome'), 'Painel novo')
    await chooseConnection(user, dialog)
    await user.type(within(dialog).getByLabelText('Descrição'), DESCRIPTION)
    await user.click(within(dialog).getByRole('button', { name: 'Criar' }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/dashboards/${NEW_ID}`),
    )
    const panel = await screen.findByRole('complementary', {
      name: 'Assistente',
    })
    expect(
      await within(panel).findByText(
        'O provedor de IA recusou a chave configurada',
      ),
    ).toBeInTheDocument()
    expect(
      within(panel).getByRole('button', { name: 'Tentar novamente' }),
    ).toBeInTheDocument()
    expect(screen.getByText(MESSAGES.tabEmpty)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
  })
})
