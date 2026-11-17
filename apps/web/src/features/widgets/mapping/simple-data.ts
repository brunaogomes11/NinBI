import {
  MESSAGES,
  type QueryResultDto,
  type ResultValue,
  type WidgetMapping,
} from '@ninbi/contracts'
import { formatNumber, formatValue } from '@/lib/format'
import { type Built, checkColumns } from './chart-data'
import { columnIndex, toNumber } from './columns'

const cell = (result: QueryResultDto, row: ResultValue[], name: string) =>
  row[columnIndex(result, name)] ?? null

const roles = (columns: (string | null)[], numeric: boolean) =>
  columns
    .filter((column): column is string => column !== null)
    .map((column) => ({ column, numeric }))

const hasValues = (result: QueryResultDto, column: string | null) => {
  const index = column === null ? -1 : columnIndex(result, column)
  return (
    index !== -1 && result.rows.some((row) => (row[index] ?? null) !== null)
  )
}

export interface KpiData {
  value: string
  change: number | null
  direction: 'up' | 'down' | 'flat' | null
  changeLabel: string | null
}

/** O sinal vem do valor como exibido: -0,001 mostra "0%" e não leva seta (0 exato segue "alta"). */
function directionOf(change: number | null): KpiData['direction'] {
  if (change === null) return null
  if (change === 0) return 'up'
  if (formatNumber(Math.abs(change)) === '0') return 'flat'
  return change > 0 ? 'up' : 'down'
}

export function buildKpi(
  result: QueryResultDto,
  mapping: WidgetMapping['KPI'],
): Built<KpiData> {
  if (result.rows.length === 0) return { ok: false, reason: 'empty' }
  const failure = checkColumns(result, [
    ...roles([mapping.value], false),
    // Variação nula é "sem variação" (KPI-04): só texto na coluna é VIZ-13.
    ...roles([mapping.change], hasValues(result, mapping.change)),
  ])
  if (failure) return failure
  const row = result.rows[0] ?? []
  const change =
    mapping.change === null ? null : toNumber(cell(result, row, mapping.change))
  return {
    ok: true,
    data: {
      value: formatValue(cell(result, row, mapping.value)),
      change,
      direction: directionOf(change),
      changeLabel:
        change === null ? null : `${formatNumber(Math.abs(change))}%`,
    },
  }
}

export interface ListItemData {
  primary: string
  secondary: string | null
  values: string[]
}

export function buildList(
  result: QueryResultDto,
  mapping: WidgetMapping['LIST'],
): Built<ListItemData[]> {
  if (result.rows.length === 0) return { ok: false, reason: 'empty' }
  const failure = checkColumns(result, [
    ...roles([mapping.primary, mapping.secondary], false),
    ...roles(mapping.values, true),
  ])
  if (failure) return failure
  const data = result.rows.map((row) => ({
    primary: formatValue(cell(result, row, mapping.primary)),
    secondary:
      mapping.secondary === null
        ? null
        : formatValue(cell(result, row, mapping.secondary)),
    values: mapping.values.map((name) => formatValue(cell(result, row, name))),
  }))
  return { ok: true, data }
}

export interface MapPoint {
  lat: number
  lon: number
  label: string | null
  sameSpotLabels: string[]
}

const validCoordinate = (n: number | null, limit: number): n is number =>
  n !== null && Number.isFinite(n) && Math.abs(n) <= limit

/** A linha do resultado de cada ponto de `buildMapPoints` (linhas com coordenada inválida ficam de fora). */
export function mapPointRows(
  result: QueryResultDto,
  mapping: WidgetMapping['MAP'],
): number[] {
  const rows: number[] = []
  result.rows.forEach((row, rowIndex) => {
    const lat = toNumber(cell(result, row, mapping.lat))
    const lon = toNumber(cell(result, row, mapping.lon))
    if (validCoordinate(lat, 90) && validCoordinate(lon, 180)) {
      rows.push(rowIndex)
    }
  })
  return rows
}

export function buildMapPoints(
  result: QueryResultDto,
  mapping: WidgetMapping['MAP'],
): Built<MapPoint[]> {
  if (result.rows.length === 0) return { ok: false, reason: 'empty' }
  const failure = checkColumns(
    result,
    roles([mapping.lat, mapping.lon, mapping.label], false),
  )
  if (failure) return failure

  const points: MapPoint[] = []
  let discarded = 0
  for (const row of result.rows) {
    const lat = toNumber(cell(result, row, mapping.lat))
    const lon = toNumber(cell(result, row, mapping.lon))
    if (!validCoordinate(lat, 90) || !validCoordinate(lon, 180)) {
      discarded += 1
      continue
    }
    const label =
      mapping.label === null
        ? null
        : formatValue(cell(result, row, mapping.label))
    points.push({ lat, lon, label, sameSpotLabels: [] })
  }
  if (points.length === 0) {
    return { ok: false, reason: 'error', message: MESSAGES.noValidCoordinates }
  }

  const bySpot = new Map<string, string[]>()
  for (const point of points) {
    const key = `${point.lat},${point.lon}`
    const labels = bySpot.get(key) ?? []
    if (point.label !== null) labels.push(point.label)
    bySpot.set(key, labels)
  }
  for (const point of points) {
    point.sameSpotLabels = bySpot.get(`${point.lat},${point.lon}`) ?? []
  }
  return {
    ok: true,
    data: points,
    notice: discarded > 0 ? MESSAGES.invalidCoordinates(discarded) : undefined,
  }
}

export type MapViewport =
  | { bounds: [[number, number], [number, number]] }
  | { center: [number, number]; zoom: number }

const SINGLE_POINT_ZOOM = 10

export function mapViewport(points: MapPoint[]): MapViewport {
  const lats = points.map((point) => point.lat)
  const lons = points.map((point) => point.lon)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)
  if (minLat === maxLat && minLon === maxLon) {
    return { center: [minLat, minLon], zoom: SINGLE_POINT_ZOOM }
  }
  return {
    bounds: [
      [minLat, minLon],
      [maxLat, maxLon],
    ],
  }
}
