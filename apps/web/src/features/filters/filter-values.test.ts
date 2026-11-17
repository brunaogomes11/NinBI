import type { DashboardFilter, FilterType } from '@ninbi/contracts'
import { describe, expect, it } from 'vitest'
import {
  checkDateRange,
  filterParams,
  parseNumberInput,
  relevantParams,
  widgetsUsingFilter,
} from './filter-values'

function filter(
  type: FilterType,
  parameter: string,
  defaultValue: DashboardFilter['defaultValue'] = null,
): DashboardFilter {
  return {
    id: `id-${parameter}`,
    label: parameter,
    parameter,
    type,
    options: null,
    defaultValue,
  }
}

describe('filter-values', () => {
  it('FLT-11 filtro vazio envia null', () => {
    const filters = [
      filter('TEXT', 'busca'),
      filter('SINGLE_SELECT', 'categoria'),
      filter('MULTI_SELECT', 'tags'),
      filter('NUMBER', 'minimo'),
      filter('DATE_RANGE', 'periodo'),
    ]
    const values = {
      'id-busca': '',
      'id-categoria': null,
      'id-tags': [],
      'id-minimo': null,
      'id-periodo': { start: null, end: null },
    }
    expect(filterParams(filters, values)).toEqual({
      busca: null,
      categoria: null,
      tags: null,
      minimo: null,
      periodo_inicio: null,
      periodo_fim: null,
    })
  })

  it('FLT-12 seleção múltipla envia a lista dos valores', () => {
    const params = filterParams([filter('MULTI_SELECT', 'categorias')], {
      'id-categorias': ['Livros', 'Jogos'],
    })
    expect(params).toEqual({ categorias: ['Livros', 'Jogos'] })
  })

  it('FLT-13 intervalo envia parametro_inicio e parametro_fim', () => {
    const range = [filter('DATE_RANGE', 'periodo')]
    expect(
      filterParams(range, {
        'id-periodo': { start: '2025-01-01', end: '2025-03-31' },
      }),
    ).toEqual({
      periodo_inicio: { kind: 'date', value: '2025-01-01' },
      periodo_fim: { kind: 'date', value: '2025-03-31' },
    })
    expect(
      filterParams(range, {
        'id-periodo': { start: '2025-01-01', end: null },
      }),
    ).toEqual({
      periodo_inicio: { kind: 'date', value: '2025-01-01' },
      periodo_fim: null,
    })
    expect(
      filterParams([filter('DATE', 'dia')], { 'id-dia': '2025-02-03' }),
    ).toEqual({ dia: { kind: 'date', value: '2025-02-03' } })
  })

  it('FLT-09 relevantParams mantém só os parâmetros do widget', () => {
    const params = {
      uf: 'SP',
      periodo_inicio: { kind: 'date' as const, value: '2025-01-01' },
      categoria: 'Livros',
    }
    const result = relevantParams(['uf', 'categoria'], params)
    expect(result).toEqual({ categoria: 'Livros', uf: 'SP' })
    expect(Object.keys(result)).toEqual(['categoria', 'uf'])
    expect(relevantParams([], params)).toEqual({})
  })

  it('FLT-16 widgetsUsingFilter conta os widgets de todas as abas', () => {
    const widgets = [
      { parameters: ['categoria'] },
      { parameters: ['categoria', 'uf'] },
      { parameters: ['uf'] },
    ]
    expect(
      widgetsUsingFilter(filter('SINGLE_SELECT', 'categoria'), widgets),
    ).toBe(2)
    expect(
      widgetsUsingFilter(filter('DATE_RANGE', 'periodo'), [
        { parameters: ['periodo_fim'] },
        { parameters: ['uf'] },
      ]),
    ).toBe(1)
  })

  it('FLT-25 intervalo invertido dá A data inicial é maior que a final', () => {
    expect(checkDateRange({ start: '2025-03-01', end: '2025-01-01' })).toBe(
      'A data inicial é maior que a final',
    )
    expect(
      checkDateRange({ start: '2025-03-01', end: '2025-03-01' }),
    ).toBeNull()
  })

  it('FLT-26 texto que não é número dá Digite um número', () => {
    for (const text of ['abc', '1,2,3']) {
      expect(parseNumberInput(text)).toEqual({
        ok: false,
        message: 'Digite um número',
      })
    }
    for (const text of ['1234,5', '1.234,5', '1234.5']) {
      expect(parseNumberInput(text)).toEqual({ ok: true, value: 1234.5 })
    }
    expect(parseNumberInput('')).toEqual({ ok: true, value: null })
  })

  it('FLT-26 ponto de milhar ambíguo é recusado com Digite um número', () => {
    for (const text of ['1.234', '1.000', '-12.345', '1.234.567']) {
      expect(parseNumberInput(text)).toEqual({
        ok: false,
        message: 'Digite um número',
      })
    }
    expect(parseNumberInput('1234')).toEqual({ ok: true, value: 1234 })
    expect(parseNumberInput('-3')).toEqual({ ok: true, value: -3 })
    expect(parseNumberInput('1.5')).toEqual({ ok: true, value: 1.5 })
    expect(parseNumberInput('0.001')).toEqual({ ok: true, value: 0.001 })
  })
})
