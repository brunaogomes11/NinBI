import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages'
import {
  type AssistantMessageDto,
  assistantDraftSchema,
  type ConnectionSchemaDto,
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
