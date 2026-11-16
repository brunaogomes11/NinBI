import { z } from 'zod'

export const WIDGET_VISUALIZATIONS = [
  'TABLE',
  'LIST',
  'AREA',
  'BAR',
  'LINE',
  'PIE',
  'RADAR',
  'RADIAL',
  'KPI',
  'MAP',
] as const
export type WidgetVisualization = (typeof WIDGET_VISUALIZATIONS)[number]

export const VISUALIZATION_LABELS: Record<WidgetVisualization, string> = {
  TABLE: 'Tabela',
  LIST: 'Lista',
  AREA: 'Área',
  BAR: 'Barras',
  LINE: 'Linha',
  PIE: 'Pizza',
  RADAR: 'Radar',
  RADIAL: 'Radial',
  KPI: 'KPI',
  MAP: 'Mapa',
}

type Col = string

export type WidgetMapping = {
  TABLE: Record<string, never>
  LIST: { primary: Col; secondary: Col | null; values: Col[] }
  AREA: { x: Col; series: Col[]; stacked: boolean }
  BAR: { x: Col; series: Col[]; stacked: boolean; horizontal: boolean }
  LINE: { x: Col; series: Col[] }
  PIE: { category: Col; value: Col; donut: boolean }
  RADAR: { axis: Col; series: Col[] }
  RADIAL: { category: Col; value: Col }
  KPI: { value: Col; change: Col | null }
  MAP: { lat: Col; lon: Col; label: Col | null }
}

export type WidgetConfig<V extends WidgetVisualization = WidgetVisualization> =
  V extends 'TABLE'
    ? Record<string, never> | { mapping?: undefined }
    : { mapping: WidgetMapping[V] }

const col = z.string().min(1).max(200)
const series = z.array(col).min(1)

export const widgetMappingSchemas: {
  [V in WidgetVisualization]: z.ZodType<WidgetMapping[V]>
} = {
  TABLE: z.object({}) as unknown as z.ZodType<Record<string, never>>,
  LIST: z.object({
    primary: col,
    secondary: col.nullable(),
    values: z.array(col).max(2),
  }),
  AREA: z.object({ x: col, series, stacked: z.boolean() }),
  BAR: z.object({
    x: col,
    series,
    stacked: z.boolean(),
    horizontal: z.boolean(),
  }),
  LINE: z.object({ x: col, series }),
  PIE: z.object({ category: col, value: col, donut: z.boolean() }),
  RADAR: z.object({ axis: col, series }),
  RADIAL: z.object({ category: col, value: col }),
  KPI: z.object({ value: col, change: col.nullable() }),
  MAP: z.object({ lat: col, lon: col, label: col.nullable() }),
}

export function widgetConfigSchema(v: WidgetVisualization): z.ZodType {
  if (v === 'TABLE') return z.object({})
  return z.object({ mapping: widgetMappingSchemas[v] })
}

export const MAPPING_FIELD_LABELS = {
  x: 'Eixo X',
  series: 'Séries',
  category: 'Categoria',
  value: 'Valor',
  axis: 'Eixo',
  change: 'Variação',
  lat: 'Latitude',
  lon: 'Longitude',
  label: 'Rótulo',
  primary: 'Texto principal',
  secondary: 'Texto secundário',
  values: 'Valores',
} as const

export const MAPPING_OPTION_LABELS = {
  stacked: 'Empilhado',
  horizontal: 'Horizontal',
  donut: 'Donut',
} as const

export interface MapConfigDto {
  tileUrl: string
  attribution: string
}
