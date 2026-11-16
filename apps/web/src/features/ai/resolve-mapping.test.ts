import { describe, expect, it } from 'vitest'
import { makeQueryResult } from '@/test/fixtures/dashboards'
import { resolveAiMapping } from './resolve-mapping'

const result = makeQueryResult({
  columns: ['categoria', 'total'],
  rows: [
    ['A', 1],
    ['B', 2],
  ],
})

describe('resolveAiMapping', () => {
  it('AIQ-30 mapeamento com coluna ausente vira a sugestão automática', () => {
    const resolved = resolveAiMapping(
      'BAR',
      { x: 'mes', series: ['total'], stacked: false, horizontal: false },
      result,
    )
    expect(resolved.visualization).toBe('BAR')
    expect(resolved.config.mapping?.x).toBe('categoria')
    expect(resolved.config.mapping?.series).toEqual(['total'])
  })

  it('AIQ-30 mapeamento válido com colunas presentes fica como veio', () => {
    const mapping = { x: 'categoria', series: ['total'], stacked: true }
    expect(resolveAiMapping('AREA', mapping, result)).toEqual({
      visualization: 'AREA',
      config: { mapping },
    })
  })

  it('AIQ-30 mapeamento nulo vira a sugestão', () => {
    const resolved = resolveAiMapping('PIE', null, result)
    expect(resolved.config.mapping?.category).toBe('categoria')
    expect(resolved.config.mapping?.value).toBe('total')
  })

  it('AIQ-30 PIE com resultado sem coluna numérica vira Tabela', () => {
    const text = makeQueryResult({ columns: ['a'], rows: [['x']] })
    expect(resolveAiMapping('PIE', null, text)).toEqual({
      visualization: 'TABLE',
      config: {},
    })
  })

  it('AIQ-30 TABLE dá config vazio', () => {
    expect(resolveAiMapping('TABLE', { x: 'a' }, result)).toEqual({
      visualization: 'TABLE',
      config: {},
    })
  })
})
