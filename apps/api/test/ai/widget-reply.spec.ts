import { describe, expect, it } from 'vitest'
import {
  normalizeWidgetReply,
  parseWidgetReply,
} from '../../src/ai/widget-reply'

const current = { title: 'Título atual' }

function normalize(json: Record<string, unknown>) {
  const parsed = parseWidgetReply(
    JSON.stringify({ cypher: 'RETURN 1', ...json }),
  )
  if (!parsed.ok) throw new Error('esperava resposta aceita')
  return normalizeWidgetReply(parsed.reply, current)
}

describe('widget-reply', () => {
  it('FIX-05 resposta sem Cypher não é aceita', () => {
    expect(parseWidgetReply('Claro! Aqui está sua consulta.')).toEqual({
      ok: false,
    })
    expect(parseWidgetReply('{"visualization":"BAR"}')).toEqual({ ok: false })
    expect(parseWidgetReply('{"cypher":"   "}')).toEqual({ ok: false })
    expect(parseWidgetReply('{"cypher":42}')).toEqual({ ok: false })

    const fenced = parseWidgetReply(
      'Segue:\n```json\n{"cypher":"MATCH (n) RETURN n","title":"Nós"}\n```\nPronto.',
    )
    expect(fenced).toMatchObject({
      ok: true,
      reply: { cypher: 'MATCH (n) RETURN n', title: 'Nós' },
    })

    const proseWithJson = parseWidgetReply(
      'Use {"x": 1} como referência.\n```cypher\nMATCH (n) RETURN n AS n\n```',
    )
    expect(proseWithJson).toMatchObject({
      ok: true,
      reply: { cypher: 'MATCH (n) RETURN n AS n' },
    })
    const jsonWithoutCypher = parseWidgetReply(
      '{"title": "Vendas"}\n```cypher\nMATCH (n) RETURN n AS n\n```',
    )
    expect(jsonWithoutCypher).toMatchObject({
      ok: true,
      reply: { cypher: 'MATCH (n) RETURN n AS n' },
    })

    const alone = parseWidgetReply('```cypher\nMATCH (n) RETURN n\n```')
    expect(alone).toMatchObject({
      ok: true,
      reply: { cypher: 'MATCH (n) RETURN n' },
    })
  })

  it('AIQ-20 visualização desconhecida vira Tabela', () => {
    expect(normalize({ visualization: 'GRAPH' })).toMatchObject({
      visualization: 'TABLE',
      mapping: null,
    })
    expect(normalize({})).toMatchObject({
      visualization: 'TABLE',
      mapping: null,
    })
    expect(
      normalize({
        visualization: 'bar',
        mapping: {
          x: 'mes',
          series: ['total'],
          stacked: false,
          horizontal: false,
        },
      }),
    ).toMatchObject({
      visualization: 'BAR',
      mapping: {
        x: 'mes',
        series: ['total'],
        stacked: false,
        horizontal: false,
      },
    })
  })

  it('AIQ-20 mapeamento de BAR sem x vira null', () => {
    expect(
      normalize({
        visualization: 'BAR',
        mapping: { series: ['total'], stacked: false, horizontal: false },
      }).mapping,
    ).toBeNull()
  })

  it('AIQ-20 título com 120 caracteres é cortado em 80 e título vazio fica com o atual', () => {
    expect(normalize({ title: 'a'.repeat(120) }).title).toBe('a'.repeat(80))
    expect(normalize({ title: '   ' }).title).toBe('Título atual')
  })
})
