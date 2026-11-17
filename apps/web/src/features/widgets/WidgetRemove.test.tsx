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

const dashboard = makeDashboard({
  tabs: [
    {
      id: 't-1',
      name: 'Aba 1',
      widgets: [
        makeWidget({ id: 'w-1', title: 'Vendas por loja' }),
        makeWidget({
          id: 'w-2',
          title: 'Estoque',
          layout: { x: 4, y: 0, w: 4, h: 4 },
        }),
      ],
    },
  ],
})

function open(path: string, puts: unknown[] = []) {
  const handlers: RequestHandler[] = [
    setupStatusHandler(false),
    sessionHandler(makeUser()),
    sidebarHandler(),
    connectionsHandler([makeConnection({ id: 'c-1', name: 'Vendas' })]),
    http.get('/api/dashboards/d-1', () => HttpResponse.json(dashboard)),
    http.post('/api/dashboards/:id/query', () =>
      HttpResponse.json(makeQueryResult()),
    ),
    http.post('/api/dashboards/:id/widgets/:widgetId/run', () =>
      HttpResponse.json(makeQueryResult()),
    ),
    http.put('/api/dashboards/:id', async ({ request }) => {
      puts.push(await request.json())
      return HttpResponse.json(dashboard)
    }),
  ]
  return renderApp(path, { handlers })
}

async function askToRemove(user: ReturnType<typeof open>['user']) {
  await user.click(
    await screen.findByRole('button', {
      name: 'Ações do widget Vendas por loja',
    }),
  )
  await user.click(
    await screen.findByRole('menuitem', { name: 'Remover widget' }),
  )
  return screen.findByRole('alertdialog')
}

describe('WidgetCard em edição', () => {
  it('WDG-08 Remover widget pede confirmação com o título', async () => {
    const { user } = open('/dashboards/d-1?editar=1')

    const dialog = await askToRemove(user)

    expect(
      within(dialog).getByText('Remover o widget Vendas por loja?'),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(
      screen.getByRole('heading', { name: 'Vendas por loja' }),
    ).toBeInTheDocument()
  })

  it('WDG-09 confirmar a remoção tira o widget do rascunho', async () => {
    const puts: unknown[] = []
    const { user } = open('/dashboards/d-1?editar=1', puts)

    const dialog = await askToRemove(user)
    await user.click(within(dialog).getByRole('button', { name: 'Remover' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Vendas por loja' }),
      ).toBeNull(),
    )
    expect(screen.getByRole('heading', { name: 'Estoque' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(puts).toHaveLength(1))
    const widgets = (puts[0] as { tabs: { widgets: { id: string }[] }[] })
      .tabs[0].widgets
    expect(widgets.map((widget) => widget.id)).toEqual(['w-2'])
  })

  it('WDG-08 fora da edição o menu do widget não aparece', async () => {
    open('/dashboards/d-1')

    await screen.findByRole('heading', { name: 'Vendas por loja' })

    expect(screen.queryByRole('button', { name: /Ações do widget/ })).toBeNull()
  })

  it('WDG-01 Editar widget no menu do card abre o editor com os dados do widget', async () => {
    const { user } = open('/dashboards/d-1?editar=1')
    await user.click(
      await screen.findByRole('button', {
        name: 'Ações do widget Vendas por loja',
      }),
    )

    await user.click(
      await screen.findByRole('menuitem', { name: 'Editar widget' }),
    )

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Título')).toHaveValue(
      'Vendas por loja',
    )
    expect(
      within(dialog).getByRole('textbox', { name: 'Consulta Cypher' }),
    ).toHaveValue('MATCH (l:Loja) RETURN l.nome AS loja')
  })
})
