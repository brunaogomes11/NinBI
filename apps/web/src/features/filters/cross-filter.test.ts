import type { QueryResultDto } from '@ninbi/contracts'
import { describe, expect, it } from 'vitest'
import { clickValue, selectedRows } from './cross-filter'

const result: QueryResultDto = {
  columns: ['categoria', 'total', 'dia'],
  rows: [
    ['Eletrônicos', 80, '2025-01-10'],
    ['Livros', 120.5, '2025-02-03T10:00:00Z'],
    ['Livros', null, null],
  ],
  truncated: false,
  rowLimit: 1000,
}

describe('cross-filter', () => {
  it('XFL-02 clickValue lê a coluna configurada na linha clicada', () => {
    expect(clickValue(result, 'categoria', 1, 'TEXT')).toBe('Livros')
    expect(clickValue(result, 'total', 1, 'NUMBER')).toBe(120.5)
    expect(clickValue(result, 'total', 1, 'SINGLE_SELECT')).toBe(120.5)
    expect(clickValue(result, 'dia', 1, 'DATE')).toBe('2025-02-03')
    expect(clickValue(result, 'total', 2, 'NUMBER')).toBeUndefined()
    expect(clickValue(result, 'inexistente', 1, 'TEXT')).toBeUndefined()
    const big: QueryResultDto = {
      ...result,
      columns: ['id'],
      rows: [[{ kind: 'bigint', value: '9007199254740993' }]],
    }
    expect(clickValue(big, 'id', 0, 'TEXT')).toBe('9007199254740993')
  })

  it('XFL-04 selectedRows marca as linhas com o valor selecionado', () => {
    expect(selectedRows(result, 'categoria', 'TEXT', 'Livros')).toEqual(
      new Set([1, 2]),
    )
    expect(selectedRows(result, 'categoria', 'TEXT', 'Brinquedos')).toEqual(
      new Set(),
    )
  })
})
