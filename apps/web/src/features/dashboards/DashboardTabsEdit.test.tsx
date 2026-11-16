import { MESSAGES } from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http, type RequestHandler } from 'msw'
import { describe, expect, it } from 'vitest'
import { connectionsHandler, makeConnection } from '@/test/fixtures/connections'
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

function openEditing(dashboard = makeDashboard()) {
  const handlers: RequestHandler[] = [
    setupStatusHandler(false),
    sessionHandler(makeUser()),
    sidebarHandler(),
    connectionsHandler([makeConnection({ id: 'c-1', name: 'Vendas' })]),
    http.get(`/api/dashboards/${dashboard.id}`, () =>
      HttpResponse.json(dashboard),
    ),
    http.post('/api/dashboards/:id/query', () =>
      HttpResponse.json(makeQueryResult()),
    ),
  ]
  return renderApp(`/dashboards/${dashboard.id}?editar=1`, { handlers })
}

async function openTabMenu(
  user: ReturnType<typeof openEditing>['user'],
  tabName: string,
) {
  await user.click(
    await screen.findByRole('button', { name: `Menu da aba ${tabName}` }),
  )
}

describe('DashboardTabsBar em edição', () => {
  it('TAB-03 Nova aba adiciona Aba N e a ativa', async () => {
    const { user } = openEditing()

    await user.click(await screen.findByRole('button', { name: 'Nova aba' }))

    expect(screen.getByRole('tab', { name: 'Aba 2' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Aba 1' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(screen.getByText(MESSAGES.tabEmpty)).toBeInTheDocument()
  })

  it('TAB-04 renomear a aba mostra o novo nome', async () => {
    const { user } = openEditing()
    await openTabMenu(user, 'Aba 1')
    await user.click(
      await screen.findByRole('menuitem', { name: 'Renomear aba' }),
    )

    const dialog = await screen.findByRole('dialog')
    const field = within(dialog).getByLabelText('Nome')
    await user.clear(field)
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }))
    expect(await within(dialog).findByText(MESSAGES.nameRequired)).toBeVisible()

    await user.type(field, 'x'.repeat(41))
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }))
    expect(
      await within(dialog).findByText(MESSAGES.shortNameTooLong),
    ).toBeVisible()

    await user.clear(field)
    await user.type(field, 'Vendas')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('tab', { name: 'Vendas' })).toBeVisible()
    expect(screen.queryByRole('tab', { name: 'Aba 1' })).toBeNull()
  })

  it('TAB-05 Excluir aba com widgets pede confirmação com o nome e o número de widgets', async () => {
    const dashboard = makeDashboard({
      tabs: [
        {
          id: 't-1',
          name: 'Vendas',
          widgets: [
            makeWidget({ id: 'w-1' }),
            makeWidget({ id: 'w-2' }),
            makeWidget({ id: 'w-3' }),
          ],
        },
        { id: 't-2', name: 'Estoque', widgets: [] },
      ],
    })
    const { user } = openEditing(dashboard)
    await openTabMenu(user, 'Vendas')
    await user.click(
      await screen.findByRole('menuitem', { name: 'Excluir aba' }),
    )

    const dialog = await screen.findByRole('alertdialog')
    expect(
      within(dialog).getByText('Excluir a aba Vendas e seus 3 widgets?'),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }))

    await waitFor(() =>
      expect(screen.queryByRole('tab', { name: 'Vendas' })).toBeNull(),
    )
    expect(screen.getByRole('tab', { name: 'Estoque' })).toBeInTheDocument()
  })

  it('TAB-06 Excluir aba fica desabilitado com uma aba só', async () => {
    const { user } = openEditing()
    await openTabMenu(user, 'Aba 1')

    const item = await screen.findByRole('menuitem', { name: 'Excluir aba' })

    expect(item).toHaveAttribute('aria-disabled', 'true')
  })
})
