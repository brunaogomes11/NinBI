import type { DashboardDto, DashboardSaveInput } from '@ninbi/contracts'
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

const FILTER_ID = '6b0c2f3e-6a52-4a63-9a40-9d1d6f5d1a11'
const CYPHER = 'MATCH (c:Categoria) WHERE c.nome = $categoria RETURN c.nome'

function categoria() {
  return {
    id: FILTER_ID,
    label: 'Categoria',
    parameter: 'categoria',
    type: 'TEXT' as const,
    options: null,
    defaultValue: null,
  }
}

function dashboardWith(overrides: Partial<DashboardDto> = {}) {
  return makeDashboard({
    tabs: [
      {
        id: 't-1',
        name: 'Aba 1',
        widgets: [
          makeWidget({
            id: 'w-1',
            title: 'Vendas',
            cypher: CYPHER,
            parameters: ['categoria'],
            config: {
              mapping: { x: 'a' },
              crossFilter: { filterId: FILTER_ID, column: 'categoria' },
            },
          }),
          makeWidget({
            id: 'w-2',
            title: 'Estoque',
            cypher: CYPHER,
            parameters: ['categoria'],
          }),
        ],
      },
    ],
    ...overrides,
  })
}

function open(dashboard: DashboardDto, puts: DashboardSaveInput[] = []) {
  return renderApp('/dashboards/d-1?editar=1', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      connectionsHandler(),
      http.get('/api/dashboards/d-1', () => HttpResponse.json(dashboard)),
      http.post('/api/dashboards/:id/query', () =>
        HttpResponse.json(makeQueryResult()),
      ),
      http.post('/api/dashboards/:id/widgets/:widgetId/run', () =>
        HttpResponse.json(makeQueryResult()),
      ),
      http.post('/api/dashboards/d-1/filter-options', () =>
        HttpResponse.json({
          options: ['Eletrônicos', 'Livros'],
          truncated: false,
        }),
      ),
      http.put('/api/dashboards/d-1', async ({ request }) => {
        const body = (await request.json()) as DashboardSaveInput
        puts.push(body)
        return HttpResponse.json({ ...dashboard, version: 2 })
      }),
    ],
  })
}

type App = ReturnType<typeof open>

async function openNew(app: App) {
  await app.user.click(
    await screen.findByRole('button', { name: 'Novo filtro' }),
  )
  return within(await screen.findByRole('dialog'))
}

async function chooseType(app: App, label: string) {
  await app.user.click(screen.getByRole('combobox', { name: 'Tipo' }))
  await app.user.click(await screen.findByRole('option', { name: label }))
}

describe('FilterEditorDialog', () => {
  it('FLT-01 Novo filtro abre o formulário com Rótulo, Parâmetro, Tipo e Valor padrão', async () => {
    const app = open(dashboardWith({ filters: [] }))
    const dialog = await openNew(app)
    expect(dialog.getByLabelText('Rótulo')).toBeInTheDocument()
    expect(dialog.getByLabelText('Parâmetro')).toBeInTheDocument()
    expect(dialog.getByRole('combobox', { name: 'Tipo' })).toBeInTheDocument()
    expect(dialog.getByLabelText('Valor padrão')).toBeInTheDocument()
  })

  it('FLT-02 campo Tipo oferece os seis tipos na ordem', async () => {
    const app = open(dashboardWith({ filters: [] }))
    await openNew(app)
    await app.user.click(screen.getByRole('combobox', { name: 'Tipo' }))
    const options = await screen.findAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      'Seleção única',
      'Seleção múltipla',
      'Texto',
      'Número',
      'Data',
      'Intervalo de datas',
    ])
  })

  it('FLT-03 parâmetro inválido mostra a mensagem no campo', async () => {
    const app = open(dashboardWith({ filters: [categoria()] }))
    const dialog = await openNew(app)
    await app.user.type(dialog.getByLabelText('Rótulo'), 'Outro')
    await app.user.type(dialog.getByLabelText('Parâmetro'), '1ano')
    await app.user.click(dialog.getByRole('button', { name: 'Aplicar' }))
    expect(
      await dialog.findByText(
        'O parâmetro começa com uma letra e usa só letras, dígitos e _',
      ),
    ).toBeInTheDocument()

    await app.user.clear(dialog.getByLabelText('Parâmetro'))
    await app.user.type(dialog.getByLabelText('Parâmetro'), 'categoria')
    await app.user.click(dialog.getByRole('button', { name: 'Aplicar' }))
    expect(
      await dialog.findByText('Este parâmetro já é usado por outro filtro'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('FLT-04 rótulo vazio mostra Informe o rótulo no campo', async () => {
    const app = open(dashboardWith({ filters: [] }))
    const dialog = await openNew(app)
    await app.user.type(dialog.getByLabelText('Parâmetro'), 'categoria')
    await app.user.click(dialog.getByRole('button', { name: 'Aplicar' }))
    expect(await dialog.findByText('Informe o rótulo')).toBeInTheDocument()
  })

  it('FLT-05 tipo de seleção pede Lista fixa ou Consulta Cypher', async () => {
    const app = open(dashboardWith({ filters: [] }))
    const dialog = await openNew(app)
    expect(dialog.queryByText('Origem das opções')).not.toBeInTheDocument()

    await chooseType(app, 'Seleção única')
    await app.user.click(
      dialog.getByRole('combobox', { name: 'Origem das opções' }),
    )
    const options = await screen.findAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      'Lista fixa',
      'Consulta Cypher',
    ])
    await app.user.keyboard('{Escape}')

    await chooseType(app, 'Texto')
    expect(dialog.queryByText('Origem das opções')).not.toBeInTheDocument()
  })

  it('FLT-06 Carregar opções mostra os valores da consulta', async () => {
    const app = open(dashboardWith({ filters: [] }))
    const dialog = await openNew(app)
    await chooseType(app, 'Seleção única')
    await app.user.click(
      dialog.getByRole('combobox', { name: 'Origem das opções' }),
    )
    await app.user.click(
      await screen.findByRole('option', { name: 'Consulta Cypher' }),
    )
    await app.user.type(
      dialog.getByLabelText('Cypher'),
      'MATCH (c:Categoria) RETURN c.nome',
    )
    await app.user.click(
      dialog.getByRole('button', { name: 'Carregar opções' }),
    )
    const loaded = within(await dialog.findByRole('list'))
    expect(loaded.getByText('Eletrônicos')).toBeInTheDocument()
    expect(loaded.getByText('Livros')).toBeInTheDocument()
  })

  it('FLT-24 lista fixa com linhas repetidas grava cada opção uma vez', async () => {
    const puts: DashboardSaveInput[] = []
    const app = open(dashboardWith({ filters: [] }), puts)
    const dialog = await openNew(app)
    await app.user.type(dialog.getByLabelText('Rótulo'), 'Categoria')
    await app.user.type(dialog.getByLabelText('Parâmetro'), 'categoria')
    await chooseType(app, 'Seleção única')
    await app.user.type(
      dialog.getByLabelText('Opções (uma por linha)'),
      'A{Enter}B{Enter}A',
    )
    await app.user.click(dialog.getByRole('button', { name: 'Aplicar' }))
    await app.user.click(await screen.findByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0]?.filters?.[0]).toMatchObject({
      options: { source: 'STATIC', values: ['A', 'B'] },
    })
  })

  it('FLT-17 Aplicar e Salvar enviam o filtro novo no PUT', async () => {
    const puts: DashboardSaveInput[] = []
    const app = open(dashboardWith({ filters: [] }), puts)
    const dialog = await openNew(app)
    await app.user.type(dialog.getByLabelText('Rótulo'), 'Categoria')
    await app.user.type(dialog.getByLabelText('Parâmetro'), 'categoria')
    await app.user.click(dialog.getByRole('button', { name: 'Aplicar' }))
    expect(
      await screen.findByRole('textbox', { name: 'Categoria' }),
    ).toBeInTheDocument()

    await app.user.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0]?.filters).toHaveLength(1)
    expect(puts[0]?.filters?.[0]).toMatchObject({
      label: 'Categoria',
      parameter: 'categoria',
      type: 'TEXT',
    })
  })

  it('FLT-16 Remover filtro pede confirmação com o número de widgets', async () => {
    const app = open(dashboardWith({ filters: [categoria()] }))
    await app.user.click(
      await screen.findByRole('button', { name: 'Ações do filtro Categoria' }),
    )
    await app.user.click(
      await screen.findByRole('menuitem', { name: 'Remover filtro' }),
    )
    const alert = within(await screen.findByRole('alertdialog'))
    expect(
      alert.getByText(
        'Remover o filtro Categoria? 2 widgets usam o parâmetro.',
      ),
    ).toBeInTheDocument()
    await app.user.click(alert.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    )
    expect(
      screen.getByRole('textbox', { name: 'Categoria' }),
    ).toBeInTheDocument()
  })

  it('XFL-09 remover o filtro tira o Ao clicar do widget ao salvar', async () => {
    const puts: DashboardSaveInput[] = []
    const app = open(dashboardWith({ filters: [categoria()] }), puts)
    await app.user.click(
      await screen.findByRole('button', { name: 'Ações do filtro Categoria' }),
    )
    await app.user.click(
      await screen.findByRole('menuitem', { name: 'Remover filtro' }),
    )
    const alert = within(await screen.findByRole('alertdialog'))
    await app.user.click(alert.getByRole('button', { name: 'Remover' }))
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    )
    await app.user.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0]?.filters).toEqual([])
    const widget = puts[0]?.tabs[0]?.widgets[0]
    expect(widget?.config).toEqual({ mapping: { x: 'a' } })
  })

  it('FLT-04 Editar filtro abre o formulário preenchido e Aplicar troca o rótulo no chip', async () => {
    const app = open(dashboardWith({ filters: [categoria()] }))
    await app.user.click(
      await screen.findByRole('button', { name: 'Ações do filtro Categoria' }),
    )
    await app.user.click(
      await screen.findByRole('menuitem', { name: 'Editar filtro' }),
    )
    const dialog = within(await screen.findByRole('dialog'))
    expect(dialog.getByLabelText('Rótulo')).toHaveValue('Categoria')
    expect(dialog.getByLabelText('Parâmetro')).toHaveValue('categoria')
    await app.user.clear(dialog.getByLabelText('Rótulo'))
    await app.user.type(dialog.getByLabelText('Rótulo'), 'Linha de produto')
    await app.user.click(dialog.getByRole('button', { name: 'Aplicar' }))
    expect(
      await screen.findByRole('textbox', { name: 'Linha de produto' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('textbox', { name: 'Categoria' }),
    ).not.toBeInTheDocument()
  })
})
