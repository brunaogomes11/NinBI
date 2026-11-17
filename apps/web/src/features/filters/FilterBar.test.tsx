import type { DashboardDto, DashboardFilter } from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { connectionsHandler } from '@/test/fixtures/connections'
import {
  makeDashboard,
  makeQueryResult,
  makeWidget,
} from '@/test/fixtures/dashboards'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

const CATEGORIA: DashboardFilter = {
  id: 'f-categoria',
  label: 'Categoria',
  parameter: 'categoria',
  type: 'SINGLE_SELECT',
  options: { source: 'STATIC', values: ['Livros', 'Jogos'] },
  defaultValue: 'Livros',
}
const BUSCA: DashboardFilter = {
  id: 'f-busca',
  label: 'Busca',
  parameter: 'busca',
  type: 'TEXT',
  options: null,
  defaultValue: null,
}

function dashboardWith(overrides: Partial<DashboardDto> = {}) {
  return makeDashboard({
    tabs: [
      {
        id: 't-1',
        name: 'Aba 1',
        widgets: [
          makeWidget({ id: 'w-1', title: 'Vendas', parameters: ['categoria'] }),
        ],
      },
      {
        id: 't-2',
        name: 'Aba 2',
        widgets: [makeWidget({ id: 'w-2', title: 'Estoque' })],
      },
    ],
    filters: [CATEGORIA, BUSCA],
    ...overrides,
  })
}

function open(path: string, dashboard: DashboardDto) {
  return renderApp(path, {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      connectionsHandler(),
      http.get('/api/dashboards/d-1', () => HttpResponse.json(dashboard)),
      http.post('/api/dashboards/:id/widgets/:widgetId/run', () =>
        HttpResponse.json(makeQueryResult()),
      ),
      http.post('/api/dashboards/:id/query', () =>
        HttpResponse.json(makeQueryResult()),
      ),
    ],
  })
}

async function choose(
  user: ReturnType<typeof renderApp>['user'],
  filter: string,
  option: string,
) {
  await user.click(await screen.findByRole('combobox', { name: filter }))
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('FilterBar', () => {
  it('FLT-07 dashboard abre com a barra de filtros no valor padrão', async () => {
    open('/dashboards/d-1', dashboardWith())
    expect(
      await screen.findByRole('combobox', { name: 'Categoria' }),
    ).toHaveTextContent('Livros')
    expect(screen.getByRole('textbox', { name: 'Busca' })).toHaveValue('')
    expect(screen.getByText('Categoria')).toBeInTheDocument()
    expect(screen.getByText('Busca')).toBeInTheDocument()
  })

  it('FLT-08 a mesma barra com os mesmos valores aparece em todas as abas', async () => {
    const { user } = open('/dashboards/d-1', dashboardWith())
    await choose(user, 'Categoria', 'Jogos')
    await user.click(screen.getByRole('tab', { name: 'Aba 2' }))
    expect(
      await screen.findByRole('combobox', { name: 'Categoria' }),
    ).toHaveTextContent('Jogos')
    expect(screen.getByRole('textbox', { name: 'Busca' })).toBeInTheDocument()
  })

  it('FLT-15 Limpar filtros devolve os valores padrão', async () => {
    const { user } = open('/dashboards/d-1', dashboardWith())
    await choose(user, 'Categoria', 'Jogos')
    await user.type(screen.getByRole('textbox', { name: 'Busca' }), 'abc')
    // o texto só é aplicado 500 ms depois da última tecla
    await new Promise((resolve) => setTimeout(resolve, 600))
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'Categoria' }),
      ).toHaveTextContent('Livros'),
    )
    expect(screen.getByRole('textbox', { name: 'Busca' })).toHaveValue('')
  })

  it('FLT-18 Novo filtro, Editar filtro e Remover filtro só em edição para quem pode editar', async () => {
    const dono = open('/dashboards/d-1', dashboardWith())
    await screen.findByRole('combobox', { name: 'Categoria' })
    expect(
      screen.queryByRole('button', { name: 'Novo filtro' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Ações do filtro Categoria' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Editar filtro')).not.toBeInTheDocument()
    dono.unmount()

    const editando = open('/dashboards/d-1?editar=1', dashboardWith())
    expect(
      await screen.findByRole('button', { name: 'Novo filtro' }),
    ).toBeInTheDocument()
    await editando.user.click(
      screen.getByRole('button', { name: 'Ações do filtro Categoria' }),
    )
    expect(
      await screen.findByRole('menuitem', { name: 'Editar filtro' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Remover filtro' }),
    ).toBeInTheDocument()
    editando.unmount()

    open(
      '/dashboards/d-1?editar=1',
      dashboardWith({
        permissions: { edit: false, delete: false, share: false },
      }),
    )
    await screen.findByRole('combobox', { name: 'Categoria' })
    expect(
      screen.queryByRole('button', { name: 'Novo filtro' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Ações do filtro Categoria' }),
    ).not.toBeInTheDocument()
  })

  it('FLT-21 barra de filtros quebra em mais linhas', async () => {
    open('/dashboards/d-1', dashboardWith())
    const chip = (
      await screen.findByRole('combobox', { name: 'Categoria' })
    ).closest('[data-filter-chip]')
    expect(chip?.parentElement).toHaveClass('flex', 'flex-wrap')
  })

  it('FLT-22 dashboard sem filtros não mostra a barra em visualização', async () => {
    const semFiltros = dashboardWith({ filters: [] })
    const view = open('/dashboards/d-1', semFiltros)
    await screen.findByRole('combobox', { name: 'Atualização automática' })
    expect(
      screen.queryByRole('button', { name: 'Limpar filtros' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Novo filtro' }),
    ).not.toBeInTheDocument()
    expect(screen.getAllByRole('combobox')).toHaveLength(1)
    view.unmount()

    open('/dashboards/d-1?editar=1', semFiltros)
    expect(
      await screen.findByRole('button', { name: 'Novo filtro' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Limpar filtros' }),
    ).not.toBeInTheDocument()
    const header = screen.getByRole('banner')
    expect(
      within(header).getByRole('button', { name: 'Novo filtro' }),
    ).toBeInTheDocument()
  })
})
