import { describe, expect, it } from 'vitest'
import type { ZodType } from 'zod'
import {
  ASSISTANT_MESSAGE_MAX,
  assistantDescriptionSchema,
  assistantDraftSchema,
  assistantRequestSchema,
} from './assistant'
import { MESSAGES } from './messages'

function errorsOf(
  schema: ZodType,
  value: unknown,
): Record<string, string> | null {
  const result = schema.safeParse(value)
  if (result.success) return null
  const byField: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const field = issue.path.join('.')
    if (!(field in byField)) byField[field] = issue.message
  }
  return byField
}

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const draft = () => ({
  name: 'Vendas',
  connectionId: id(1),
  tabs: [
    {
      id: id(2),
      name: 'Geral',
      widgets: [
        {
          id: id(3),
          title: 'Total por mês',
          cypher: 'MATCH (p:Pedido) RETURN count(p) AS total',
          visualization: 'BAR',
          mapping: { x: 'mes', y: 'total' },
          layout: { x: 0, y: 0, w: 6, h: 4 },
          result: { columns: ['total'], rows: [['VALOR-DE-LINHA-5b2e']] },
          config: { crossFilter: { filterId: id(4), column: 'mes' } },
        },
      ],
    },
  ],
  filters: [
    {
      id: id(4),
      label: 'Categoria',
      parameter: 'categoria',
      type: 'SINGLE_SELECT',
      defaultValue: 'VALOR-DE-FILTRO-c41d',
      options: { source: 'STATIC', values: ['OPCAO-77aa'] },
    },
  ],
})

describe('assistant contracts', () => {
  it('GEN-10 descrição vazia ou com mais de 4.000 caracteres é recusada', () => {
    expect(errorsOf(assistantDescriptionSchema, '')).toEqual({
      '': 'Informe a descrição',
    })
    expect(errorsOf(assistantDescriptionSchema, '   ')).toEqual({
      '': 'Informe a descrição',
    })
    expect(
      errorsOf(
        assistantDescriptionSchema,
        'a'.repeat(ASSISTANT_MESSAGE_MAX + 1),
      ),
    ).toEqual({ '': 'A descrição passa de 4.000 caracteres' })
    expect(
      errorsOf(assistantDescriptionSchema, 'a'.repeat(ASSISTANT_MESSAGE_MAX)),
    ).toBeNull()
  })

  it('CHAT-16 mensagem com mais de 4.000 caracteres dá A mensagem passa de 4.000 caracteres', () => {
    expect(
      errorsOf(assistantRequestSchema, {
        message: 'a'.repeat(4001),
        draft: draft(),
      }),
    ).toEqual({ message: 'A mensagem passa de 4.000 caracteres' })
    expect(
      errorsOf(assistantRequestSchema, {
        message: 'a'.repeat(4000),
        draft: draft(),
      }),
    ).toBeNull()
  })

  it('CHAT-06 contexto do rascunho descarta valores e opções dos filtros e resultados', () => {
    const parsed = assistantDraftSchema.parse(draft())
    const widget = parsed.tabs[0].widgets[0]
    expect(widget).toEqual({
      id: id(3),
      title: 'Total por mês',
      cypher: 'MATCH (p:Pedido) RETURN count(p) AS total',
      visualization: 'BAR',
      mapping: { x: 'mes', y: 'total' },
      layout: { x: 0, y: 0, w: 6, h: 4 },
    })
    expect(parsed.filters[0]).toEqual({
      id: id(4),
      label: 'Categoria',
      parameter: 'categoria',
      type: 'SINGLE_SELECT',
    })
    expect(JSON.stringify(parsed)).not.toContain('VALOR-DE-FILTRO-c41d')
    expect(JSON.stringify(parsed)).not.toContain('VALOR-DE-LINHA-5b2e')
    expect(JSON.stringify(parsed)).not.toContain('OPCAO-77aa')
  })

  it('MESSAGES.assistantWidgetsCreated(1) é "1 widget criado" e (3) é "3 widgets criados"', () => {
    expect(MESSAGES.assistantWidgetsCreated(1)).toBe('1 widget criado')
    expect(MESSAGES.assistantWidgetsCreated(3)).toBe('3 widgets criados')
  })

  it('MESSAGES.assistantGeneratingWidget(2, 5) é "Gerando widget 2 de 5"', () => {
    expect(MESSAGES.assistantGeneratingWidget(2, 5)).toBe(
      'Gerando widget 2 de 5',
    )
  })
})
