import type { AssistantAction, DashboardFilter } from '@ninbi/contracts'
import { describe, expect, it } from 'vitest'
import { fromDto } from '@/features/dashboards/draft'
import {
  makeDashboard,
  makeQueryResult,
  makeWidget,
} from '@/test/fixtures/dashboards'
import { applyAssistantActions } from './apply-actions'

const CATEGORIA: DashboardFilter = {
  id: 'f-1',
  label: 'Categoria',
  parameter: 'categoria',
  type: 'SINGLE_SELECT',
  options: { source: 'STATIC', values: ['A', 'B'] },
  defaultValue: 'A',
}

const RESULT = makeQueryResult({
  columns: ['categoria', 'total'],
  rows: [
    ['A', 3],
    ['B', 5],
  ],
})
const BAR_MAPPING = {
  x: 'categoria',
  series: ['total'],
  stacked: false,
  horizontal: false,
}

const baseDraft = () => fromDto(makeDashboard())

describe('applyAssistantActions', () => {
  it('GEN-03 aplicar as ações cria abas, widgets e filtros no rascunho', () => {
    const draft = baseDraft()
    const actions: AssistantAction[] = [
      { type: 'create_tab', tabId: 't-lojas', name: 'Lojas' },
      {
        type: 'create_widget',
        tabId: 't-lojas',
        widgetId: 'w-novo',
        title: 'Pedidos por categoria',
        cypher: 'MATCH (p:Pedido) RETURN p.categoria AS categoria',
        visualization: 'BAR',
        mapping: BAR_MAPPING,
        layout: { x: 2, y: 3, w: 6, h: 5 },
        result: RESULT,
        error: null,
      },
      { type: 'create_filter', filter: CATEGORIA },
      { type: 'rename_dashboard', name: 'Vendas 2026' },
    ]

    const next = applyAssistantActions(draft, actions)

    expect(next.name).toBe('Vendas 2026')
    expect(next.tabs).toHaveLength(2)
    expect(next.tabs[1]).toMatchObject({ id: 't-lojas', name: 'Lojas' })
    expect(next.tabs[1].widgets).toHaveLength(1)
    expect(next.tabs[1].widgets[0]).toMatchObject({
      id: 'w-novo',
      title: 'Pedidos por categoria',
      cypher: 'MATCH (p:Pedido) RETURN p.categoria AS categoria',
      hasQuery: true,
      visualization: 'BAR',
      config: { mapping: BAR_MAPPING },
      layout: { x: 2, y: 3, w: 6, h: 5 },
    })
    expect(next.filters).toEqual([CATEGORIA])
  })

  it('GEN-06 widget com erro entra no rascunho com o último Cypher', () => {
    const next = applyAssistantActions(baseDraft(), [
      {
        type: 'create_widget',
        tabId: 't-1',
        widgetId: 'w-erro',
        title: 'Ranking de lojas',
        cypher: 'MATCH (n) DETACH DELETE n',
        visualization: 'TABLE',
        mapping: null,
        layout: { x: 0, y: 4, w: 4, h: 4 },
        result: null,
        error: 'A consulta altera dados',
      },
    ])

    const widget = next.tabs[0].widgets.find((w) => w.id === 'w-erro')
    expect(widget).toMatchObject({
      cypher: 'MATCH (n) DETACH DELETE n',
      visualization: 'TABLE',
      config: {},
    })
  })

  it('CHAT-23 ação sobre widget que saiu do rascunho é ignorada', () => {
    const draft = baseDraft()
    const next = applyAssistantActions(draft, [
      {
        type: 'update_widget',
        widgetId: 'w-sumiu',
        title: 'Outro',
        result: null,
        error: null,
      },
      {
        type: 'set_layout',
        widgetId: 'w-sumiu',
        layout: { x: 0, y: 0, w: 2, h: 2 },
      },
      { type: 'remove_widget', widgetId: 'w-sumiu' },
      { type: 'rename_tab', tabId: 't-sumiu', name: 'X' },
    ])

    expect(next).toEqual(draft)
    expect(next.tabs[0].widgets).toHaveLength(1)
  })

  it('remove_filter tira o crossFilter dos widgets que apontavam para ele', () => {
    const draft = fromDto(
      makeDashboard({
        filters: [CATEGORIA],
        tabs: [
          {
            id: 't-1',
            name: 'Aba 1',
            widgets: [
              makeWidget({
                config: { crossFilter: { filterId: 'f-1', column: 'loja' } },
              }),
            ],
          },
        ],
      }),
    )

    const next = applyAssistantActions(draft, [
      { type: 'remove_filter', filterId: 'f-1' },
    ])

    expect(next.filters).toEqual([])
    expect(next.tabs[0].widgets[0].config.crossFilter).toBeUndefined()
  })

  it('update_widget com BAR e mapeamento de coluna ausente vira a sugestão de resolveAiMapping', () => {
    const next = applyAssistantActions(baseDraft(), [
      {
        type: 'update_widget',
        widgetId: 'w-1',
        visualization: 'BAR',
        mapping: { x: 'mes', series: ['total'], stacked: false },
        result: RESULT,
        error: null,
      },
    ])

    const widget = next.tabs[0].widgets[0]
    expect(widget.visualization).toBe('BAR')
    expect(widget.config.mapping).toMatchObject({
      x: 'categoria',
      series: ['total'],
    })
  })

  it('CHAT-08 update_widget que falhou sem nova consulta mantém a visualização e o mapeamento atuais', () => {
    const draft = fromDto(
      makeDashboard({
        tabs: [
          {
            id: 't-1',
            name: 'Aba 1',
            widgets: [
              makeWidget({
                visualization: 'BAR',
                config: { mapping: BAR_MAPPING },
              }),
            ],
          },
        ],
      }),
    )

    const next = applyAssistantActions(draft, [
      {
        type: 'update_widget',
        widgetId: 'w-1',
        title: 'Outro',
        result: null,
        error: 'Não foi possível gerar',
      },
    ])

    const widget = next.tabs[0].widgets[0]
    expect(widget.title).toBe('Outro')
    expect(widget.visualization).toBe('BAR')
    expect(widget.config.mapping).toEqual(BAR_MAPPING)
  })

  it('CHAT-08 mudar só a visualização com a consulta atual em erro aplica a visualização pedida', () => {
    const draft = fromDto(
      makeDashboard({
        tabs: [
          {
            id: 't-1',
            name: 'Aba 1',
            widgets: [
              makeWidget({
                visualization: 'TABLE',
                config: { mapping: BAR_MAPPING },
              }),
            ],
          },
        ],
      }),
    )

    const next = applyAssistantActions(draft, [
      {
        type: 'update_widget',
        widgetId: 'w-1',
        visualization: 'BAR',
        result: null,
        error: 'Consulta com erro',
      },
    ])

    const widget = next.tabs[0].widgets[0]
    expect(widget.visualization).toBe('BAR')
    expect(widget.config.mapping).toEqual(BAR_MAPPING)
  })

  it('update_widget com novo Cypher troca consulta e título e mantém a posição', () => {
    const next = applyAssistantActions(baseDraft(), [
      {
        type: 'update_widget',
        widgetId: 'w-1',
        title: 'Por categoria',
        cypher: 'MATCH (p:Pedido) RETURN p.categoria AS categoria',
        visualization: 'BAR',
        mapping: BAR_MAPPING,
        result: RESULT,
        error: null,
      },
    ])

    expect(next.tabs[0].widgets[0]).toMatchObject({
      title: 'Por categoria',
      cypher: 'MATCH (p:Pedido) RETURN p.categoria AS categoria',
      visualization: 'BAR',
      layout: { x: 0, y: 0, w: 4, h: 4 },
    })
  })

  it('update_filter muda só os campos enviados e remove_tab não tira a última aba', () => {
    const draft = fromDto(makeDashboard({ filters: [CATEGORIA] }))

    const next = applyAssistantActions(draft, [
      { type: 'update_filter', filter: { id: 'f-1', label: 'Tipo' } },
      { type: 'remove_tab', tabId: 't-1' },
    ])

    expect(next.filters[0]).toEqual({ ...CATEGORIA, label: 'Tipo' })
    expect(next.tabs).toHaveLength(1)
  })

  it('CHAT-07 update_filter com o mesmo tipo e sem defaultValue mantém o padrão salvo', () => {
    const draft = fromDto(makeDashboard({ filters: [CATEGORIA] }))

    const next = applyAssistantActions(draft, [
      {
        type: 'update_filter',
        filter: { id: 'f-1', label: 'Tipo', type: 'SINGLE_SELECT' },
      },
    ])

    expect(next.filters[0]).toEqual({ ...CATEGORIA, label: 'Tipo' })
    expect(next.filters[0].defaultValue).toBe('A')
  })

  it('set_layout move o widget e o rascunho original não é mutado', () => {
    const draft = baseDraft()
    const before = structuredClone(draft)

    const next = applyAssistantActions(draft, [
      {
        type: 'set_layout',
        widgetId: 'w-1',
        layout: { x: 6, y: 2, w: 6, h: 3 },
      },
      { type: 'create_tab', tabId: 't-2', name: 'Nova' },
      { type: 'rename_dashboard', name: 'Outro' },
    ])

    expect(next.tabs[0].widgets[0].layout).toEqual({ x: 6, y: 2, w: 6, h: 3 })
    expect(draft).toEqual(before)
  })

  it('ASQ-12 ações do assistente calculam parâmetros SQL', () => {
    // em SQL o comentário `--` esconde o `$comentado`; em Cypher ele contaria como parâmetro
    const query =
      'SELECT categoria FROM pedidos -- $comentado\nWHERE categoria = $categoria'
    const action: AssistantAction = {
      type: 'create_widget',
      tabId: 't-1',
      widgetId: 'w-sql',
      title: 'Pedidos',
      cypher: query,
      visualization: 'TABLE',
      mapping: null,
      layout: { x: 0, y: 0, w: 4, h: 4 },
      result: RESULT,
      error: null,
    }
    const draft = baseDraft()
    const tabId = draft.tabs[0].id

    const sql = applyAssistantActions(draft, [{ ...action, tabId }], 'SQL')
    const cypher = applyAssistantActions(draft, [{ ...action, tabId }])

    const created = (d: typeof sql) =>
      d.tabs[0].widgets.find((w) => w.id === 'w-sql')
    expect(created(sql)?.parameters).toEqual(['categoria'])
    expect(created(cypher)?.parameters).toEqual(['comentado', 'categoria'])
  })

  it('ASQ-12 alterar a consulta de um widget recalcula os parâmetros SQL', () => {
    const query =
      'SELECT categoria FROM pedidos -- $comentado\nWHERE cidade = $cidade'
    const action: AssistantAction = {
      type: 'update_widget',
      widgetId: 'w-1',
      cypher: query,
      result: RESULT,
      error: null,
    }

    const sql = applyAssistantActions(baseDraft(), [action], 'SQL')
    const cypher = applyAssistantActions(baseDraft(), [action])
    const titleOnly = applyAssistantActions(
      baseDraft(),
      [
        {
          type: 'update_widget',
          widgetId: 'w-1',
          title: 'Outro',
          result: null,
          error: null,
        },
      ],
      'SQL',
    )

    expect(sql.tabs[0].widgets[0].parameters).toEqual(['cidade'])
    expect(cypher.tabs[0].widgets[0].parameters).toEqual([
      'comentado',
      'cidade',
    ])
    expect(titleOnly.tabs[0].widgets[0].parameters).toEqual(
      baseDraft().tabs[0].widgets[0].parameters,
    )
  })
})
