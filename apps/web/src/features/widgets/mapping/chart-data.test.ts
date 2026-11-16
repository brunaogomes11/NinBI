import type { QueryResultDto, ResultValue } from '@ninbi/contracts'
import { describe, expect, it } from 'vitest'
import {
  buildCartesian,
  buildCategories,
  buildChartConfig,
  buildRadar,
  seriesColor,
  tickInterval,
} from './chart-data'

const result = (columns: string[], rows: ResultValue[][]): QueryResultDto => ({
  columns,
  rows,
  truncated: false,
  rowLimit: 5000,
})

const cartesian = { x: 'mes', series: ['vendas', 'custo'] }

describe('chart-data', () => {
  it('CHART-01 um ponto por linha na ordem retornada', () => {
    const r = result(
      ['mes', 'vendas', 'custo'],
      [
        ['mar', 30, 3],
        ['jan', 10, 1],
        ['fev', 20, 2],
      ],
    )
    const built = buildCartesian(r, cartesian)
    expect(built).toEqual({
      ok: true,
      data: [
        { x: 'mar', xLabel: 'mar', s0: 30, s1: 3 },
        { x: 'jan', xLabel: 'jan', s0: 10, s1: 1 },
        { x: 'fev', xLabel: 'fev', s0: 20, s1: 2 },
      ],
    })
  })

  it('CHART-01 resultado sem linhas dá empty', () => {
    const r = result(['mes', 'vendas', 'custo'], [])
    expect(buildCartesian(r, cartesian)).toEqual({ ok: false, reason: 'empty' })
    expect(
      buildCategories(r, { category: 'mes', value: 'vendas' }, 'RADIAL'),
    ).toEqual({ ok: false, reason: 'empty' })
    expect(buildRadar(r, { axis: 'mes', series: ['vendas'] })).toEqual({
      ok: false,
      reason: 'empty',
    })
  })

  it('VIZ-12 coluna mapeada ausente dá A visualização não combina com o resultado', () => {
    const r = result(['mes', 'total'], [['jan', 1]])
    const message =
      'A visualização não combina com o resultado: a coluna vendas não existe'
    expect(buildCartesian(r, { x: 'mes', series: ['vendas'] })).toEqual({
      ok: false,
      reason: 'error',
      message,
    })
    const missing = (name: string) =>
      `A visualização não combina com o resultado: a coluna ${name} não existe`
    expect(buildCartesian(r, { x: 'ano', series: ['total'] })).toEqual({
      ok: false,
      reason: 'error',
      message: missing('ano'),
    })
    expect(
      buildCategories(r, { category: 'tipo', value: 'total' }, 'PIE'),
    ).toEqual({ ok: false, reason: 'error', message: missing('tipo') })
    expect(buildRadar(r, { axis: 'eixo', series: ['total'] })).toEqual({
      ok: false,
      reason: 'error',
      message: missing('eixo'),
    })
  })

  it('VIZ-13 coluna numérica sem números dá A coluna não tem números', () => {
    const r = result(
      ['mes', 'vendas'],
      [
        ['jan', 'n/d'],
        ['fev', null],
      ],
    )
    expect(buildCartesian(r, { x: 'mes', series: ['vendas'] })).toEqual({
      ok: false,
      reason: 'error',
      message: 'A coluna vendas não tem números',
    })
    expect(
      buildCategories(r, { category: 'mes', value: 'vendas' }, 'PIE'),
    ).toEqual({
      ok: false,
      reason: 'error',
      message: 'A coluna vendas não tem números',
    })
  })

  it('VIZ-14 valor nulo ou texto em papel numérico vira ponto ausente', () => {
    const r = result(
      ['mes', 'vendas'],
      [
        ['jan', 10],
        ['fev', null],
        ['mar', 'n/d'],
        ['abr', 40],
      ],
    )
    const built = buildCartesian(r, { x: 'mes', series: ['vendas'] })
    expect(built.ok && built.data.map((p) => p.s0)).toEqual([
      10,
      null,
      null,
      40,
    ])
  })

  it('CHART-07 primeira série usa o token chart-1', () => {
    expect(buildChartConfig(['vendas', 'custo'])).toEqual({
      s0: { label: 'vendas', color: 'var(--chart-1)' },
      s1: { label: 'custo', color: 'var(--chart-2)' },
    })
    expect(buildChartConfig(['Centro'], 'c')).toEqual({
      c0: { label: 'Centro', color: 'var(--chart-1)' },
    })
  })

  it('CHART-17 mais séries que cores repetem a paleta na mesma ordem', () => {
    const config = buildChartConfig(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
    expect(config.s4.color).toBe('var(--chart-5)')
    expect(config.s5.color).toBe('var(--chart-1)')
    expect(config.s6.color).toBe('var(--chart-2)')
    expect(seriesColor(5)).toBe('var(--chart-1)')
  })

  it('CHART-13 mais de 12 categorias corta em 12 e informa o total', () => {
    const rows: ResultValue[][] = Array.from({ length: 30 }, (_, i) => [
      `c${i}`,
      i + 1,
    ])
    const r = result(['nome', 'total'], rows)
    const notice = 'Mostrando 12 de 30 categorias'

    const firstTwelve = Array.from({ length: 12 }, (_, i) => `c${i}`)
    const pie = buildCategories(r, { category: 'nome', value: 'total' }, 'PIE')
    expect(pie.ok && pie.data).toHaveLength(12)
    expect(pie.ok && pie.data.map((item) => item.label)).toEqual(firstTwelve)
    expect(pie.ok && pie.data.map((item) => item.value)).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1),
    )
    expect(pie.ok && pie.notice).toBe(notice)
    const radial = buildCategories(
      r,
      { category: 'nome', value: 'total' },
      'RADIAL',
    )
    expect(radial.ok && radial.data).toHaveLength(12)
    expect(radial.ok && radial.data.map((item) => item.label)).toEqual(
      firstTwelve,
    )
    expect(radial.ok && radial.notice).toBe(notice)
    const radar = buildRadar(r, { axis: 'nome', series: ['total'] })
    expect(radar.ok && radar.data).toHaveLength(12)
    expect(radar.ok && radar.data.map((point) => point.axis)).toEqual(
      firstTwelve,
    )
    expect(radar.ok && radar.notice).toBe(notice)

    const exact = result(['nome', 'total'], rows.slice(0, 12))
    const full = buildCategories(
      exact,
      { category: 'nome', value: 'total' },
      'PIE',
    )
    expect(full.ok && full.data).toHaveLength(12)
    expect(full.ok && full.notice).toBeUndefined()
  })

  it('CHART-15 valor negativo na pizza vira ausente', () => {
    const r = result(
      ['nome', 'total'],
      [
        ['A', 10],
        ['B', -5],
        ['C', 3],
      ],
    )
    const built = buildCategories(
      r,
      { category: 'nome', value: 'total' },
      'PIE',
    )
    expect(built.ok && built.data.map((i) => [i.label, i.value])).toEqual([
      ['A', 10],
      ['C', 3],
    ])
  })

  it('CHART-18 pizza só com zeros não tem dados', () => {
    const r = result(
      ['nome', 'total'],
      [
        ['A', 0],
        ['B', null],
        ['C', 0],
      ],
    )
    expect(
      buildCategories(r, { category: 'nome', value: 'total' }, 'PIE'),
    ).toEqual({ ok: false, reason: 'empty' })
  })

  it('CHART-06 tickInterval pula rótulos que não cabem na largura', () => {
    const thirty = Array.from({ length: 30 }, () => 'abc')
    expect(tickInterval(thirty, 300)).toBe(3)
    expect(tickInterval(['abc', 'abc', 'abc', 'abc', 'abc'], 600)).toBe(0)
  })
})
