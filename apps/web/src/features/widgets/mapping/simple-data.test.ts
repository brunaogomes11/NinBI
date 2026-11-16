import type { QueryResultDto, ResultValue } from '@ninbi/contracts'
import { describe, expect, it } from 'vitest'
import { buildKpi, buildList, buildMapPoints, mapViewport } from './simple-data'

const result = (columns: string[], rows: ResultValue[][]): QueryResultDto => ({
  columns,
  rows,
  truncated: false,
  rowLimit: 5000,
})

const kpiMapping = { value: 'saldo', change: 'variacao' }
const kpiOf = (change: ResultValue, value: ResultValue = 4999.95) =>
  buildKpi(result(['saldo', 'variacao'], [[value, change]]), kpiMapping)

const geo = { lat: 'lat', lon: 'lon', label: 'nome' }
const geoResult = (rows: ResultValue[][]) =>
  result(['nome', 'lat', 'lon'], rows)

describe('simple-data', () => {
  it('KPI-01 KPI usa o valor da primeira linha', () => {
    const r = result(
      ['saldo', 'variacao'],
      [
        [4999.95, 20],
        [10, 1],
      ],
    )
    const built = buildKpi(r, kpiMapping)
    expect(built.ok && built.data.value).toBe('4.999,95')
  })

  it('KPI-02 variação 20 é alta, 0 também, -5 é queda e sem coluna ou nula não há variação', () => {
    expect(kpiOf(20)).toEqual({
      ok: true,
      data: {
        value: '4.999,95',
        change: 20,
        direction: 'up',
        changeLabel: '20%',
      },
    })
    const zero = kpiOf(0)
    expect(zero.ok && [zero.data.direction, zero.data.changeLabel]).toEqual([
      'up',
      '0%',
    ])
    const down = kpiOf(-5)
    expect(down.ok && [down.data.direction, down.data.changeLabel]).toEqual([
      'down',
      '5%',
    ])
    const nulo = kpiOf(null)
    expect(nulo.ok && nulo.data).toMatchObject({
      change: null,
      direction: null,
      changeLabel: null,
    })
    const semMapeamento = buildKpi(result(['saldo'], [[10]]), {
      value: 'saldo',
      change: null,
    })
    expect(semMapeamento.ok && semMapeamento.data.change).toBeNull()
  })

  it('VIZ-12 coluna de variação do KPI ausente dá A visualização não combina com o resultado', () => {
    expect(buildKpi(result(['saldo'], [[10]]), kpiMapping)).toEqual({
      ok: false,
      reason: 'error',
      message:
        'A visualização não combina com o resultado: a coluna variacao não existe',
    })
  })

  it('VIZ-13 coluna de variação do KPI só com texto e valores da lista só com texto dão A coluna não tem números', () => {
    expect(kpiOf('x')).toEqual({
      ok: false,
      reason: 'error',
      message: 'A coluna variacao não tem números',
    })
    expect(
      buildList(result(['nome', 'total'], [['A', 'x']]), {
        primary: 'nome',
        secondary: null,
        values: ['total'],
      }),
    ).toEqual({
      ok: false,
      reason: 'error',
      message: 'A coluna total não tem números',
    })
  })

  it('KPI-05 valor não numérico fica como texto', () => {
    const built = kpiOf(null, 'Centro')
    expect(built.ok && built.data.value).toBe('Centro')
  })

  it('KPI-01 coluna do valor ausente e resultado vazio', () => {
    expect(buildKpi(result(['outro'], [[1]]), kpiMapping)).toEqual({
      ok: false,
      reason: 'error',
      message:
        'A visualização não combina com o resultado: a coluna saldo não existe',
    })
    expect(buildKpi(result(['saldo'], []), kpiMapping)).toEqual({
      ok: false,
      reason: 'empty',
    })
  })

  it('LIST-01 lista mantém a ordem e até dois valores', () => {
    const r = result(
      ['nome', 'categoria', 'total', 'variacao'],
      [
        ['Loja B', 'Centro', 1234.56, 12],
        ['Loja A', 'Sul', 10, null],
        ['Loja C', null, 5, 1],
      ],
    )
    const built = buildList(r, {
      primary: 'nome',
      secondary: 'categoria',
      values: ['total', 'variacao'],
    })
    expect(built).toEqual({
      ok: true,
      data: [
        { primary: 'Loja B', secondary: 'Centro', values: ['1.234,56', '12'] },
        { primary: 'Loja A', secondary: 'Sul', values: ['10', '—'] },
        { primary: 'Loja C', secondary: '—', values: ['5', '1'] },
      ],
    })
    const sem = buildList(r, { primary: 'nome', secondary: null, values: [] })
    expect(sem.ok && sem.data[0]).toEqual({
      primary: 'Loja B',
      secondary: null,
      values: [],
    })
  })

  it('MAP-01 um ponto por linha com latitude e longitude', () => {
    const built = buildMapPoints(
      geoResult([
        ['Centro', -23.55, -46.63],
        ['Sul', -30.03, -51.23],
      ]),
      geo,
    )
    expect(built).toEqual({
      ok: true,
      data: [
        {
          lat: -23.55,
          lon: -46.63,
          label: 'Centro',
          sameSpotLabels: ['Centro'],
        },
        { lat: -30.03, lon: -51.23, label: 'Sul', sameSpotLabels: ['Sul'] },
      ],
    })
  })

  it('MAP-03 coordenadas inválidas são descartadas e contadas', () => {
    const built = buildMapPoints(
      geoResult([
        ['Ok', -23.55, -46.63],
        ['Lat', 200, -46.63],
        ['Lon', -23.55, -181],
        ['Nula', null, null],
        ['Texto', 'abc', 'xyz'],
      ]),
      geo,
    )
    expect(built.ok && built.data.map((p) => p.label)).toEqual(['Ok'])
    expect(built.ok && built.notice).toBe('4 linhas sem coordenadas válidas')

    const one = buildMapPoints(
      geoResult([
        ['Ok', 1, 2],
        ['Ruim', 91, 2],
      ]),
      geo,
    )
    expect(one.ok && one.notice).toBe('1 linha sem coordenadas válidas')
    const none = buildMapPoints(geoResult([['Ok', 1, 2]]), geo)
    expect(none.ok && none.notice).toBeUndefined()
  })

  it('MAP-04 nenhuma coordenada válida dá Nenhuma linha com coordenadas válidas', () => {
    expect(buildMapPoints(geoResult([['A', 200, 300]]), geo)).toEqual({
      ok: false,
      reason: 'error',
      message: 'Nenhuma linha com coordenadas válidas',
    })
  })

  it('MAP-05 enquadramento contém todos os marcadores', () => {
    const built = buildMapPoints(
      geoResult([
        ['São Paulo', -23.55, -46.63],
        ['Rio de Janeiro', -22.91, -43.17],
        ['Porto Alegre', -30.03, -51.23],
      ]),
      geo,
    )
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(mapViewport(built.data)).toEqual({
      bounds: [
        [-30.03, -51.23],
        [-22.91, -43.17],
      ],
    })
    expect(mapViewport(built.data.slice(0, 1))).toEqual({
      center: [-23.55, -46.63],
      zoom: 10,
    })
  })

  it('MAP-08 marcadores na mesma coordenada levam os dois rótulos', () => {
    const built = buildMapPoints(
      geoResult([
        ['Loja A', -23.55, -46.63],
        ['Loja B', -23.55, -46.63],
        ['Loja C', -22.91, -43.17],
      ]),
      geo,
    )
    expect(built.ok && built.data).toHaveLength(3)
    expect(built.ok && built.data.map((p) => p.sameSpotLabels)).toEqual([
      ['Loja A', 'Loja B'],
      ['Loja A', 'Loja B'],
      ['Loja C'],
    ])
    expect(mapViewport(built.ok ? built.data.slice(0, 2) : [])).toEqual({
      center: [-23.55, -46.63],
      zoom: 10,
    })
  })
})
