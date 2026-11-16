import { z } from 'zod'
import {
  CROSS_FILTER_TYPES,
  type DashboardFilter,
  dashboardFiltersSchema,
  queryParamsSchema,
  REFRESH_INTERVALS,
} from './filters'
import { MESSAGES } from './messages'
import { WIDGET_VISUALIZATIONS, widgetConfigSchema } from './widget-config'

export const GRID_COLUMNS = 12
export const MAX_CYPHER_LENGTH = 20_000

export interface WidgetLayout {
  x: number
  y: number
  w: number
  h: number
}

export interface WidgetDto {
  id: string
  title: string
  cypher: string | null
  hasQuery: boolean
  visualization: string
  config: Record<string, unknown>
  layout: WidgetLayout
  /** Nomes de `$parametros` do Cypher; calculado no servidor para todo usuário. */
  parameters: string[]
}

export interface DashboardTabDto {
  id: string
  name: string
  widgets: WidgetDto[]
}

export interface DashboardDto {
  id: string
  name: string
  version: number
  updatedAt: string
  ownerId: string
  ownerName: string
  connectionId: string
  connectionName: string
  permissions: { edit: boolean; delete: boolean; share: boolean }
  tabs: DashboardTabDto[]
  filters: DashboardFilter[]
  refreshIntervalSec: number
}

export interface DashboardSummaryDto {
  id: string
  name: string
  ownerName: string
  connectionName: string
  updatedAt: string
}

export interface SidebarDashboardNode {
  type: 'dashboard'
  id: string
  name: string
}

export interface SidebarGroupNode {
  type: 'group'
  id: string
  name: string
  items: SidebarDashboardNode[]
}

export interface SidebarDto {
  items: (SidebarDashboardNode | SidebarGroupNode)[]
  /** "Compartilhados comigo": compartilhados que o usuário ainda não organizou (AD-051). */
  shared: SidebarDashboardNode[]
}

export type ResultValue =
  | null
  | boolean
  | number
  | string
  | { kind: 'bigint'; value: string }
  | { kind: 'json'; value: string }

export interface QueryResultDto {
  columns: string[]
  rows: ResultValue[][]
  truncated: boolean
  rowLimit: number
}

const dashboardName = z
  .string()
  .trim()
  .min(1, MESSAGES.dashboardNameRequired)
  .max(80, MESSAGES.dashboardNameTooLong)

const shortName = z
  .string()
  .trim()
  .min(1, MESSAGES.nameRequired)
  .max(40, MESSAGES.shortNameTooLong)

const widgetTitle = z
  .string()
  .trim()
  .min(1, MESSAGES.widgetTitleRequired)
  .max(80, MESSAGES.widgetTitleTooLong)

const connectionId = z.uuid(MESSAGES.connectionRequired)

export const widgetLayoutSchema = z
  .object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    w: z.number().int().min(2).max(GRID_COLUMNS),
    h: z.number().int().min(2),
  })
  .refine((layout) => layout.x + layout.w <= GRID_COLUMNS, {
    message: MESSAGES.validationError,
    path: ['w'],
  })

export const dashboardCreateSchema = z.object({
  name: dashboardName,
  connectionId,
})

const widgetSchema = z
  .object({
    id: z.uuid(),
    title: widgetTitle,
    cypher: z
      .string()
      .max(MAX_CYPHER_LENGTH, MESSAGES.cypherTooLong)
      .nullable(),
    visualization: z.enum(WIDGET_VISUALIZATIONS),
    config: z.record(z.string(), z.unknown()),
    layout: widgetLayoutSchema,
  })
  .superRefine((widget, ctx) => {
    const parsed = widgetConfigSchema(widget.visualization).safeParse(
      widget.config,
    )
    if (!parsed.success) {
      ctx.addIssue({
        code: 'custom',
        message: MESSAGES.invalidWidgetConfig,
        path: ['config'],
      })
    }
  })

const tabSchema = z.object({
  id: z.uuid(),
  name: shortName,
  widgets: z.array(widgetSchema),
})

const refreshIntervalSchema = z.union(
  REFRESH_INTERVALS.map((s) => z.literal(s)) as unknown as [
    z.ZodLiteral<number>,
    z.ZodLiteral<number>,
    ...z.ZodLiteral<number>[],
  ],
)

export const dashboardSaveSchema = z
  .object({
    version: z.number().int().min(1),
    name: dashboardName,
    connectionId,
    tabs: z.array(tabSchema).min(1),
    filters: dashboardFiltersSchema.default([]),
    refreshIntervalSec: refreshIntervalSchema.default(0),
  })
  .superRefine((dashboard, ctx) => {
    const byId = new Map(dashboard.filters.map((f) => [f.id, f]))
    dashboard.tabs.forEach((tab, ti) => {
      tab.widgets.forEach((widget, wi) => {
        const cross = widget.config.crossFilter
        if (cross === undefined) return
        const filterId =
          typeof cross === 'object' && cross !== null
            ? (cross as { filterId?: unknown }).filterId
            : undefined
        const filter =
          typeof filterId === 'string' ? byId.get(filterId) : undefined
        const valid =
          widget.visualization !== 'KPI' &&
          filter !== undefined &&
          CROSS_FILTER_TYPES.includes(filter.type)
        if (!valid) {
          ctx.addIssue({
            code: 'custom',
            message: MESSAGES.crossFilterInvalid,
            path: ['tabs', ti, 'widgets', wi, 'config', 'crossFilter'],
          })
        }
      })
    })
  })

const sidebarDashboardSchema = z.object({
  type: z.literal('dashboard'),
  id: z.uuid(),
})

const sidebarGroupSchema = z.object({
  type: z.literal('group'),
  id: z.uuid(),
  name: shortName,
  items: z.array(sidebarDashboardSchema),
})

export const sidebarLayoutSchema = z
  .object({
    items: z.array(z.union([sidebarDashboardSchema, sidebarGroupSchema])),
  })
  .superRefine((layout, ctx) => {
    const seen = new Set<string>()
    const check = (id: string, path: (string | number)[]) => {
      if (seen.has(id)) {
        ctx.addIssue({
          code: 'custom',
          message: MESSAGES.validationError,
          path,
        })
      }
      seen.add(id)
    }
    layout.items.forEach((item, i) => {
      check(item.id, ['items', i, 'id'])
      if (item.type === 'group') {
        item.items.forEach((child, j) => {
          check(child.id, ['items', i, 'items', j, 'id'])
        })
      }
    })
  })

export const queryRunSchema = z.object({
  cypher: z
    .string()
    .min(1, MESSAGES.validationError)
    .max(MAX_CYPHER_LENGTH, MESSAGES.cypherTooLong),
  connectionId: z.uuid().optional(),
  params: queryParamsSchema.optional(),
})

export const widgetRunSchema = z.object({
  params: queryParamsSchema.optional(),
})

export type DashboardCreateInput = z.input<typeof dashboardCreateSchema>
export type DashboardSaveInput = z.input<typeof dashboardSaveSchema>
export type SidebarLayoutInput = z.input<typeof sidebarLayoutSchema>
export type QueryRunInput = z.input<typeof queryRunSchema>
export type WidgetRunInput = z.input<typeof widgetRunSchema>
