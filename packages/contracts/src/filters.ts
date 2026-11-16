import { z } from 'zod'
import { MESSAGES } from './messages'

export const FILTER_TYPES = [
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'TEXT',
  'NUMBER',
  'DATE',
  'DATE_RANGE',
] as const
export type FilterType = (typeof FILTER_TYPES)[number]

export const FILTER_TYPE_LABELS: Record<FilterType, string> = {
  SINGLE_SELECT: 'Seleção única',
  MULTI_SELECT: 'Seleção múltipla',
  TEXT: 'Texto',
  NUMBER: 'Número',
  DATE: 'Data',
  DATE_RANGE: 'Intervalo de datas',
}

export const CROSS_FILTER_TYPES: FilterType[] = [
  'SINGLE_SELECT',
  'TEXT',
  'NUMBER',
  'DATE',
]

export const OPTION_SOURCES = ['STATIC', 'QUERY'] as const
export type OptionSource = (typeof OPTION_SOURCES)[number]
export const OPTION_SOURCE_LABELS: Record<OptionSource, string> = {
  STATIC: 'Lista fixa',
  QUERY: 'Consulta Cypher',
}

export const FILTER_OPTIONS_MAX = 1000
export const MAX_FILTERS = 30
const PARAMETER_MAX = 40
const OPTIONS_CYPHER_MAX = 20_000

export type FilterScalar = string | number | boolean
export type DateText = string

export type FilterValue =
  | FilterScalar
  | FilterScalar[]
  | { start: DateText | null; end: DateText | null }
  | null

export type FilterOptions =
  | { source: 'STATIC'; values: string[] }
  | { source: 'QUERY'; cypher: string | null }

export interface DashboardFilter {
  id: string
  label: string
  parameter: string
  type: FilterType
  options: FilterOptions | null
  defaultValue: FilterValue
}

export const REFRESH_INTERVALS = [0, 10, 30, 60, 300, 900, 3600] as const
export type RefreshInterval = (typeof REFRESH_INTERVALS)[number]
export const REFRESH_INTERVAL_LABELS: Record<RefreshInterval, string> = {
  0: 'Desligada',
  10: '10 s',
  30: '30 s',
  60: '1 min',
  300: '5 min',
  900: '15 min',
  3600: '1 h',
}

export function filterParameterNames(
  f: Pick<DashboardFilter, 'parameter' | 'type'>,
): string[] {
  return f.type === 'DATE_RANGE'
    ? [`${f.parameter}_inicio`, `${f.parameter}_fim`]
    : [f.parameter]
}

function isValidDate(text: unknown): text is string {
  if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return false
  }
  const [y, m, d] = text.split('-').map(Number) as [number, number, number]
  const date = new Date(Date.UTC(y, m - 1, d))
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  )
}

const isScalar = (v: unknown): v is FilterScalar =>
  typeof v === 'string' ||
  typeof v === 'boolean' ||
  (typeof v === 'number' && Number.isFinite(v))

function defaultValueError(type: FilterType, value: unknown): string | null {
  const invalid = MESSAGES.filterDefaultInvalid
  switch (type) {
    case 'SINGLE_SELECT':
      return value === null || isScalar(value) ? null : invalid
    case 'MULTI_SELECT':
      return Array.isArray(value) && value.every(isScalar) ? null : invalid
    case 'TEXT':
      return value === null || typeof value === 'string' ? null : invalid
    case 'NUMBER':
      return value === null ||
        (typeof value === 'number' && Number.isFinite(value))
        ? null
        : invalid
    case 'DATE':
      return value === null || isValidDate(value) ? null : invalid
    case 'DATE_RANGE': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return invalid
      }
      const { start, end } = value as { start?: unknown; end?: unknown }
      const okStart = start === null || isValidDate(start)
      const okEnd = end === null || isValidDate(end)
      if (!okStart || !okEnd) return invalid
      if (typeof start === 'string' && typeof end === 'string' && start > end) {
        return MESSAGES.filterDateRangeInverted
      }
      return null
    }
  }
}

const filterOptionsSchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('STATIC'),
    values: z
      .array(z.string().min(1).max(200))
      .min(1, MESSAGES.filterOptionsRequired)
      .max(FILTER_OPTIONS_MAX, MESSAGES.filterOptionsTooMany),
  }),
  z.object({
    source: z.literal('QUERY'),
    cypher: z
      .string()
      .trim()
      .min(1, MESSAGES.filterOptionsQueryRequired)
      .max(OPTIONS_CYPHER_MAX, MESSAGES.cypherTooLong),
  }),
])

export const dashboardFilterSchema = z
  .object({
    id: z.uuid(),
    label: z
      .string()
      .trim()
      .min(1, MESSAGES.filterLabelRequired)
      .max(40, MESSAGES.filterLabelTooLong),
    parameter: z
      .string()
      .min(1, MESSAGES.filterParameterRequired)
      .max(PARAMETER_MAX, MESSAGES.filterParameterTooLong)
      .regex(/^[A-Za-z][A-Za-z0-9_]*$/, MESSAGES.filterParameterInvalid),
    type: z.enum(FILTER_TYPES),
    options: filterOptionsSchema.nullable().default(null),
    defaultValue: z.unknown().default(null),
  })
  .superRefine((filter, ctx) => {
    const selection =
      filter.type === 'SINGLE_SELECT' || filter.type === 'MULTI_SELECT'
    if (selection && filter.options === null) {
      ctx.addIssue({
        code: 'custom',
        message: MESSAGES.filterOptionsRequired,
        path: ['options'],
      })
    }
    const error = defaultValueError(filter.type, filter.defaultValue)
    if (error) {
      ctx.addIssue({ code: 'custom', message: error, path: ['defaultValue'] })
    }
  }) as unknown as z.ZodType<DashboardFilter, unknown>

export const dashboardFiltersSchema = z
  .array(dashboardFilterSchema)
  .max(MAX_FILTERS)
  .superRefine((filters, ctx) => {
    const used = new Set<string>()
    filters.forEach((filter, i) => {
      const names = filterParameterNames(filter)
      if (names.some((name) => used.has(name))) {
        ctx.addIssue({
          code: 'custom',
          message: MESSAGES.filterParameterTaken,
          path: [i, 'parameter'],
        })
      }
      for (const name of names) used.add(name)
    })
  })

const paramScalar = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.object({
    kind: z.literal('date'),
    value: z.string().refine(isValidDate),
  }),
])

export type QueryParamScalar = FilterScalar | { kind: 'date'; value: DateText }
export type QueryParamValue = QueryParamScalar | QueryParamScalar[] | null

export const queryParamsSchema = z.record(
  z.string(),
  z.union([paramScalar, z.array(paramScalar).max(1000), z.null()]),
)

export const crossFilterSchema = z.object({
  filterId: z.string().min(1),
  column: z.string().min(1).max(200),
})
export interface CrossFilterConfig {
  filterId: string
  column: string
}

export interface FilterOptionsDto {
  options: FilterScalar[]
  truncated: boolean
}

export const filterOptionsDraftSchema = z.object({
  cypher: z
    .string()
    .min(1, MESSAGES.filterOptionsQueryRequired)
    .max(OPTIONS_CYPHER_MAX, MESSAGES.cypherTooLong),
  connectionId: z.uuid().optional(),
})
export type FilterOptionsDraftInput = z.input<typeof filterOptionsDraftSchema>

export const filterPromptInfoSchema = z.object({
  label: z.string(),
  parameter: z.string(),
  type: z.enum(FILTER_TYPES),
})
export interface FilterPromptInfo {
  label: string
  parameter: string
  type: FilterType
}

export function filtersForPrompt(
  filters: Pick<DashboardFilter, 'label' | 'parameter' | 'type'>[],
): FilterPromptInfo[] {
  return filters.map(({ label, parameter, type }) => ({
    label,
    parameter,
    type,
  }))
}
