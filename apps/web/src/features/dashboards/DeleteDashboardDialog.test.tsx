import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { makeDashboard, makeQueryResult } from '@/test/fixtures/dashboards'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

interface Calls {
  deletes: number
}

function open(calls: Calls) {
  let deleted = false
  return renderApp('/dashboards/d-1', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      http.get('/api/sidebar', () =>
        HttpResponse.json({
          items: deleted
            ? []
            : [{ type: 'dashboard', id: 'd-1', name: 'Vendas' }],
          shared: [],
        }),
      ),
      http.get('/api/dashboards/d-1', () => HttpResponse.json(makeDashboard())),
      http.post('/api/dashboards/d-1/widgets/:widgetId/run', () =>
        HttpResponse.json(makeQueryResult()),
      ),
      http.delete('/api/dashboards/d-1', () => {
        calls.deletes += 1
        deleted = true
        return new Response(null, { status: 204 })
      }),
    ],
  })
}

async function openConfirmation(user: ReturnType<typeof open>['user']) {
  await user.click(await screen.findByRole('button', { name: 'Mais ações' }))
  await user.click(await screen.findByRole('menuitem', { name: 'Excluir' }))
  return screen.findByRole('alertdialog')
}

describe('DeleteDashboardDialog', () => {
  it('DASH-10 Excluir pede confirmação com o nome do dashboard', async () => {
    const calls: Calls = { deletes: 0 }
    const { user } = open(calls)

    const dialog = await openConfirmation(user)

    expect(dialog).toHaveTextContent(
      'Excluir o dashboard Vendas?Abas e widgets serão apagados. Esta ação não pode ser desfeita.',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(calls.deletes).toBe(0)
  })

  it('DASH-11 confirmar a exclusão tira o dashboard da sidebar e abre a página inicial', async () => {
    const calls: Calls = { deletes: 0 }
    const { user, router } = open(calls)
    expect(
      await screen.findByRole('link', { name: 'Vendas' }),
    ).toBeInTheDocument()
    const dialog = await openConfirmation(user)

    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(calls.deletes).toBe(1)
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Vendas' })).toBeNull(),
    )
    expect(
      await screen.findByRole('heading', { name: 'Nenhum dashboard ainda' }),
    ).toBeInTheDocument()
  })
})
