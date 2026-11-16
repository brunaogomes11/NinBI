import { MESSAGES } from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { delay, HttpResponse, http, type RequestHandler } from 'msw'
import { describe, expect, it } from 'vitest'
import { HomePage } from '@/features/home/HomePage'
import { AppShell } from '@/features/shell/AppShell'
import { connectionsHandler, makeConnection } from '@/test/fixtures/connections'
import { makeDashboard } from '@/test/fixtures/dashboards'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

// Rotas só com o shell: a página do dashboard ainda não existe nesta task.
const SHELL_ROUTES = [
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/dashboards/:dashboardId', element: <p>Página do dashboard</p> },
    ],
  },
]

const CONNECTION_ID = '5f0c1f2e-5d2b-4a53-9a77-2f6f1d6a8c10'
const NEW_ID = '9b1e6a6e-1b8f-4c3f-8d3e-0c6a7a5b2d11'

interface Counters {
  sidebarGets: number
  creates: unknown[]
}

function open(
  connections: ReturnType<typeof makeConnection>[],
  create: RequestHandler,
  counters: Counters,
) {
  return renderApp('/', {
    routes: SHELL_ROUTES,
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser({ role: 'EDITOR' })),
      connectionsHandler(connections),
      http.get('/api/sidebar', () => {
        counters.sidebarGets += 1
        return HttpResponse.json({ items: [], shared: [] })
      }),
      create,
    ],
  })
}

const createOk = (counters: Counters) =>
  http.post('/api/dashboards', async ({ request }) => {
    counters.creates.push(await request.json())
    return HttpResponse.json(makeDashboard({ id: NEW_ID }), { status: 201 })
  })

async function openDialog(user: ReturnType<typeof renderApp>['user']) {
  await user.click(
    await screen.findByRole('button', { name: 'Novo dashboard' }),
  )
  return screen.findByRole('dialog')
}

describe('NewDashboardDialog', () => {
  it('DASH-05 Novo dashboard cria o dashboard e abre a URL de edição', async () => {
    const counters: Counters = { sidebarGets: 0, creates: [] }
    const { user, router } = open(
      [makeConnection({ id: CONNECTION_ID, name: 'Vendas' })],
      createOk(counters),
      counters,
    )
    const dialog = await openDialog(user)
    await waitFor(() => expect(counters.sidebarGets).toBe(1))

    await user.type(within(dialog).getByLabelText('Nome'), 'Vendas')
    await user.click(within(dialog).getByRole('combobox', { name: 'Conexão' }))
    await user.click(await screen.findByRole('option', { name: 'Vendas' }))
    await user.click(within(dialog).getByRole('button', { name: 'Criar' }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/dashboards/${NEW_ID}`),
    )
    expect(router.state.location.search).toBe('?editar=1')
    expect(counters.creates).toEqual([
      { name: 'Vendas', connectionId: CONNECTION_ID },
    ])
    await waitFor(() => expect(counters.sidebarGets).toBe(2))
  })

  it('DASH-06 nome inválido mostra a mensagem no campo Nome sem enviar', async () => {
    const counters: Counters = { sidebarGets: 0, creates: [] }
    const { user } = open(
      [makeConnection({ id: CONNECTION_ID })],
      createOk(counters),
      counters,
    )
    const dialog = await openDialog(user)
    await user.click(within(dialog).getByRole('combobox', { name: 'Conexão' }))
    await user.click(await screen.findByRole('option', { name: 'Vendas' }))

    await user.click(within(dialog).getByRole('button', { name: 'Criar' }))
    expect(
      await within(dialog).findByText(MESSAGES.dashboardNameRequired),
    ).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Nome'), 'x'.repeat(81))
    await user.click(within(dialog).getByRole('button', { name: 'Criar' }))
    expect(
      await within(dialog).findByText(MESSAGES.dashboardNameTooLong),
    ).toBeInTheDocument()
    expect(
      within(dialog).queryByText(MESSAGES.dashboardNameRequired),
    ).toBeNull()
    expect(counters.creates).toEqual([])
  })

  it('DASH-07 sem conexões mostra o aviso e mantém Criar desabilitado', async () => {
    const counters: Counters = { sidebarGets: 0, creates: [] }
    const { user } = open([], createOk(counters), counters)
    const dialog = await openDialog(user)

    expect(
      await within(dialog).findByText(MESSAGES.dashboardNeedsConnection),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Criar' })).toBeDisabled()
  })

  it('DASH-16 dois cliques em Criar enviam um único pedido', async () => {
    const counters: Counters = { sidebarGets: 0, creates: [] }
    const { user } = open(
      [makeConnection({ id: CONNECTION_ID })],
      http.post('/api/dashboards', async ({ request }) => {
        counters.creates.push(await request.json())
        await delay('infinite')
        return HttpResponse.json(makeDashboard())
      }),
      counters,
    )
    const dialog = await openDialog(user)
    await user.type(within(dialog).getByLabelText('Nome'), 'Vendas')
    await user.click(within(dialog).getByRole('combobox', { name: 'Conexão' }))
    await user.click(await screen.findByRole('option', { name: 'Vendas' }))
    const create = within(dialog).getByRole('button', { name: 'Criar' })

    await user.click(create)
    await waitFor(() => expect(create).toBeDisabled())
    await user.click(create)

    expect(counters.creates).toHaveLength(1)
  })
})
