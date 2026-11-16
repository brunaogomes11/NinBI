import { type DashboardDto, MESSAGES } from '@ninbi/contracts'
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

const connections = connectionsHandler([
  makeConnection({ id: 'c-1', name: 'Vendas' }),
  makeConnection({ id: 'c-2', name: 'Estoque' }),
])

const getDashboard = (dashboard: DashboardDto): RequestHandler =>
  http.get(`/api/dashboards/${dashboard.id}`, () =>
    HttpResponse.json(dashboard),
  )

/** `POST .../query` (execução em edição): guarda cada corpo recebido. */
function queryHandler(bodies: Record<string, unknown>[]): RequestHandler {
  return http.post('/api/dashboards/:id/query', async ({ request }) => {
    bodies.push((await request.json()) as Record<string, unknown>)
    return HttpResponse.json(makeQueryResult())
  })
}

/** `PUT /api/dashboards/:id`: guarda o corpo e responde com `respond`. */
function putHandler(
  bodies: Record<string, unknown>[],
  respond: (body: Record<string, unknown>) => Response | Promise<Response>,
): RequestHandler {
  return http.put('/api/dashboards/:id', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    bodies.push(body)
    return respond(body)
  })
}

function open(
  path: string,
  dashboard: DashboardDto,
  ...handlers: RequestHandler[]
) {
  return renderApp(path, {
    handlers: [
      ...handlers,
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      sidebarHandler([
        { type: 'dashboard', id: 'd-1', name: 'Vendas' },
        { type: 'dashboard', id: 'd-2', name: 'Outro' },
      ]),
      connections,
      getDashboard(dashboard),
      getDashboard(makeDashboard({ id: 'd-2', name: 'Outro' })),
      queryHandler([]),
    ],
  })
}

const saved = (overrides: Partial<DashboardDto> = {}) =>
  makeDashboard({ name: 'Vendas', ...overrides })

async function enterEdit(user: ReturnType<typeof open>['user']) {
  await user.click(await screen.findByRole('button', { name: 'Editar' }))
  return screen.findByRole('button', { name: 'Salvar' })
}

async function rename(user: ReturnType<typeof open>['user'], name: string) {
  const field = await screen.findByLabelText('Nome')
  await user.clear(field)
  await user.type(field, name)
}

describe('DashboardPage em edição', () => {
  it('EDIT-01 Editar entra em modo de edição com Salvar e Descartar', async () => {
    const { user } = open('/dashboards/d-1', saved())

    await enterEdit(user)

    expect(screen.getByRole('button', { name: 'Descartar' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
    expect(screen.getByLabelText('Nome')).toHaveValue('Vendas')
  })

  it('DASH-05 abrir com editar=1 mostra o dashboard já em modo de edição', async () => {
    const first = open('/dashboards/d-1?editar=1', saved())

    expect(
      await screen.findByRole('button', { name: 'Salvar' }),
    ).toBeInTheDocument()
    first.unmount()

    // sem permissão de edição, o parâmetro é ignorado
    open(
      '/dashboards/d-1?editar=1',
      saved({ permissions: { edit: false, delete: false } }),
    )
    await screen.findByRole('heading', { name: 'Vendas' })
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
  })

  it('EDIT-02 Salvar envia o rascunho inteiro e volta à visualização', async () => {
    const puts: Record<string, unknown>[] = []
    const { user } = open(
      '/dashboards/d-1',
      saved(),
      putHandler(puts, () =>
        HttpResponse.json(saved({ name: 'Vendas 2026', version: 2 })),
      ),
    )
    await enterEdit(user)
    await rename(user, 'Vendas 2026')

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await screen.findByRole('button', { name: 'Editar' }),
    ).toBeInTheDocument()
    expect(puts).toHaveLength(1)
    expect(puts[0]).toMatchObject({
      version: 1,
      name: 'Vendas 2026',
      connectionId: 'c-1',
      tabs: [
        {
          id: 't-1',
          name: 'Aba 1',
          widgets: [{ id: 'w-1', title: 'Vendas por loja' }],
        },
      ],
    })
    expect(
      screen.getByRole('heading', { name: 'Vendas 2026' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull()
  })

  it('EDIT-03 falha ao salvar mantém a edição e mostra Não foi possível salvar', async () => {
    const { user } = open(
      '/dashboards/d-1',
      saved(),
      putHandler([], () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'Erro interno' },
          { status: 500 },
        ),
      ),
    )
    await enterEdit(user)
    await rename(user, 'Novo nome')

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await screen.findByText(MESSAGES.dashboardSaveFailed),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Novo nome')
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()
  })

  it('EDIT-04 409 mostra Este dashboard foi alterado por outra pessoa', async () => {
    const { user } = open(
      '/dashboards/d-1',
      saved(),
      putHandler([], () =>
        HttpResponse.json(
          {
            code: 'DASHBOARD_VERSION_CONFLICT',
            message: MESSAGES.dashboardVersionConflict,
          },
          { status: 409 },
        ),
      ),
    )
    await enterEdit(user)
    await rename(user, 'Novo nome')

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await screen.findByText(MESSAGES.dashboardVersionConflict),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
  })

  it('EDIT-05 Descartar com alterações pede confirmação', async () => {
    const { user } = open('/dashboards/d-1', saved())
    await enterEdit(user)

    // sem alterações, sai direto
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(
      await screen.findByRole('button', { name: 'Editar' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(MESSAGES.discardChanges)).toBeNull()

    // com alterações, pede confirmação e "Cancelar" mantém a edição
    await enterEdit(user)
    await rename(user, 'Mudou')
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(await screen.findByText(MESSAGES.discardChanges)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() =>
      expect(screen.queryByText(MESSAGES.discardChanges)).toBeNull(),
    )
    expect(screen.getByLabelText('Nome')).toHaveValue('Mudou')
  })

  it('EDIT-06 confirmar o descarte volta ao último estado salvo', async () => {
    const puts: Record<string, unknown>[] = []
    const { user } = open(
      '/dashboards/d-1',
      saved(),
      putHandler(puts, () => HttpResponse.json(saved())),
    )
    await enterEdit(user)
    await rename(user, 'Mudou')
    await user.click(screen.getByRole('button', { name: 'Descartar' }))

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Descartar' }))

    expect(
      await screen.findByRole('heading', { name: 'Vendas' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.queryByText('Mudou')).toBeNull()
    expect(puts).toHaveLength(0)
  })

  it('EDIT-07 sair da página com alterações pede confirmação', async () => {
    const { user, router } = open('/dashboards/d-1', saved())
    await enterEdit(user)
    await rename(user, 'Mudou')

    await user.click(screen.getByRole('link', { name: 'Outro' }))

    expect(
      await screen.findByText(MESSAGES.leaveWithoutSaving),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() =>
      expect(screen.queryByText(MESSAGES.leaveWithoutSaving)).toBeNull(),
    )
    expect(router.state.location.pathname).toBe('/dashboards/d-1')
    expect(screen.getByLabelText('Nome')).toHaveValue('Mudou')

    await user.click(screen.getByRole('link', { name: 'Outro' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Sair' }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/dashboards/d-2'),
    )
  })

  it('EDIT-08 alterar nome e conexão muda o rascunho', async () => {
    const { user } = open('/dashboards/d-1', saved())
    await enterEdit(user)

    await rename(user, 'Vendas 2026')
    await user.click(screen.getByRole('combobox', { name: 'Conexão' }))
    await user.click(await screen.findByRole('option', { name: 'Estoque' }))

    expect(
      screen.getByRole('heading', { name: 'Vendas 2026' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Conexão' })).toHaveTextContent(
      'Estoque',
    )
  })

  it('EDIT-09 Salvar fica desabilitado durante a gravação', async () => {
    const { user } = open(
      '/dashboards/d-1',
      saved(),
      putHandler([], async () => {
        await delay('infinite')
        return HttpResponse.json(saved())
      }),
    )
    await enterEdit(user)
    await rename(user, 'Mudou')

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled(),
    )
  })

  it('EDIT-10 trocar a conexão executa de novo os widgets da aba ativa', async () => {
    const bodies: Record<string, unknown>[] = []
    const { user } = open('/dashboards/d-1', saved(), queryHandler(bodies))
    await enterEdit(user)
    await waitFor(() =>
      expect(bodies.map((body) => body.connectionId)).toEqual(['c-1']),
    )

    await user.click(screen.getByRole('combobox', { name: 'Conexão' }))
    await user.click(await screen.findByRole('option', { name: 'Estoque' }))

    await waitFor(() =>
      expect(bodies.map((body) => body.connectionId)).toEqual(['c-1', 'c-2']),
    )
  })
})
