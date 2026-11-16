import type {
  FilterScalar,
  FilterType,
  QueryResultDto,
  ResultValue,
} from '@ninbi/contracts'
import { columnIndex, toNumber } from '../widgets/mapping/columns'

const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/

function cellText(cell: NonNullable<ResultValue>): string {
  return typeof cell === 'object' ? cell.value : String(cell)
}

function convert(
  cell: ResultValue,
  type: FilterType,
): FilterScalar | undefined {
  if (cell === null) return undefined
  switch (type) {
    case 'TEXT':
      return cellText(cell)
    case 'SINGLE_SELECT':
      return typeof cell === 'object' ? cell.value : cell
    case 'NUMBER':
      return toNumber(cell) ?? undefined
    case 'DATE':
      return typeof cell === 'string' && DATE_PREFIX.test(cell)
        ? cell.slice(0, 10)
        : undefined
    default:
      return undefined
  }
}

/** Valor do filtro a partir da célula da coluna configurada na linha clicada. */
export function clickValue(
  result: QueryResultDto,
  column: string,
  rowIndex: number,
  type: FilterType,
): FilterScalar | undefined {
  const index = columnIndex(result, column)
  if (index < 0) return undefined
  return convert(result.rows[rowIndex]?.[index] ?? null, type)
}

/** Linhas cuja célula, convertida como no clique, é igual ao valor selecionado. */
export function selectedRows(
  result: QueryResultDto,
  column: string,
  type: FilterType,
  value: unknown,
): Set<number> {
  const selected = new Set<number>()
  const index = columnIndex(result, column)
  if (index < 0) return selected
  result.rows.forEach((row, rowIndex) => {
    const converted = convert(row[index] ?? null, type)
    if (converted !== undefined && converted === value) selected.add(rowIndex)
  })
  return selected
}
