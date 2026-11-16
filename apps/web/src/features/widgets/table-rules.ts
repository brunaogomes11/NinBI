import type { ResultValue } from '@ninbi/contracts'

export const PAGE_SIZE = 50

export type SortDirection = 'asc' | 'desc'

export interface SortState {
  column: number
  direction: SortDirection
}

const collator = new Intl.Collator('pt-BR')

/** Número, `bigint` e texto não se misturam por valor: cada tipo tem a sua faixa. */
function rank(value: Exclude<ResultValue, null>): number {
  if (typeof value === 'number') return 0
  if (typeof value === 'object' && value.kind === 'bigint') return 0
  if (typeof value === 'string') return 1
  if (typeof value === 'boolean') return 2
  return 3
}

function compareNumeric(
  a: number | { kind: 'bigint'; value: string },
  b: number | { kind: 'bigint'; value: string },
): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const toBig = (value: typeof a): bigint | null => {
    if (typeof value === 'object') return BigInt(value.value)
    return Number.isInteger(value) ? BigInt(value) : null
  }
  const bigA = toBig(a)
  const bigB = toBig(b)
  if (bigA !== null && bigB !== null) {
    return bigA === bigB ? 0 : bigA < bigB ? -1 : 1
  }
  return (
    Number(typeof a === 'object' ? a.value : a) -
    Number(typeof b === 'object' ? b.value : b)
  )
}

/** Compara dois valores não nulos: números por valor, textos pela ordem do português. */
export function compareValues(
  a: Exclude<ResultValue, null>,
  b: Exclude<ResultValue, null>,
): number {
  const rankA = rank(a)
  const rankB = rank(b)
  if (rankA !== rankB) return rankA - rankB
  if (rankA === 0) {
    return compareNumeric(
      a as number | { kind: 'bigint'; value: string },
      b as number | { kind: 'bigint'; value: string },
    )
  }
  if (rankA === 1) return collator.compare(a as string, b as string)
  if (rankA === 2) return Number(a) - Number(b)
  return collator.compare(
    (a as { value: string }).value,
    (b as { value: string }).value,
  )
}

/** Ordena todas as linhas pela coluna; valores nulos ficam por último nos dois sentidos. */
export function sortRows(
  rows: ResultValue[][],
  column: number,
  direction: SortDirection,
): ResultValue[][] {
  const sign = direction === 'asc' ? 1 : -1
  return [...rows].sort((rowA, rowB) => {
    const a = rowA[column] ?? null
    const b = rowB[column] ?? null
    if (a === null && b === null) return 0
    if (a === null) return 1
    if (b === null) return -1
    return sign * compareValues(a, b)
  })
}

/** Clique no cabeçalho: crescente, decrescente, ordem original; outra coluna começa crescente. */
export function nextSort(
  current: SortState | null,
  column: number,
): SortState | null {
  if (current === null || current.column !== column) {
    return { column, direction: 'asc' }
  }
  return current.direction === 'asc' ? { column, direction: 'desc' } : null
}

export interface Page<T> {
  rows: T[]
  /** Página efetiva (1 a `pageCount`), já limitada ao que existe. */
  page: number
  pageCount: number
}

export function paginate<T>(
  rows: T[],
  page: number,
  pageSize = PAGE_SIZE,
): Page<T> {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(Math.max(1, page), pageCount)
  const start = (current - 1) * pageSize
  return {
    rows: rows.slice(start, start + pageSize),
    page: current,
    pageCount,
  }
}

export const EMPTY_CELL = '—'

export function formatCell(value: ResultValue): string {
  if (value === null) return EMPTY_CELL
  if (typeof value === 'object') return value.value
  return String(value)
}
