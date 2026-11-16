import type { QueryResultDto, ResultValue } from '@ninbi/contracts'
import { describe, expect, it } from 'vitest'
import { columnIndex, columnKinds, toNumber } from './columns'

const result = (columns: string[], rows: ResultValue[][]): QueryResultDto => ({
  columns,
  rows,
  truncated: false,
  rowLimit: 5000,
})

describe('columns', () => {
  it('VIZ-03 coluna só de nulos é other', () => {
    expect(columnKinds(result(['a'], [[null], [null]]))).toEqual(['other'])
  })

  it('VIZ-03 bigint conta como número', () => {
    const r = result(['id'], [[{ kind: 'bigint', value: '9007199254740993' }]])
    expect(columnKinds(r)).toEqual(['number'])
  })

  it('VIZ-03 coluna com número e texto é other e nulos são ignorados', () => {
    expect(columnKinds(result(['a'], [[1], ['x']]))).toEqual(['other'])
    expect(columnKinds(result(['a'], [[1], [null], [2.5]]))).toEqual(['number'])
  })

  it('VIZ-14 toNumber de texto, booleano e json é null', () => {
    expect(toNumber('12')).toBeNull()
    expect(toNumber(true)).toBeNull()
    expect(toNumber({ kind: 'json', value: '1' })).toBeNull()
    expect(toNumber(null)).toBeNull()
    expect(toNumber(7.5)).toBe(7.5)
    expect(toNumber({ kind: 'bigint', value: '42' })).toBe(42)
  })

  it('VIZ-12 columnIndex acha a primeira coluna com o nome e dá -1 sem ela', () => {
    const r = result(['mes', 'vendas', 'mes'], [])
    expect(columnIndex(r, 'mes')).toBe(0)
    expect(columnIndex(r, 'vendas')).toBe(1)
    expect(columnIndex(r, 'custo')).toBe(-1)
  })
})
