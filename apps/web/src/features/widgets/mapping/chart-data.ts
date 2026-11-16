import {
  MESSAGES,
  type QueryResultDto,
  type ResultValue,
  type WidgetMapping,
} from '@ninbi/contracts'
import { formatValue } from '@/lib/format'
import { columnIndex, toNumber } from './columns'

export type Built<T> =
  | { ok: true; data: T; notice?: string }
  | { ok: false; reason: 'empty' }
  | { ok: false; reason: 'error'; message: string }

export const MAX_CATEGORIES = 12

export interface ColumnRole {
  column: string
  numeric: boolean
}

/** Coluna mapeada que não existe (VIZ-12) ou em papel numérico sem números (VIZ-13). */
export function checkColumns(
  result: QueryResultDto,
  roles: ColumnRole[],
): Built<never> | null {
  for (const { column, numeric } of roles) {
    const index = columnIndex(result, column)
    if (index === -1) {
      return {
        ok: false,
        reason: 'error',
        message: MESSAGES.mappingColumnMissing(column),
      }
    }
    if (
      numeric &&
      !result.rows.some((row) => toNumber(row[index] ?? null) !== null)
    ) {
      return {
        ok: false,
        reason: 'error',
        message: MESSAGES.columnWithoutNumbers(column),
      }
    }
  }
  return null
}

const cell = (result: QueryResultDto, row: ResultValue[], name: string) =>
  row[columnIndex(result, name)] ?? null

export type CartesianPoint = {
  x: ResultValue
  xLabel: string
  [seriesKey: `s${number}`]: number | null
}

export function buildCartesian(
  result: QueryResultDto,
  mapping: Pick<WidgetMapping['AREA'], 'x' | 'series'>,
): Built<CartesianPoint[]> {
  if (result.rows.length === 0) return { ok: false, reason: 'empty' }
  const failure = checkColumns(result, [
    { column: mapping.x, numeric: false },
    ...mapping.series.map((column) => ({ column, numeric: true })),
  ])
  if (failure) return failure
  const data = result.rows.map((row) => {
    const x = cell(result, row, mapping.x)
    const point: CartesianPoint = { x, xLabel: formatValue(x) }
    mapping.series.forEach((name, i) => {
      point[`s${i}`] = toNumber(cell(result, row, name))
    })
    return point
  })
  return { ok: true, data }
}

export interface CategoryItem {
  key: string
  label: string
  value: number
}

function cutNotice(total: number): string | undefined {
  return total > MAX_CATEGORIES
    ? MESSAGES.categoriesCut(MAX_CATEGORIES, total)
    : undefined
}

export function buildCategories(
  result: QueryResultDto,
  mapping: { category: string; value: string },
  visualization: 'PIE' | 'RADIAL',
): Built<CategoryItem[]> {
  if (result.rows.length === 0) return { ok: false, reason: 'empty' }
  const failure = checkColumns(result, [
    { column: mapping.category, numeric: false },
    { column: mapping.value, numeric: true },
  ])
  if (failure) return failure
  const items: { label: string; value: number }[] = []
  for (const row of result.rows.slice(0, MAX_CATEGORIES)) {
    const value = toNumber(cell(result, row, mapping.value))
    if (value === null) continue
    if (visualization === 'PIE' && value < 0) continue
    items.push({
      label: formatValue(cell(result, row, mapping.category)),
      value,
    })
  }
  const drawable =
    visualization === 'PIE'
      ? items.some((item) => item.value > 0)
      : items.length > 0
  if (!drawable) return { ok: false, reason: 'empty' }
  return {
    ok: true,
    data: items.map((item, i) => ({ key: `c${i}`, ...item })),
    notice: cutNotice(result.rows.length),
  }
}

export type RadarPoint = {
  axis: string
  [seriesKey: `s${number}`]: number | null
}

export function buildRadar(
  result: QueryResultDto,
  mapping: WidgetMapping['RADAR'],
): Built<RadarPoint[]> {
  if (result.rows.length === 0) return { ok: false, reason: 'empty' }
  const failure = checkColumns(result, [
    { column: mapping.axis, numeric: false },
    ...mapping.series.map((column) => ({ column, numeric: true })),
  ])
  if (failure) return failure
  const data = result.rows.slice(0, MAX_CATEGORIES).map((row) => {
    const point: RadarPoint = {
      axis: formatValue(cell(result, row, mapping.axis)),
    }
    mapping.series.forEach((name, i) => {
      point[`s${i}`] = toNumber(cell(result, row, name))
    })
    return point
  })
  return { ok: true, data, notice: cutNotice(result.rows.length) }
}

const PALETTE_SIZE = 5

export function seriesColor(index: number): string {
  return `var(--chart-${(index % PALETTE_SIZE) + 1})`
}

export type ChartSeriesConfig = Record<string, { label: string; color: string }>

/** Chaves seguras (`s0..`, ou `c0..` nas categorias): o shadcn as usa como variável CSS. */
export function buildChartConfig(
  labels: string[],
  prefix: 's' | 'c' = 's',
): ChartSeriesConfig {
  return Object.fromEntries(
    labels.map((label, i) => [
      `${prefix}${i}`,
      { label, color: seriesColor(i) },
    ]),
  )
}

const CHAR_WIDTH_PX = 7
const LABEL_PADDING_PX = 16

/** Menor `n` tal que um rótulo a cada `n + 1` cabe na largura sem sobreposição. */
export function tickInterval(labels: string[], widthPx: number): number {
  if (labels.length === 0) return 0
  const longest = Math.max(...labels.map((label) => label.length))
  const labelWidth = CHAR_WIDTH_PX * longest + LABEL_PADDING_PX
  let interval = 0
  while (
    interval < labels.length &&
    Math.ceil(labels.length / (interval + 1)) * labelWidth > widthPx
  ) {
    interval += 1
  }
  return interval
}
