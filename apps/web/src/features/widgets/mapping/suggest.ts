import {
  MAPPING_FIELD_LABELS,
  MESSAGES,
  type QueryResultDto,
  type WidgetVisualization,
} from '@ninbi/contracts'
import { columnKinds } from './columns'

/** O `WidgetMapping` da visualização com os campos de coluna ainda sem escolha (`null` ou `[]`). */
export type MappingDraft = Record<string, string | string[] | boolean | null>

const EMPTY: Record<WidgetVisualization, MappingDraft> = {
  TABLE: {},
  LIST: { primary: null, secondary: null, values: [] },
  AREA: { x: null, series: [], stacked: false },
  BAR: { x: null, series: [], stacked: false, horizontal: false },
  LINE: { x: null, series: [] },
  PIE: { category: null, value: null, donut: false },
  RADAR: { axis: null, series: [] },
  RADIAL: { category: null, value: null },
  KPI: { value: null, change: null },
  MAP: { lat: null, lon: null, label: null },
}

const REQUIRED: Record<WidgetVisualization, string[]> = {
  TABLE: [],
  LIST: ['primary'],
  AREA: ['x', 'series'],
  BAR: ['x', 'series'],
  LINE: ['x', 'series'],
  PIE: ['category', 'value'],
  RADAR: ['axis', 'series'],
  RADIAL: ['category', 'value'],
  KPI: ['value'],
  MAP: ['lat', 'lon'],
}

const LAT_NAMES = ['lat', 'latitude']
const LON_NAMES = ['lon', 'lng', 'long', 'longitude']

export function emptyMapping(v: WidgetVisualization): MappingDraft {
  return structuredClone(EMPTY[v])
}

export function suggestMapping(
  v: WidgetVisualization,
  result: QueryResultDto,
): MappingDraft {
  const kinds = columnKinds(result)
  const names = (kind: 'number' | 'other') =>
    result.columns.filter((_, i) => kinds[i] === kind)
  const numbers = names('number')
  const firstOther = names('other')[0] ?? null
  const draft = emptyMapping(v)

  switch (v) {
    case 'AREA':
    case 'BAR':
    case 'LINE': {
      const x = firstOther ?? result.columns[0] ?? null
      draft.x = x
      draft.series = numbers.filter((name) => name !== x)
      break
    }
    case 'PIE':
    case 'RADIAL':
      draft.category = firstOther
      draft.value = numbers[0] ?? null
      break
    case 'RADAR':
      draft.axis = firstOther
      draft.series = numbers
      break
    case 'KPI':
      draft.value = numbers[0] ?? null
      break
    case 'MAP': {
      const find = (accepted: string[]) =>
        result.columns.find((name) => accepted.includes(name.toLowerCase())) ??
        null
      draft.lat = find(LAT_NAMES)
      draft.lon = find(LON_NAMES)
      draft.label = firstOther
      break
    }
    case 'LIST':
      draft.primary = firstOther
      draft.values = numbers.slice(0, 2)
      break
    case 'TABLE':
      break
  }
  return draft
}

const CARTESIAN: WidgetVisualization[] = ['AREA', 'BAR', 'LINE']
const CATEGORICAL: WidgetVisualization[] = ['PIE', 'RADIAL']

/** Mantém o que serve na troca de visualização; o resto vira a sugestão da nova (VIZ-19). */
export function adaptMapping(
  prev: MappingDraft,
  prevV: WidgetVisualization,
  nextV: WidgetVisualization,
  result: QueryResultDto | null,
): MappingDraft {
  if (prevV === nextV) return prev
  if (!result) return emptyMapping(nextV)
  if (CARTESIAN.includes(prevV) && CARTESIAN.includes(nextV)) {
    const next = emptyMapping(nextV)
    next.x = prev.x ?? null
    next.series = prev.series ?? []
    if ('stacked' in next) next.stacked = prev.stacked === true
    return next
  }
  if (CATEGORICAL.includes(prevV) && CATEGORICAL.includes(nextV)) {
    const next = emptyMapping(nextV)
    next.category = prev.category ?? null
    next.value = prev.value ?? null
    return next
  }
  return suggestMapping(nextV, result)
}

function isEmpty(value: MappingDraft[string] | undefined): boolean {
  if (value === undefined || value === null || value === '') return true
  return Array.isArray(value) && value.length === 0
}

/** Primeiro campo obrigatório vazio, na ordem dos campos (VIZ-11). */
export function validateMapping(
  v: WidgetVisualization,
  draft: MappingDraft,
): { field: string; message: string } | null {
  for (const field of REQUIRED[v]) {
    if (isEmpty(draft[field])) {
      const label =
        MAPPING_FIELD_LABELS[field as keyof typeof MAPPING_FIELD_LABELS]
      return { field, message: MESSAGES.chooseField(label) }
    }
  }
  return null
}
