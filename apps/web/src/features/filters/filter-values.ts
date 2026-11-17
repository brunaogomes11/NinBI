import {
  type DashboardFilter,
  type FilterScalar,
  type FilterType,
  type FilterValue,
  filterParameterNames,
  MESSAGES,
  type QueryParamValue,
} from '@ninbi/contracts'

type DateRangeValue = { start: string | null; end: string | null }

function isRange(value: FilterValue): value is DateRangeValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function dateParam(value: string | null | undefined): QueryParamValue {
  return value ? { kind: 'date', value } : null
}

/** Vazio: `null`, texto vazio, lista vazia ou intervalo sem nenhuma das duas datas. */
export function isEmptyValue(type: FilterType, value: FilterValue): boolean {
  if (value === null || value === undefined) return true
  if (type === 'DATE_RANGE') {
    return !isRange(value) || (!value.start && !value.end)
  }
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'string') return value === ''
  return false
}

export function defaultValues(
  filters: DashboardFilter[],
): Record<string, FilterValue> {
  return Object.fromEntries(filters.map((f) => [f.id, f.defaultValue]))
}

/** Valores da sessão no formato dos parâmetros da consulta (FLT-11 a FLT-13). */
export function filterParams(
  filters: DashboardFilter[],
  values: Record<string, FilterValue>,
): Record<string, QueryParamValue> {
  const params: Record<string, QueryParamValue> = {}
  for (const filter of filters) {
    const value = values[filter.id] ?? null
    if (filter.type === 'DATE_RANGE') {
      const range = isRange(value) ? value : { start: null, end: null }
      const [startName, endName] = filterParameterNames(filter)
      params[startName as string] = dateParam(range.start)
      params[endName as string] = dateParam(range.end)
    } else if (isEmptyValue(filter.type, value)) {
      params[filter.parameter] = null
    } else if (filter.type === 'DATE') {
      params[filter.parameter] = dateParam(value as string)
    } else if (filter.type === 'MULTI_SELECT') {
      params[filter.parameter] = [...(value as FilterScalar[])]
    } else {
      params[filter.parameter] = value as FilterScalar
    }
  }
  return params
}

/** Só os parâmetros que o widget usa, em ordem alfabética (chave estável da query). */
export function relevantParams(
  widgetParameters: string[],
  params: Record<string, QueryParamValue>,
): Record<string, QueryParamValue> {
  const result: Record<string, QueryParamValue> = {}
  for (const name of [...widgetParameters].sort()) {
    if (name in params) result[name] = params[name] as QueryParamValue
  }
  return result
}

/** Widgets de todas as abas que usam ao menos um parâmetro do filtro. */
export function widgetsUsingFilter(
  filter: Pick<DashboardFilter, 'parameter' | 'type'>,
  widgets: { parameters: string[] }[],
): number {
  const names = filterParameterNames(filter)
  return widgets.filter((w) => w.parameters.some((p) => names.includes(p)))
    .length
}

/** Opções sem repetidas por texto (`1` e `'1'` são a mesma opção), na ordem da primeira aparição. */
export function uniqueOptions<T extends string | number | boolean>(
  options: readonly T[],
): T[] {
  const seen = new Set<string>()
  return options.filter((option) => {
    const key = String(option)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Linhas da lista fixa: sem espaços nas pontas, sem vazias e sem repetidas. */
export function parseStaticOptions(text: string): string[] {
  return uniqueOptions(
    text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== ''),
  )
}

export type NumberInputResult =
  | { ok: true; value: number | null }
  | { ok: false; message: string }

/** Aceita `1234,5`, `1.234,5` e `1234.5`; vazio é `null`. */
export function parseNumberInput(text: string): NumberInputResult {
  const trimmed = text.trim()
  if (trimmed === '') return { ok: true, value: null }
  const invalid = { ok: false, message: MESSAGES.filterNumberInvalid } as const
  let normalized: string
  if (trimmed.includes(',')) {
    if (!/^-?\d{1,3}(\.\d{3})*,\d+$|^-?\d+,\d+$/.test(trimmed)) return invalid
    normalized = trimmed.replace(/\./g, '').replace(',', '.')
  } else if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    normalized = trimmed
  } else {
    return invalid
  }
  const value = Number(normalized)
  return Number.isFinite(value) ? { ok: true, value } : invalid
}

export function checkDateRange(value: {
  start: string | null
  end: string | null
}): string | null {
  return value.start && value.end && value.start > value.end
    ? MESSAGES.filterDateRangeInverted
    : null
}
