import type { ResultValue } from '@ninbi/contracts'
import { describe, expect, it } from 'vitest'
import {
  compareValues,
  formatCell,
  nextSort,
  paginate,
  sortRows,
} from './table-rules'

const column = (values: ResultValue[]): ResultValue[][] =>
  values.map((value) => [value])

const firstColumn = (rows: ResultValue[][]): ResultValue[] =>
  rows.map((row) => row[0] ?? null)

describe('table-rules', () => {
  it('TBL-03 números por valor, textos em ordem do português e nulos por último', () => {
    const numbers = column([10, 9, null, 100])
    expect(firstColumn(sortRows(numbers, 0, 'asc'))).toEqual([9, 10, 100, null])
    expect(firstColumn(sortRows(numbers, 0, 'desc'))).toEqual([
      100,
      10,
      9,
      null,
    ])

    const texts = column(['Ébano', 'abacate', 'Zebra', null])
    expect(firstColumn(sortRows(texts, 0, 'asc'))).toEqual([
      'abacate',
      'Ébano',
      'Zebra',
      null,
    ])

    const big = { kind: 'bigint', value: '9007199254740993' } as const
    const below = { kind: 'bigint', value: '9007199254740992' } as const
    expect(firstColumn(sortRows(column([big, below]), 0, 'asc'))).toEqual([
      below,
      big,
    ])
    expect(compareValues(big, below)).toBeGreaterThan(0)
  })

  it('TBL-02 nextSort alterna crescente, decrescente e original, e outra coluna começa crescente', () => {
    const first = nextSort(null, 1)
    expect(first).toEqual({ column: 1, direction: 'asc' })
    const second = nextSort(first, 1)
    expect(second).toEqual({ column: 1, direction: 'desc' })
    expect(nextSort(second, 1)).toBeNull()
    expect(nextSort(second, 0)).toEqual({ column: 0, direction: 'asc' })
  })

  it('TBL-04 paginate devolve 50 linhas por página e limita a página pedida', () => {
    const rows = Array.from({ length: 120 }, (_, i) => i)
    const first = paginate(rows, 1)
    expect(first.rows).toHaveLength(50)
    expect(first.pageCount).toBe(3)
    expect(paginate(rows, 3).rows).toHaveLength(20)
    expect(paginate(rows, 9).page).toBe(3)
    expect(paginate([], 1)).toEqual({ rows: [], page: 1, pageCount: 1 })
  })

  it('TBL-06 formatCell mostra JSON e inteiros grandes como texto e nulo como travessão', () => {
    expect(formatCell({ kind: 'json', value: '{"a":1}' })).toBe('{"a":1}')
    expect(formatCell({ kind: 'bigint', value: '9007199254740993' })).toBe(
      '9007199254740993',
    )
    expect(formatCell(null)).toBe('—')
    expect(formatCell(true)).toBe('true')
    expect(formatCell(42)).toBe('42')
  })
})
