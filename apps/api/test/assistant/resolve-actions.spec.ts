import { type AssistantDraft, MESSAGES } from '@ninbi/contracts'
import { describe, expect, it } from 'vitest'
import {
  type DraftRefs,
  serializeDraft,
} from '../../src/assistant/assistant-prompt'
import { resolveActions } from '../../src/assistant/resolve-actions'
import { validateReadOnlySql } from '../../src/queries/read-only-sql'

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function makeDraft(extraTab = false): AssistantDraft {
  return {
    name: 'Vendas',
    connectionId: id(1),
    tabs: [
      {
        id: id(10),
        name: 'Geral',
        widgets: [
          {
            id: id(11),
            title: 'Total por mês',
            cypher: 'MATCH (p:Pedido) RETURN count(p) AS total',
            visualization: 'BAR',
            mapping: { x: 'mes', series: ['total'] },
            layout: { x: 0, y: 0, w: 6, h: 4 },
          },
        ],
      },
      ...(extraTab ? [{ id: id(20), name: 'Lojas', widgets: [] }] : []),
    ],
    filters: [
      { id: id(30), label: 'Categoria', parameter: 'categoria', type: 'TEXT' },
    ],
  }
}

function counter() {
  let n = 100
  return () => id(++n)
}

function run(
  rawActions: unknown[],
  draft: AssistantDraft = makeDraft(),
  refs: DraftRefs = serializeDraft(draft).refs,
) {
  return resolveActions(draft, refs, rawActions, counter())
}

describe('resolver as ações do plano', () => {
  it('GEN-03 plano com abas, widgets e filtros vira ações com ids novos', () => {
    const plan = run([
      { type: 'rename_tab', tab: 't1', name: 'Vendas' },
      { type: 'create_tab', ref: 'nova', name: 'Lojas' },
      {
        type: 'create_widget',
        tab: 'nova',
        title: 'Ranking de lojas',
        prompt: 'ranking de lojas por faturamento',
      },
      {
        type: 'create_widget',
        tab: 't1',
        title: 'Pedidos por dia',
        prompt: 'pedidos por dia',
      },
      {
        type: 'create_filter',
        label: 'Região',
        parameter: 'regiao',
        filterType: 'SINGLE_SELECT',
        options: { source: 'STATIC', values: ['Sul', 'Norte'] },
      },
    ])
    expect(plan.notApplied).toEqual([])
    expect(plan.actions).toEqual([
      { type: 'rename_tab', tabId: id(10), name: 'Vendas' },
      { type: 'create_tab', tabId: id(101), name: 'Lojas' },
      {
        type: 'create_widget',
        tabId: id(101),
        widgetId: id(102),
        title: 'Ranking de lojas',
        layout: { x: 0, y: 0, w: 4, h: 4 },
        prompt: 'ranking de lojas por faturamento',
      },
      {
        type: 'create_widget',
        tabId: id(10),
        widgetId: id(103),
        title: 'Pedidos por dia',
        layout: { x: 0, y: 4, w: 4, h: 4 },
        prompt: 'pedidos por dia',
      },
      {
        type: 'create_filter',
        filter: {
          id: id(104),
          label: 'Região',
          parameter: 'regiao',
          type: 'SINGLE_SELECT',
          options: { source: 'STATIC', values: ['Sul', 'Norte'] },
          defaultValue: null,
        },
      },
    ])
  })

  it('CHAT-07 só as ações da lista fechada são aceitas', () => {
    const plan = run([
      { type: 'delete_dashboard' },
      { type: 'run_query', cypher: 'MATCH (n) RETURN n' },
      { type: 'create_widget', tab: 't1', prompt: 'sem título' },
      { type: 'rename_dashboard', name: 'Novo nome' },
    ])
    expect(plan.notApplied).toEqual([
      'Não aplicado: a ação delete_dashboard não é permitida',
      'Não aplicado: a ação run_query não é permitida',
      'Não aplicado: a ação create_widget veio com dados inválidos',
    ])
    expect(plan.actions).toEqual([
      { type: 'rename_dashboard', name: 'Novo nome' },
    ])
  })

  it('CHAT-09 cada ação aceita gera a descrição da mudança', () => {
    const plan = run(
      [
        { type: 'create_tab', ref: 'x', name: 'Lojas' },
        { type: 'rename_tab', tab: 't1', name: 'Vendas' },
        { type: 'remove_tab', tab: 't2' },
        { type: 'create_widget', tab: 't1', title: 'Novo', prompt: 'p' },
        { type: 'update_widget', widget: 'w1', title: 'Total geral' },
        { type: 'move_widget', widget: 'w1', x: 6, y: 0 },
        { type: 'resize_widget', widget: 'w1', w: 3, h: 3 },
        { type: 'remove_widget', widget: 'w1' },
        {
          type: 'create_filter',
          label: 'Ano',
          parameter: 'ano',
          filterType: 'NUMBER',
        },
        { type: 'update_filter', filter: 'f1', label: 'Tipo' },
        { type: 'remove_filter', filter: 'f1' },
        { type: 'rename_dashboard', name: 'Painel' },
      ],
      makeDraft(true),
    )
    expect(plan.notApplied).toEqual([])
    expect(plan.changes).toEqual([
      'Aba criada: Lojas',
      'Aba renomeada: Geral → Vendas',
      'Aba removida: Lojas',
      'Widget criado: Novo',
      'Widget alterado: Total geral',
      'Widget movido ou redimensionado: Total geral',
      'Widget movido ou redimensionado: Total geral',
      'Widget removido: Total geral',
      'Filtro criado: Ano',
      'Filtro alterado: Tipo',
      'Filtro removido: Tipo',
      'Dashboard renomeado: Painel',
    ])
    expect(plan.actions.map((a) => a.type)).toEqual([
      'create_tab',
      'rename_tab',
      'remove_tab',
      'create_widget',
      'update_widget',
      'set_layout',
      'set_layout',
      'remove_widget',
      'create_filter',
      'update_filter',
      'remove_filter',
      'rename_dashboard',
    ])
  })

  it('CHAT-07 update_filter com o mesmo filterType não manda defaultValue e com tipo novo manda', () => {
    const same = run([
      {
        type: 'update_filter',
        filter: 'f1',
        filterType: 'TEXT',
        label: 'Tipo',
      },
    ])
    expect(same.actions).toEqual([
      {
        type: 'update_filter',
        filter: { id: id(30), label: 'Tipo', type: 'TEXT' },
      },
    ])
    const changed = run([
      { type: 'update_filter', filter: 'f1', filterType: 'NUMBER' },
    ])
    expect(changed.actions[0]).toMatchObject({
      type: 'update_filter',
      filter: { id: id(30), type: 'NUMBER', defaultValue: null },
    })
  })

  it('CHAT-23 ação que cita widget, aba ou filtro inexistente é ignorada e informada', () => {
    const plan = run([
      { type: 'update_widget', widget: 'w9', title: 'x' },
      { type: 'rename_tab', tab: 't9', name: 'x' },
      { type: 'remove_filter', filter: 'f9' },
      { type: 'remove_widget', widget: 'w1' },
      { type: 'update_widget', widget: 'w1', title: 'depois de remover' },
      { type: 'rename_dashboard', name: 'Aplicada' },
    ])
    expect(plan.notApplied).toEqual([
      MESSAGES.assistantMissingTarget('w9'),
      MESSAGES.assistantMissingTarget('t9'),
      MESSAGES.assistantMissingTarget('f9'),
      MESSAGES.assistantMissingTarget('w1'),
    ])
    expect(plan.actions.map((a) => a.type)).toEqual([
      'remove_widget',
      'rename_dashboard',
    ])
  })

  it('CHAT-24 remover a última aba é ignorado e informado', () => {
    const one = run([{ type: 'remove_tab', tab: 't1' }])
    expect(one.notApplied).toEqual([
      'Não aplicado: o dashboard precisa de ao menos uma aba',
    ])
    expect(one.actions).toEqual([])

    const two = run(
      [
        { type: 'remove_tab', tab: 't1' },
        { type: 'remove_tab', tab: 't2' },
      ],
      makeDraft(true),
    )
    expect(two.actions).toEqual([{ type: 'remove_tab', tabId: id(10) }])
    expect(two.notApplied).toEqual([
      'Não aplicado: o dashboard precisa de ao menos uma aba',
    ])
  })

  it('GEN-12 mais de 20 widgets novos ficam nos 20 primeiros e contam os descartados', () => {
    const raw = Array.from({ length: 23 }, (_, i) => ({
      type: 'create_widget',
      tab: 't1',
      title: `Widget ${i + 1}`,
      prompt: `pedido ${i + 1}`,
    }))
    const plan = run(raw)
    expect(plan.actions).toHaveLength(20)
    expect(
      plan.actions.map((a) => (a.type === 'create_widget' ? a.title : '')),
    ).toEqual(raw.slice(0, 20).map((a) => a.title))
    expect(plan.discardedWidgets).toBe(3)
  })

  it('filtro com parâmetro repetido e opções QUERY com CREATE são recusados', () => {
    const plan = run([
      {
        type: 'create_filter',
        label: 'Outra',
        parameter: 'categoria',
        filterType: 'TEXT',
      },
      {
        type: 'create_filter',
        label: 'Região',
        parameter: 'regiao',
        filterType: 'SINGLE_SELECT',
        options: { source: 'QUERY', cypher: 'CREATE (n:X) RETURN n.nome' },
      },
    ])
    expect(plan.actions).toEqual([])
    expect(plan.notApplied).toEqual([
      MESSAGES.assistantInvalidAction('create_filter'),
      MESSAGES.assistantInvalidAction('create_filter'),
    ])
  })

  it('ASQ-08 filtro com consulta de opções é validado pelo tipo da conexão', () => {
    const draft = makeDraft()
    const sql = (query: string) => validateReadOnlySql(query, 'POSTGRES')
    const filterWith = (cypher: string, parameter: string) => ({
      type: 'create_filter',
      label: `Filtro ${parameter}`,
      parameter,
      filterType: 'SINGLE_SELECT',
      options: { source: 'QUERY', cypher },
    })
    const plan = resolveActions(
      draft,
      serializeDraft(draft).refs,
      [
        filterWith('SELECT DISTINCT cidade AS value FROM clientes', 'cidade'),
        filterWith('DELETE FROM clientes RETURNING cidade', 'apagar'),
        // Cypher numa conexão SQL não passa no validador de SQL
        filterWith('MATCH (c:Cliente) RETURN c.cidade AS value', 'cypher'),
        {
          type: 'update_filter',
          filter: 'f1',
          filterType: 'SINGLE_SELECT',
          options: {
            source: 'QUERY',
            cypher: 'UPDATE clientes SET cidade = 1',
          },
        },
      ],
      counter(),
      sql,
    )
    expect(plan.actions).toEqual([
      {
        type: 'create_filter',
        filter: expect.objectContaining({
          parameter: 'cidade',
          options: {
            source: 'QUERY',
            cypher: 'SELECT DISTINCT cidade AS value FROM clientes',
          },
        }),
      },
    ])
    expect(plan.notApplied).toEqual([
      MESSAGES.assistantInvalidAction('create_filter'),
      MESSAGES.assistantInvalidAction('create_filter'),
      MESSAGES.assistantInvalidAction('update_filter'),
    ])

    // sem validador vale o de Cypher (o padrão): a mesma consulta Cypher entra
    const cypherPlan = resolveActions(
      draft,
      serializeDraft(draft).refs,
      [filterWith('MATCH (c:Cliente) RETURN c.cidade AS value', 'cypher')],
      counter(),
    )
    expect(cypherPlan.actions).toEqual([
      {
        type: 'create_filter',
        filter: expect.objectContaining({
          parameter: 'cypher',
          type: 'SINGLE_SELECT',
          options: {
            source: 'QUERY',
            cypher: 'MATCH (c:Cliente) RETURN c.cidade AS value',
          },
        }),
      },
    ])
  })

  it('move_widget e resize_widget saem como set_layout sem sobreposição', () => {
    const draft = makeDraft()
    draft.tabs[0]?.widgets.push({
      id: id(12),
      title: 'Outro',
      cypher: null,
      visualization: 'TABLE',
      mapping: null,
      layout: { x: 6, y: 0, w: 6, h: 4 },
    })
    const plan = run(
      [
        { type: 'move_widget', widget: 'w1', x: 6, y: 0 },
        { type: 'resize_widget', widget: 'w2', w: 12, h: 3 },
      ],
      draft,
    )
    expect(plan.actions).toEqual([
      {
        type: 'set_layout',
        widgetId: id(11),
        layout: { x: 6, y: 4, w: 6, h: 4 },
      },
      {
        type: 'set_layout',
        widgetId: id(12),
        layout: { x: 0, y: 0, w: 12, h: 3 },
      },
    ])
  })
})
