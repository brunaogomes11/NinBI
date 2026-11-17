import type {
  ConnectionSchemaDto,
  FilterPromptInfo,
  RelationalSchemaDto,
} from '@ninbi/contracts'
import { describe, expect, it } from 'vitest'
import {
  buildWidgetMessages,
  serializeSchema,
} from '../../src/ai/widget-prompt'

const state = {
  status: 'READY' as const,
  readAt: null,
  startedAt: null,
  error: null,
}

const relational: RelationalSchemaDto = {
  ...state,
  kind: 'RELATIONAL',
  connectionId: 'c1',
  connectionName: 'Sortify',
  tables: [
    {
      name: 'public.clientes',
      isView: false,
      columns: [
        {
          name: 'email',
          type: 'text',
          example: "'ana@x.com'",
          sendExample: false,
        },
        { name: 'id', type: 'integer', example: '1', sendExample: true },
      ],
    },
    {
      name: 'public.pedidos',
      isView: false,
      columns: [
        {
          name: 'cliente_id',
          type: 'integer',
          example: '1',
          sendExample: true,
        },
        { name: 'loja_id', type: 'integer', example: null, sendExample: true },
      ],
    },
    {
      name: 'public.vendas_mes',
      isView: true,
      columns: [
        { name: 'total', type: 'numeric', example: '10.5', sendExample: true },
      ],
    },
  ],
  foreignKeys: [
    {
      from: { table: 'public.pedidos', columns: ['cliente_id'] },
      to: { table: 'public.clientes', columns: ['id'] },
    },
    {
      from: { table: 'public.pedidos', columns: ['loja_id', 'cliente_id'] },
      to: { table: 'public.lojas', columns: ['id', 'dono_id'] },
    },
  ],
}

const graph: ConnectionSchemaDto = {
  ...state,
  connectionId: 'c2',
  connectionName: 'Grafo',
  labels: [
    {
      name: 'Cliente',
      properties: [
        {
          name: 'nome',
          types: ['String'],
          example: "'Ana'",
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
  title: 'Pedidos',
  cypher: 'SELECT count(*) AS total FROM public.pedidos',
  visualization: 'KPI',
  config: {},
}

const filters: FilterPromptInfo[] = [
  { label: 'Cidade', parameter: 'cidade', type: 'SINGLE_SELECT' },
  { label: 'Lojas', parameter: 'lojas', type: 'MULTI_SELECT' },
]

const texts = (messages: { content: unknown }[]) =>
  messages.map((m) => String(m.content))

describe('prompt por dialeto', () => {
  it('SAI-01 prompt pede consulta no dialeto do tipo', () => {
    for (const [dialect, database] of [
      ['PostgreSQL', 'PostgreSQL'],
      ['MySQL', 'MySQL'],
      ['T-SQL', 'SQL Server'],
    ] as const) {
      const [system, human] = texts(
        buildWidgetMessages({
          schema: relational,
          dialect,
          widget,
          prompt: 'x',
        }),
      )
      expect(system).toContain(
        `Você escreve consultas ${dialect} para widgets de dashboard em um banco ${database}.`,
      )
      expect(system).toContain('começando por SELECT ou WITH')
      expect(system).toContain('"cypher"')
      expect(system).not.toContain('Cypher')
      expect(system).not.toContain('Neo4j')
      expect(human).toContain(`SQL: ${widget.cypher}`)
      expect(human).not.toContain('Cypher:')
    }
  })

  it('SAI-02 prompt SQL leva tabelas, colunas, exemplos permitidos e chaves estrangeiras', () => {
    const text = serializeSchema(relational)
    expect(text.split('\n')).toEqual([
      'Tabelas',
      'public.clientes',
      '- email: text',
      '- id: integer = 1',
      'public.pedidos',
      '- cliente_id: integer = 1',
      '- loja_id: integer',
      'public.vendas_mes (visão)',
      '- total: numeric = 10.5',
      '',
      'Chaves estrangeiras',
      'public.pedidos.cliente_id → public.clientes.id',
      'public.pedidos.loja_id, public.pedidos.cliente_id → public.lojas.id, public.lojas.dono_id',
    ])
    const [system] = texts(
      buildWidgetMessages({
        schema: relational,
        dialect: 'PostgreSQL',
        widget,
        prompt: 'x',
      }),
    )
    expect(system).toContain(text)
    expect(system).not.toContain('ana@x.com')
  })

  it('SAI-03 prompt de Neo4j segue como antes', () => {
    const input = {
      schema: graph,
      widget,
      prompt: 'pedidos por cliente',
      filters,
    }
    const before = texts(buildWidgetMessages(input))
    const explicit = texts(buildWidgetMessages({ ...input, dialect: 'Cypher' }))
    expect(explicit).toEqual(before)
    const [system, human] = before
    expect(system?.split('\n')[0]).toBe(
      'Você escreve consultas Cypher para widgets de dashboard em um banco Neo4j.',
    )
    expect(system).toContain(
      '- Escreva só Cypher de leitura, com uma única instrução e sem ponto e vírgula no fim.',
    )
    expect(system).toContain('(:Cliente)-[:FEZ]->(:Pedido)')
    expect(system).toContain("- nome: String = 'Ana'")
    expect(human).toContain(`Cypher: ${widget.cypher}`)
    expect(human).not.toContain('IS NULL')
  })

  it('SAI-06 prompt descreve os parâmetros dos filtros em SQL', () => {
    const [, human] = texts(
      buildWidgetMessages({
        schema: relational,
        dialect: 'MySQL',
        widget,
        prompt: 'x',
        filters,
      }),
    )
    expect(human).toContain('- Cidade: $cidade (Seleção única)')
    expect(human).toContain('$nome IS NULL OR coluna = $nome')
    expect(human).toContain('coluna IN ($nome)')

    const [, none] = texts(
      buildWidgetMessages({
        schema: relational,
        dialect: 'MySQL',
        widget,
        prompt: 'x',
      }),
    )
    expect(none).toContain('Filtros do dashboard: nenhum')
  })
})
