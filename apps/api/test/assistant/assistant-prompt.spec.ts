import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages'
import {
  type AssistantMessageDto,
  assistantDraftSchema,
  type ConnectionSchemaDto,
  type RelationalSchemaDto,
} from '@ninbi/contracts'
import { describe, expect, it } from 'vitest'
import {
  buildAssistantMessages,
  serializeDraft,
} from '../../src/assistant/assistant-prompt'

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const schema: ConnectionSchemaDto = {
  connectionId: 'c1',
  connectionName: 'Varejo',
  status: 'READY',
  readAt: null,
  startedAt: null,
  error: null,
  labels: [{ name: 'Pedido', properties: [] }],
  relationshipTypes: [],
}

const rawDraft = {
  name: 'Vendas',
  connectionId: id(1),
  tabs: [
    {
      id: id(10),
      name: 'Vendas',
      widgets: [
        {
          id: id(11),
          title: 'Total por mês',
          cypher: 'MATCH (p:Pedido) RETURN p.mes AS mes, count(p) AS total',
          visualization: 'BAR',
          mapping: { x: 'mes', series: ['total'], stacked: false },
          layout: { x: 0, y: 0, w: 6, h: 4 },
          result: { columns: ['mes'], rows: [['VALOR-DE-LINHA-5b2e']] },
        },
      ],
    },
    {
      id: id(20),
      name: 'Lojas',
      widgets: [
        {
          id: id(21),
          title: 'Ranking',
          cypher: null,
          visualization: 'TABLE',
          mapping: null,
          layout: { x: 6, y: 0, w: 6, h: 4 },
        },
      ],
    },
  ],
  filters: [
    {
      id: id(30),
      label: 'Categoria',
      parameter: 'categoria',
      type: 'SINGLE_SELECT',
      defaultValue: 'VALOR-DE-FILTRO-c41d',
      options: { source: 'STATIC', values: ['OPCAO-77aa'] },
    },
    { id: id(31), label: 'Ano', parameter: 'ano', type: 'NUMBER' },
  ],
}

const history: AssistantMessageDto[] = [
  {
    id: id(40),
    role: 'USER',
    text: 'crie uma aba',
    details: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: id(41),
    role: 'ASSISTANT',
    text: 'Criei a aba.',
    details: {
      changes: ['Aba criada: Lojas'],
      notApplied: [],
      createdWidgets: 0,
      failedWidgets: [],
      discardedWidgets: 0,
    },
    createdAt: '2026-01-01T00:00:01.000Z',
  },
]

const ACTIONS = [
  'create_tab',
  'rename_tab',
  'remove_tab',
  'create_widget',
  'update_widget',
  'remove_widget',
  'move_widget',
  'resize_widget',
  'create_filter',
  'update_filter',
  'remove_filter',
  'rename_dashboard',
]

describe('pedido do plano do assistente', () => {
  it('CHAT-05 pedido traz schema, estrutura do rascunho, 20 mensagens recentes e a mensagem nova', () => {
    const draft = assistantDraftSchema.parse(rawDraft)
    const messages = buildAssistantMessages({
      schema,
      draft,
      history,
      message: 'troque para linha',
    })
    expect(messages).toHaveLength(4)
    const [system, user, assistant, last] = messages
    expect(system).toBeInstanceOf(SystemMessage)
    const systemText = String(system?.content)
    expect(systemText).toContain('(:Pedido)')
    for (const action of ACTIONS) expect(systemText).toContain(action)

    expect(user).toBeInstanceOf(HumanMessage)
    expect(user?.content).toBe('crie uma aba')
    expect(assistant).toBeInstanceOf(AIMessage)
    expect(String(assistant?.content)).toContain('Criei a aba.')
    expect(String(assistant?.content)).toContain('Aba criada: Lojas')

    expect(last).toBeInstanceOf(HumanMessage)
    const text = String(last?.content)
    expect(text).toContain('t1 "Vendas"')
    expect(text).toContain('w1 "Total por mês"')
    expect(text).toContain('RETURN p.mes AS mes, count(p) AS total')
    expect(text).toContain('BAR')
    expect(text).toContain('{"x":"mes","series":["total"],"stacked":false}')
    expect(text).toContain('x=0 y=0 tamanho 6x4')
    expect(text).toContain('f1 "Categoria" $categoria SINGLE_SELECT')
    expect(text).toContain('troque para linha')
  })

  it('CHAT-06 rascunho serializado não leva nada além da estrutura', () => {
    const draft = assistantDraftSchema.parse(rawDraft)
    const messages = buildAssistantMessages({
      schema,
      draft,
      history,
      message: 'oi',
    })
    const all = messages.map((m) => String(m.content)).join('\n')
    expect(all).not.toContain('VALOR-DE-FILTRO-c41d')
    expect(all).not.toContain('VALOR-DE-LINHA-5b2e')
    expect(all).not.toContain('OPCAO-77aa')
  })

  it('refs seguem a ordem das abas, dos widgets e dos filtros', () => {
    const { text, refs } = serializeDraft(assistantDraftSchema.parse(rawDraft))
    expect(refs).toEqual({
      t1: { kind: 'tab', id: id(10) },
      w1: { kind: 'widget', id: id(11) },
      t2: { kind: 'tab', id: id(20) },
      w2: { kind: 'widget', id: id(21) },
      f1: { kind: 'filter', id: id(30) },
      f2: { kind: 'filter', id: id(31) },
    })
    expect(text.indexOf('t1 "Vendas"')).toBeLessThan(text.indexOf('w1 '))
    expect(text.indexOf('w1 ')).toBeLessThan(text.indexOf('t2 "Lojas"'))
    expect(text.indexOf('t2 "Lojas"')).toBeLessThan(
      text.indexOf('w2 "Ranking"'),
    )
    expect(text.indexOf('w2 "Ranking"')).toBeLessThan(text.indexOf('f1 '))
  })
})

const relational: RelationalSchemaDto = {
  kind: 'RELATIONAL',
  connectionId: 'c2',
  connectionName: 'Loja SQL',
  status: 'READY',
  readAt: '2026-01-01T00:00:00.000Z',
  startedAt: null,
  error: null,
  tables: [
    {
      name: 'public.pedidos',
      isView: false,
      columns: [
        { name: 'id', type: 'integer', example: '7', sendExample: true },
        {
          name: 'cliente_id',
          type: 'integer',
          example: '42',
          sendExample: true,
        },
        {
          name: 'cpf',
          type: 'text',
          example: 'EXEMPLO-SECRETO-9f1c',
          sendExample: false,
        },
      ],
    },
    {
      name: 'public.clientes',
      isView: false,
      columns: [
        { name: 'id', type: 'integer', example: null, sendExample: true },
        {
          name: 'cidade',
          type: 'varchar(80)',
          example: 'Recife',
          sendExample: true,
        },
      ],
    },
  ],
  foreignKeys: [
    {
      from: { table: 'public.pedidos', columns: ['cliente_id'] },
      to: { table: 'public.clientes', columns: ['id'] },
    },
  ],
}

const sqlDraft = {
  ...rawDraft,
  tabs: [
    {
      id: id(10),
      name: 'Vendas',
      widgets: [
        {
          id: id(11),
          title: 'Pedidos por cidade',
          cypher:
            'SELECT c.cidade AS cidade, count(*) AS total FROM public.pedidos p JOIN public.clientes c ON c.id = p.cliente_id GROUP BY c.cidade',
          visualization: 'BAR',
          mapping: { x: 'cidade', series: ['total'], stacked: false },
          layout: { x: 0, y: 0, w: 6, h: 4 },
        },
      ],
    },
  ],
}

const systemOf = (messages: ReturnType<typeof buildAssistantMessages>) =>
  String(messages[0]?.content)

describe('pedido do plano pela conexão do rascunho', () => {
  it('ASQ-01 plano para conexão SQL leva o schema relacional', () => {
    const messages = buildAssistantMessages({
      schema: relational,
      dialect: 'PostgreSQL',
      draft: assistantDraftSchema.parse(sqlDraft),
      history: [],
      message: 'pedidos por cliente',
    })
    const system = systemOf(messages)
    expect(system).toContain('Tabelas')
    expect(system).toContain('public.pedidos')
    expect(system).toContain('- cliente_id: integer = 42')
    expect(system).toContain('- cidade: varchar(80) = Recife')
    // exemplo desligado pelo Admin: só o tipo
    expect(system).toContain('- cpf: text')
    expect(system).not.toContain('EXEMPLO-SECRETO-9f1c')
    expect(system).toContain('Chaves estrangeiras')
    expect(system).toContain('public.pedidos.cliente_id → public.clientes.id')
    expect(system).not.toContain('Labels')
  })

  it('ASQ-02 plano para conexão Neo4j leva o schema de grafo como antes', () => {
    const draft = assistantDraftSchema.parse(rawDraft)
    const withDialect = buildAssistantMessages({
      schema,
      dialect: 'Cypher',
      draft,
      history,
      message: 'oi',
    })
    const withoutDialect = buildAssistantMessages({
      schema,
      draft,
      history,
      message: 'oi',
    })
    const system = systemOf(withDialect)
    expect(system).toContain('Labels')
    expect(system).toContain('(:Pedido)')
    expect(system).toContain('Relacionamentos')
    expect(system).not.toContain('Tabelas')
    expect(withDialect.map((m) => String(m.content))).toEqual(
      withoutDialect.map((m) => String(m.content)),
    )
  })

  it('ASQ-03 sistema descreve o dashboard no banco da conexão', () => {
    const draft = assistantDraftSchema.parse(rawDraft)
    const cases = [
      { dialect: 'Cypher', banco: 'Neo4j', schema },
      { dialect: 'PostgreSQL', banco: 'PostgreSQL', schema: relational },
      { dialect: 'MySQL', banco: 'MySQL', schema: relational },
      { dialect: 'T-SQL', banco: 'SQL Server', schema: relational },
    ] as const
    for (const item of cases) {
      const system = systemOf(
        buildAssistantMessages({
          schema: item.schema,
          dialect: item.dialect,
          draft,
          history: [],
          message: 'oi',
        }),
      )
      expect(system).toContain(
        `Você é o assistente de um dashboard de dados em ${item.banco}:`,
      )
      for (const other of cases.filter((c) => c.banco !== item.banco)) {
        expect(system).not.toContain(`dashboard de dados em ${other.banco}`)
      }
      expect(system).toContain('para quem escreve a consulta')
      expect(system).not.toContain('para quem escreve o Cypher')
    }
  })

  it('ASQ-04 rascunho mostra a consulta na linguagem da conexão', () => {
    const sql = serializeDraft(assistantDraftSchema.parse(sqlDraft), 'MySQL')
    expect(sql.text).toContain(
      '  SQL: ```sql\nSELECT c.cidade AS cidade, count(*) AS total',
    )
    expect(sql.text).not.toContain('Cypher:')
    expect(sql.text).not.toContain('```cypher')

    const neo4j = serializeDraft(assistantDraftSchema.parse(rawDraft), 'Cypher')
    expect(neo4j.text).toContain(
      '  Cypher: ```cypher\nMATCH (p:Pedido) RETURN p.mes AS mes, count(p) AS total\n```',
    )
    expect(neo4j.text).not.toContain('SQL:')
    expect(neo4j.text).toBe(
      serializeDraft(assistantDraftSchema.parse(rawDraft)).text,
    )

    const last = buildAssistantMessages({
      schema: relational,
      dialect: 'T-SQL',
      draft: assistantDraftSchema.parse(sqlDraft),
      history: [],
      message: 'oi',
    }).at(-1)
    expect(String(last?.content)).toContain('SQL: ```sql')
  })

  it('ASQ-04 consulta com três crases não fecha o bloco do rascunho', () => {
    const query = "SELECT '```' AS x"
    const draft = assistantDraftSchema.parse({
      ...sqlDraft,
      tabs: [
        {
          ...sqlDraft.tabs[0],
          widgets: [{ ...sqlDraft.tabs[0]?.widgets[0], cypher: query }],
        },
      ],
    })
    const { text } = serializeDraft(draft, 'PostgreSQL')
    expect(text).toContain(`  SQL: \`\`\`\`sql\n${query}\n\`\`\`\`\n`)
    // a cerca de abertura e a de fechamento têm o mesmo tamanho, maior que a da consulta
    const lines = text.split('\n')
    const open = lines.findIndex((line) => line.startsWith('  SQL: ````sql'))
    expect(lines[open + 2]).toBe('````')
    expect(lines[open + 3]).toContain('Mapeamento:')
  })
})
