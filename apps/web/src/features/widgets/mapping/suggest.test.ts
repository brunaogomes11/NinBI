import type { QueryResultDto, ResultValue } from '@ninbi/contracts'
import { describe, expect, it } from 'vitest'
import { adaptMapping, suggestMapping, validateMapping } from './suggest'

const result = (columns: string[], rows: ResultValue[][]): QueryResultDto => ({
  columns,
  rows,
  truncated: false,
  rowLimit: 5000,
})

const base = result(
  ['mes', 'vendas', 'custo'],
  [
    ['jan', 100, 40],
    ['fev', 200, 80],
  ],
)

describe('suggestMapping', () => {
  it('VIZ-03 área, barras e linha sugerem eixo X não numérico e séries numéricas', () => {
    for (const v of ['AREA', 'BAR', 'LINE'] as const) {
      expect(suggestMapping(v, base)).toMatchObject({
        x: 'mes',
        series: ['vendas', 'custo'],
      })
    }
    expect(suggestMapping('AREA', base)).toMatchObject({ stacked: false })
    expect(suggestMapping('BAR', base)).toMatchObject({
      stacked: false,
      horizontal: false,
    })
    const years = result(['ano', 'total'], [[2023, 10]])
    expect(suggestMapping('BAR', years)).toMatchObject({
      x: 'ano',
      series: ['total'],
    })
  })

  it('VIZ-04 pizza e radial sugerem categoria e valor', () => {
    expect(suggestMapping('PIE', base)).toEqual({
      category: 'mes',
      value: 'vendas',
      donut: false,
    })
    expect(suggestMapping('RADIAL', base)).toEqual({
      category: 'mes',
      value: 'vendas',
    })
  })

  it('VIZ-05 radar sugere eixo e todas as séries numéricas', () => {
    expect(suggestMapping('RADAR', base)).toEqual({
      axis: 'mes',
      series: ['vendas', 'custo'],
    })
  })

  it('VIZ-06 KPI sugere o primeiro valor numérico sem variação', () => {
    const kpi = result(['saldo', 'variacao'], [[4999.95, 20]])
    expect(suggestMapping('KPI', kpi)).toEqual({
      value: 'saldo',
      change: null,
    })
  })

  it('VIZ-07 mapa sugere latitude, longitude e rótulo pelo nome da coluna', () => {
    const cases: [string[], string, string][] = [
      [['nome', 'LAT', 'Lng'], 'LAT', 'Lng'],
      [['nome', 'latitude', 'longitude'], 'latitude', 'longitude'],
      [['nome', 'lat', 'long'], 'lat', 'long'],
      [['nome', 'Lat', 'LON'], 'Lat', 'LON'],
    ]
    for (const [columns, lat, lon] of cases) {
      const r = result(columns, [['Centro', -23.5, -46.6]])
      expect(suggestMapping('MAP', r)).toEqual({ lat, lon, label: 'nome' })
    }
    const unnamed = result(['nome', 'a', 'b'], [['Centro', 1, 2]])
    expect(suggestMapping('MAP', unnamed)).toEqual({
      lat: null,
      lon: null,
      label: 'nome',
    })
  })

  it('VIZ-08 lista sugere texto principal e dois valores numéricos', () => {
    const list = result(
      ['nome', 'categoria', 'total', 'variacao', 'qtd'],
      [['Loja', 'Centro', 10, 2, 3]],
    )
    expect(suggestMapping('LIST', list)).toEqual({
      primary: 'nome',
      secondary: null,
      values: ['total', 'variacao'],
    })
  })
})

describe('adaptMapping', () => {
  it('VIZ-19 trocar para visualização incompatível usa a sugestão da nova', () => {
    const chosen = {
      x: 'mes',
      series: ['custo'],
      stacked: false,
      horizontal: false,
    }
    expect(adaptMapping(chosen, 'BAR', 'LINE', base)).toEqual({
      x: 'mes',
      series: ['custo'],
    })
    expect(adaptMapping(chosen, 'BAR', 'PIE', base)).toEqual({
      category: 'mes',
      value: 'vendas',
      donut: false,
    })
    expect(
      adaptMapping(
        { category: 'mes', value: 'custo', donut: true },
        'PIE',
        'RADIAL',
        base,
      ),
    ).toEqual({ category: 'mes', value: 'custo' })
    const geo = result(['nome', 'lat', 'lon'], [['A', 1, 2]])
    expect(
      adaptMapping({ value: 'lat', change: null }, 'KPI', 'MAP', geo),
    ).toEqual(suggestMapping('MAP', geo))
  })

  it('VIZ-02 entre área e barras o empilhado se mantém e sem resultado o mapeamento fica vazio', () => {
    const stacked = { x: 'mes', series: ['vendas'], stacked: true }
    expect(adaptMapping(stacked, 'AREA', 'BAR', base)).toEqual({
      x: 'mes',
      series: ['vendas'],
      stacked: true,
      horizontal: false,
    })
    expect(adaptMapping({}, 'TABLE', 'BAR', null)).toEqual({
      x: null,
      series: [],
      stacked: false,
      horizontal: false,
    })
    expect(adaptMapping({}, 'TABLE', 'TABLE', null)).toEqual({})
  })
})

describe('validateMapping', () => {
  it('VIZ-11 validateMapping aponta o primeiro campo obrigatório vazio', () => {
    expect(
      validateMapping('BAR', {
        x: null,
        series: ['vendas'],
        stacked: false,
        horizontal: false,
      }),
    ).toEqual({ field: 'x', message: 'Escolha Eixo X' })
    expect(
      validateMapping('BAR', {
        x: 'mes',
        series: [],
        stacked: false,
        horizontal: false,
      }),
    ).toEqual({ field: 'series', message: 'Escolha Séries' })
    expect(
      validateMapping('MAP', { lat: 'lat', lon: null, label: null }),
    ).toEqual({ field: 'lon', message: 'Escolha Longitude' })
    expect(
      validateMapping('LIST', { primary: null, secondary: null, values: [] }),
    ).toEqual({ field: 'primary', message: 'Escolha Texto principal' })
    expect(validateMapping('KPI', { value: 'saldo', change: null })).toBeNull()
    expect(validateMapping('TABLE', {})).toBeNull()
  })
})
