import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import {
  type ConnectionSchemaDto,
  MESSAGES,
  WIDGET_VISUALIZATIONS,
} from '@ninbi/contracts'
import { describe, expect, it } from 'vitest'
import {
  buildWidgetMessages,
  correctionMessage,
  serializeSchema,
} from '../../src/ai/widget-prompt'

const LONG_EXAMPLE = 'x'.repeat(5000)

const schema: ConnectionSchemaDto = {
  connectionId: 'c1',
  connectionName: 'Varejo',
  status: 'READY',
  readAt: null,
  startedAt: null,
  error: null,
  labels: [
    {
      name: 'Cliente',
      properties: [
        {
          name: 'email',
          types: ['String'],
          example: 'ana@x.com',
          sendExample: false,
        },
      ],
    },
    {
      name: 'Pedido',
      properties: [
        {
          name: 'id',
          types: ['String', 'Long'],
          example: LONG_EXAMPLE,
          sendExample: true,
        },
      ],
    },
  ],
  relationshipTypes: [
    {
      name: 'FEZ',
      properties: [],
      patterns: [{ from: 'Cliente', to: 'Pedido' }],
    },
  ],
}

const widget = {
  title: 'Vendas por mês',
  cypher: 'MATCH (p:Pedido) RETURN count(p) AS total',
  visualization: 'BAR',
  config: { mapping: { x: 'mes', series: ['total'] } },
}

const textOf = (messages: { content: unknown }[]) =>
  messages.map((m) => String(m.content)).join('\n')

describe('widget-prompt', () => {
  it('AIQ-01 pedido pede ao LLM Cypher, visualização, mapeamento e título', () => {
    const messages = buildWidgetMessages({ schema, widget, prompt: 'x' })
    const system = messages[0]
    expect(system).toBeInstanceOf(SystemMessage)
    const text = String(system?.content)
    for (const key of ['cypher', 'visualization', 'mapping', 'title']) {
      expect(text).toContain(`"${key}"`)
    }
    for (const code of WIDGET_VISUALIZATIONS) expect(text).toContain(code)
  })

  it('AIQ-03 schema no prompt traz labels, relacionamentos, pares e propriedades com tipos e exemplo inteiro', () => {
    const text = serializeSchema(schema)
    expect(text).toContain('(:Pedido)')
    expect(text).toContain('[:FEZ]')
    expect(text).toContain('(:Cliente)-[:FEZ]->(:Pedido)')
    expect(text).toContain('- id: String | Long')
    expect(text).toContain(LONG_EXAMPLE)
  })

  it('AIQ-04 propriedade com envio desligado vai sem exemplo', () => {
    const text = serializeSchema(schema)
    expect(text).toContain('- email: String')
    expect(text).not.toContain('ana@x.com')
    const all = textOf(buildWidgetMessages({ schema, widget, prompt: 'x' }))
    expect(all).not.toContain('ana@x.com')
  })

  it('FLT-20 pedido ao LLM lista rótulo, parâmetro e tipo de cada filtro sem valores', () => {
    const text = textOf(
      buildWidgetMessages({
        schema,
        widget,
        prompt: 'x',
        filters: [
          { label: 'Categoria', parameter: 'categoria', type: 'SINGLE_SELECT' },
          { label: 'Período', parameter: 'periodo', type: 'DATE_RANGE' },
        ],
      }),
    )
    expect(text).toContain('Categoria')
    expect(text).toContain('$categoria')
    expect(text).toContain('Seleção única')
    expect(text).toContain('$periodo_inicio')
    expect(text).toContain('$periodo_fim')
    expect(text).toContain('Intervalo de datas')
  })

  it('FLT-20 sem filtros a seção diz nenhum', () => {
    const human = String(
      buildWidgetMessages({ schema, widget, prompt: 'x' })[1]?.content,
    )
    expect(human).toContain('Filtros do dashboard: nenhum')
  })

  it('AIQ-05 pedido inclui o texto e o título, Cypher, visualização e mapeamento atuais', () => {
    const messages = buildWidgetMessages({
      schema,
      widget,
      prompt: 'total de itens por categoria',
    })
    const human = messages[1]
    expect(human).toBeInstanceOf(HumanMessage)
    const text = String(human?.content)
    expect(text).toContain('total de itens por categoria')
    expect(text).toContain('Vendas por mês')
    expect(text).toContain('MATCH (p:Pedido) RETURN count(p) AS total')
    expect(text).toContain('BAR')
    expect(text).toContain('"x":"mes"')
  })

  it('FIX-03 erro de sintaxe, semântica ou validação vai inteiro na correção', () => {
    const cases = [
      {
        code: 'QUERY_WRITE_BLOCKED',
        message: 'Cláusula DELETE não permitida',
      },
      {
        code: 'QUERY_MULTIPLE_STATEMENTS',
        message: MESSAGES.queryMultipleStatements,
      },
      {
        code: 'QUERY_FAILED',
        message: 'Invalid input 7: expected ( em linha 1',
        dbCode: 'Neo.ClientError.Statement.SyntaxError',
      },
      {
        code: 'QUERY_FAILED',
        message: 'Variable `q` not defined',
        dbCode: 'Neo.ClientError.Statement.SemanticError',
      },
    ]
    for (const error of cases) {
      const message = correctionMessage(error)
      expect(message).toBeInstanceOf(HumanMessage)
      expect(String(message.content)).toContain(error.message)
    }
  })

  it('FIX-04 erro de execução vai só com o código', () => {
    const withCode = String(
      correctionMessage({
        code: 'QUERY_FAILED',
        message: '/ by zero em 42',
        dbCode: 'Neo.ClientError.Statement.ArithmeticError',
      }).content,
    )
    expect(withCode).toContain('Neo.ClientError.Statement.ArithmeticError')
    expect(withCode).not.toContain('42')

    const withoutCode = String(
      correctionMessage({ code: 'QUERY_FAILED', message: '/ by zero em 42' })
        .content,
    )
    expect(withoutCode).toContain('Erro de execução no Neo4j')
    expect(withoutCode).not.toContain('42')
  })
})
