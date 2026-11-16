import type { QueryResultDto, ResultValue } from '@ninbi/contracts'

/** Número fica; `bigint` vira `Number`; nulo, booleano, texto e `json` viram `null`. */
export function toNumber(value: ResultValue): number | null {
  if (typeof value === 'number') return value
  if (value !== null && typeof value === 'object' && value.kind === 'bigint') {
    return Number(value.value)
  }
  return null
}

/** Coluna `number` tem ao menos um valor não nulo e todos os não nulos são números. */
export function columnKinds(result: QueryResultDto): ('number' | 'other')[] {
  return result.columns.map((_, index) => {
    const values = result.rows
      .map((row) => row[index] ?? null)
      .filter((value) => value !== null)
    const numeric =
      values.length > 0 && values.every((value) => toNumber(value) !== null)
    return numeric ? 'number' : 'other'
  })
}

export function columnIndex(result: QueryResultDto, name: string): number {
  return result.columns.indexOf(name)
}
