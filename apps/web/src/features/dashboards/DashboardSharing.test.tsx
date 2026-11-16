import { type DashboardDto, MESSAGES } from '@ninbi/contracts'
import { screen } from '@testing-library/react'
import { HttpResponse, http, type RequestHandler } from 'msw'
import { describe, expect, it } from 'vitest'
import { connectionsHandler, makeConnection } from '@/test/fixtures/connections'
import {
  makeDashboard,
  makeQueryResult,
  sidebarHandler,
} from '@/test/fixtures/dashboards'
import { sharesHandler, teamShare } from '@/test/fixtures/sharing'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

function open(
  path: string,
  dashboard: DashboardDto,
  options: { user?: ReturnType<typeof makeUser> } = {},
  ...handlers: RequestHandler[]
) {
  return renderApp(path, {
    handlers: [
      ...handlers,
      setupStatusHandler(false),
      sessionHandler(options.user ?? makeUser()),
      sidebarHandler([{ type: 'dashboard', id: 'd-1', name: dashboard.name }]),
      connectionsHandler([makeConnection({ id: 'c-1', name: 'Vendas' })]),
      http.get('/api/dashboards/d-1', () => HttpResponse.json(dashboard)),
      sharesHandler([teamShare({ name: 'Comercial' })]),
      http.post('/api/dashboards/:id/query', () =>
        HttpResponse.json(makeQueryResult()),
      ),
      http.post('/api/dashboards/:id/widgets/:widgetId/run', () =>
        HttpResponse.json(makeQueryResult()),
      ),
    ],
  })
}

const dashboardWith = (
  permissions: Partial<DashboardDto['permissions']>,
  overrides: Partial<DashboardDto> = {},
) =>
  makeDashboard({
    permissions: { edit: false, delete: false, share: false, ...permissions },
    ...overrides,
  })

const button = (name: string) => screen.queryByRole('button', { name })

describe('DashboardPage com compartilhamento', () => {
  it('SHARE-01 Compartilhar aparece só para o dono e Admins', async () => {
    const { unmount } = open(
      '/dashboards/d-1',
      dashboardWith({ edit: true, share: false }),
    )
    await screen.findByRole('heading', { name: 'Vendas' })
    expect(button(MESSAGES.shareTitle)).toBeNull()
    unmount()

    const { user } = open(
      '/dashboards/d-1',
      dashboardWith({ edit: true, delete: true, share: true }),
    )
    await user.click(
      await screen.findByRole('button', { name: MESSAGES.shareTitle }),
    )

    expect(await screen.findByText('Dono: Ana Souza')).toBeInTheDocument()
    expect(await screen.findByText('Comercial')).toBeInTheDocument()
  })

  it('ACL-06 quem pode ver não vê Editar, Excluir nem Compartilhar', async () => {
    open('/dashboards/d-1', dashboardWith({}))

    await screen.findByRole('heading', { name: 'Vendas' })
    expect(button('Editar')).toBeNull()
    expect(button('Mais ações')).toBeNull()
    expect(button(MESSAGES.shareTitle)).toBeNull()
    expect(button('Atualizar')).toBeInTheDocument()
  })

  it('ACL-07 quem pode editar vê Editar sem Excluir nem Compartilhar', async () => {
    open('/dashboards/d-1', dashboardWith({ edit: true }))

    expect(await screen.findByRole('button', { name: 'Editar' })).toBeVisible()
    expect(button('Mais ações')).toBeNull()
    expect(button(MESSAGES.shareTitle)).toBeNull()
  })

  it('ACL-08 quem não é o dono vê Compartilhado por com o nome do dono', async () => {
    const dashboard = dashboardWith({}, { ownerId: 'user-ana' })
    const guest = makeUser({ id: 'user-bia', name: 'Bia Costa' })
    const { unmount } = open('/dashboards/d-1', dashboard, { user: guest })

    expect(
      await screen.findByText('Compartilhado por Ana Souza'),
    ).toBeInTheDocument()
    unmount()

    open('/dashboards/d-1', dashboard)
    await screen.findByRole('heading', { name: 'Vendas' })
    expect(screen.queryByText(/Compartilhado por/)).toBeNull()
  })

  it('ACL-12 acesso removido mostra Dashboard não encontrado na próxima ação', async () => {
    const { user } = open(
      '/dashboards/d-1?editar=1',
      dashboardWith({ edit: true }),
      {},
      http.put('/api/dashboards/d-1', () =>
        HttpResponse.json(
          {
            code: 'DASHBOARD_NOT_FOUND',
            message: MESSAGES.dashboardNotFound,
          },
          { status: 404 },
        ),
      ),
    )

    await user.click(await screen.findByRole('button', { name: 'Salvar' }))

    expect(
      await screen.findByRole('heading', { name: MESSAGES.dashboardNotFound }),
    ).toBeInTheDocument()
  })

  it('ACL-13 salvar sem permissão mostra Você não tem mais permissão para editar este dashboard', async () => {
    const { user } = open(
      '/dashboards/d-1?editar=1',
      dashboardWith({ edit: true }),
      {},
      http.put('/api/dashboards/d-1', () =>
        HttpResponse.json(
          {
            code: 'DASHBOARD_EDIT_FORBIDDEN',
            message: MESSAGES.dashboardEditForbidden,
          },
          { status: 403 },
        ),
      ),
    )

    const field = await screen.findByLabelText('Nome')
    await user.clear(field)
    await user.type(field, 'Novo nome')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await screen.findByText(
        'Você não tem mais permissão para editar este dashboard',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Novo nome')
  })
})
