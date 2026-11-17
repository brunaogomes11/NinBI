import {
  ASSISTANT_MAX_NEW_WIDGETS,
  type AssistantAction,
  type AssistantDraft,
  type DashboardFilter,
  dashboardFilterSchema,
  dashboardFiltersSchema,
  FILTER_TYPES,
  type FilterType,
  MESSAGES,
  WIDGET_VISUALIZATIONS,
  type WidgetLayoutDto,
  type WidgetVisualization,
} from '@ninbi/contracts'
import { z } from 'zod'
import { validateReadOnlyCypher } from '../queries/read-only-cypher'
import type { DraftRefs, RefKind } from './assistant-prompt'
import { placeWidget } from './widget-placement'

const TITLE_MAX = 80
const TAB_NAME_MAX = 40
const DASHBOARD_NAME_MAX = 80

type GeneratedType = 'create_widget' | 'update_widget'

/** Ação do plano já resolvida; as que geram Cypher levam o `prompt` e ainda não têm `result` nem `error`. */
export type PendingAction =
  | Exclude<AssistantAction, { type: GeneratedType }>
  | {
      type: 'create_widget'
      tabId: string
      widgetId: string
      title: string
      layout: WidgetLayoutDto
      prompt: string
    }
  | {
      type: 'update_widget'
      widgetId: string
      title?: string
      visualization?: WidgetVisualization
      mapping?: Record<string, unknown> | null
      /** Com `prompt` o Cypher é gerado de novo; sem ele, o service roda o Cypher atual. */
      prompt?: string
      currentCypher: string | null
    }

export interface ResolvedPlan {
  actions: PendingAction[]
  changes: string[]
  notApplied: string[]
  discardedWidgets: number
}

const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.slice(0, max))
const ref = z.string().trim().min(1)
const num = z.number().finite()
const filterType = z.enum(FILTER_TYPES)

const optionalFilterFields = {
  label: text(40).optional(),
  parameter: z.string().optional(),
  filterType: filterType.optional(),
  options: z.unknown().optional(),
  defaultValue: z.unknown().optional(),
}

const ACTION_SCHEMAS = {
  create_tab: z.object({ ref: ref.optional(), name: text(TAB_NAME_MAX) }),
  rename_tab: z.object({ tab: ref, name: text(TAB_NAME_MAX) }),
  remove_tab: z.object({ tab: ref }),
  create_widget: z.object({
    tab: ref.optional(),
    title: text(TITLE_MAX),
    prompt: z.string().trim().min(1),
    layout: z
      .object({
        x: num.optional(),
        y: num.optional(),
        w: num.optional(),
        h: num.optional(),
      })
      .optional(),
  }),
  update_widget: z
    .object({
      widget: ref,
      title: text(TITLE_MAX).optional(),
      visualization: z.string().optional(),
      mapping: z.record(z.string(), z.unknown()).nullable().optional(),
      prompt: z.string().trim().min(1).optional(),
    })
    .refine(
      (a) =>
        a.title !== undefined ||
        a.visualization !== undefined ||
        a.mapping !== undefined ||
        a.prompt !== undefined,
    ),
  remove_widget: z.object({ widget: ref }),
  move_widget: z.object({ widget: ref, x: num, y: num }),
  resize_widget: z.object({ widget: ref, w: num, h: num }),
  create_filter: z.object({
    label: text(40),
    parameter: z.string(),
    filterType,
    options: z.unknown().optional(),
    defaultValue: z.unknown().optional(),
  }),
  update_filter: z.object({ filter: ref, ...optionalFilterFields }),
  remove_filter: z.object({ filter: ref }),
  rename_dashboard: z.object({ name: text(DASHBOARD_NAME_MAX) }),
} as const

type ActionType = keyof typeof ACTION_SCHEMAS

interface SimWidget {
  id: string
  title: string
  cypher: string | null
  layout: WidgetLayoutDto
}
interface SimTab {
  id: string
  name: string
  widgets: SimWidget[]
}
interface SimFilter {
  id: string
  label: string
  parameter: string
  type: FilterType
  options: DashboardFilter['options']
  defaultValue: DashboardFilter['defaultValue']
}

function defaultFor(type: FilterType): DashboardFilter['defaultValue'] {
  if (type === 'MULTI_SELECT') return []
  if (type === 'DATE_RANGE') return { start: null, end: null }
  return null
}

/** O rascunho enviado não traz opções (CHAT-06): na validação, um filtro de seleção sem opções conhecidas usa uma de enfeite. */
function forValidation(filter: SimFilter): SimFilter {
  const selection =
    filter.type === 'SINGLE_SELECT' || filter.type === 'MULTI_SELECT'
  if (selection && filter.options === null) {
    return { ...filter, options: { source: 'STATIC', values: ['-'] } }
  }
  return filter
}

function actionType(raw: unknown): string {
  const type =
    raw && typeof raw === 'object' ? (raw as { type?: unknown }).type : null
  return typeof type === 'string' && type !== '' ? type : 'desconhecida'
}

/** Aplica o plano do LLM, em ordem, a uma cópia do rascunho: só a lista fechada de ações, só alvos que existem (CHAT-07, CHAT-23, CHAT-24). */
export function resolveActions(
  draft: AssistantDraft,
  refs: DraftRefs,
  rawActions: unknown[],
  newId: () => string,
): ResolvedPlan {
  const tabs: SimTab[] = draft.tabs.map((tab) => ({
    id: tab.id,
    name: tab.name,
    widgets: tab.widgets.map((widget) => ({
      id: widget.id,
      title: widget.title,
      cypher: widget.cypher,
      layout: { ...widget.layout },
    })),
  }))
  const filters: SimFilter[] = draft.filters.map((filter) => ({
    ...filter,
    options: null,
    defaultValue: defaultFor(filter.type),
  }))
  const planTabs = new Map<string, string>()
  const plan: ResolvedPlan = {
    actions: [],
    changes: [],
    notApplied: [],
    discardedWidgets: 0,
  }
  let newWidgets = 0

  const findTab = (name: string) => {
    const id = planTabs.get(name) ?? findDraftId(name, 'tab')
    return tabs.find((tab) => tab.id === id)
  }
  const findDraftId = (name: string, kind: RefKind) => {
    const entry = refs[name]
    return entry?.kind === kind ? entry.id : undefined
  }
  const findWidget = (name: string) => {
    const id = findDraftId(name, 'widget')
    for (const tab of tabs) {
      const widget = tab.widgets.find((item) => item.id === id)
      if (widget) return { tab, widget }
    }
    return undefined
  }
  const findFilter = (name: string) => {
    const id = findDraftId(name, 'filter')
    return filters.find((item) => item.id === id)
  }

  const accept = (action: PendingAction, change: string) => {
    plan.actions.push(action)
    plan.changes.push(change)
  }
  const missing = (name: string) =>
    plan.notApplied.push(MESSAGES.assistantMissingTarget(name))

  const others = (tab: SimTab, widgetId: string) =>
    tab.widgets.filter((item) => item.id !== widgetId).map((i) => i.layout)

  for (const raw of rawActions) {
    const type = actionType(raw)
    if (!Object.hasOwn(ACTION_SCHEMAS, type)) {
      plan.notApplied.push(MESSAGES.assistantUnknownAction(type))
      continue
    }
    const parsed = ACTION_SCHEMAS[type as ActionType].safeParse(raw)
    if (!parsed.success) {
      plan.notApplied.push(MESSAGES.assistantInvalidAction(type))
      continue
    }
    const invalid = () =>
      plan.notApplied.push(MESSAGES.assistantInvalidAction(type))

    switch (type as ActionType) {
      case 'create_tab': {
        const a = parsed.data as z.infer<typeof ACTION_SCHEMAS.create_tab>
        const tab: SimTab = { id: newId(), name: a.name, widgets: [] }
        tabs.push(tab)
        if (a.ref) planTabs.set(a.ref, tab.id)
        accept(
          { type: 'create_tab', tabId: tab.id, name: tab.name },
          MESSAGES.assistantTabCreated(tab.name),
        )
        break
      }
      case 'rename_tab': {
        const a = parsed.data as z.infer<typeof ACTION_SCHEMAS.rename_tab>
        const tab = findTab(a.tab)
        if (!tab) {
          missing(a.tab)
          break
        }
        const before = tab.name
        tab.name = a.name
        accept(
          { type: 'rename_tab', tabId: tab.id, name: a.name },
          MESSAGES.assistantTabRenamed(before, a.name),
        )
        break
      }
      case 'remove_tab': {
        const a = parsed.data as z.infer<typeof ACTION_SCHEMAS.remove_tab>
        const tab = findTab(a.tab)
        if (!tab) {
          missing(a.tab)
          break
        }
        if (tabs.length === 1) {
          plan.notApplied.push(MESSAGES.assistantLastTab)
          break
        }
        tabs.splice(tabs.indexOf(tab), 1)
        accept(
          { type: 'remove_tab', tabId: tab.id },
          MESSAGES.assistantTabRemoved(tab.name),
        )
        break
      }
      case 'create_widget': {
        const a = parsed.data as z.infer<typeof ACTION_SCHEMAS.create_widget>
        const tab = a.tab === undefined ? tabs[0] : findTab(a.tab)
        if (!tab) {
          missing(a.tab ?? 't1')
          break
        }
        if (newWidgets >= ASSISTANT_MAX_NEW_WIDGETS) {
          plan.discardedWidgets += 1
          break
        }
        newWidgets += 1
        const layout = placeWidget(
          tab.widgets.map((item) => item.layout),
          a.layout ?? {},
        )
        const widget: SimWidget = {
          id: newId(),
          title: a.title,
          cypher: null,
          layout,
        }
        tab.widgets.push(widget)
        accept(
          {
            type: 'create_widget',
            tabId: tab.id,
            widgetId: widget.id,
            title: a.title,
            layout,
            prompt: a.prompt,
          },
          MESSAGES.assistantWidgetCreated(a.title),
        )
        break
      }
      case 'update_widget': {
        const a = parsed.data as z.infer<typeof ACTION_SCHEMAS.update_widget>
        const found = findWidget(a.widget)
        if (!found) {
          missing(a.widget)
          break
        }
        const { widget } = found
        const visualization =
          a.visualization === undefined
            ? undefined
            : (WIDGET_VISUALIZATIONS.find(
                (code) => code === a.visualization?.trim().toUpperCase(),
              ) ?? 'TABLE')
        if (a.title !== undefined) widget.title = a.title
        accept(
          {
            type: 'update_widget',
            widgetId: widget.id,
            ...(a.title === undefined ? {} : { title: a.title }),
            ...(visualization === undefined ? {} : { visualization }),
            ...(a.mapping === undefined ? {} : { mapping: a.mapping }),
            ...(a.prompt === undefined ? {} : { prompt: a.prompt }),
            currentCypher: widget.cypher,
          },
          MESSAGES.assistantWidgetUpdated(widget.title),
        )
        break
      }
      case 'remove_widget': {
        const a = parsed.data as z.infer<typeof ACTION_SCHEMAS.remove_widget>
        const found = findWidget(a.widget)
        if (!found) {
          missing(a.widget)
          break
        }
        found.tab.widgets = found.tab.widgets.filter(
          (item) => item.id !== found.widget.id,
        )
        accept(
          { type: 'remove_widget', widgetId: found.widget.id },
          MESSAGES.assistantWidgetRemoved(found.widget.title),
        )
        break
      }
      case 'move_widget':
      case 'resize_widget': {
        const a = parsed.data as {
          widget: string
          x?: number
          y?: number
          w?: number
          h?: number
        }
        const found = findWidget(a.widget)
        if (!found) {
          missing(a.widget)
          break
        }
        const { tab, widget } = found
        const layout = placeWidget(others(tab, widget.id), {
          ...widget.layout,
          ...(a.x === undefined ? {} : { x: a.x }),
          ...(a.y === undefined ? {} : { y: a.y }),
          ...(a.w === undefined ? {} : { w: a.w }),
          ...(a.h === undefined ? {} : { h: a.h }),
        })
        widget.layout = layout
        accept(
          { type: 'set_layout', widgetId: widget.id, layout },
          MESSAGES.assistantWidgetMoved(widget.title),
        )
        break
      }
      case 'create_filter': {
        const a = parsed.data as z.infer<typeof ACTION_SCHEMAS.create_filter>
        const candidate = {
          id: newId(),
          label: a.label,
          parameter: a.parameter,
          type: a.filterType,
          options: a.options ?? null,
          defaultValue: a.defaultValue ?? defaultFor(a.filterType),
        }
        const checked = dashboardFilterSchema.safeParse(candidate)
        if (
          !checked.success ||
          !optionsAreReadOnly(checked.data) ||
          !dashboardFiltersSchema.safeParse([
            ...filters.map(forValidation),
            checked.data,
          ]).success
        ) {
          invalid()
          break
        }
        filters.push(checked.data)
        accept(
          { type: 'create_filter', filter: checked.data },
          MESSAGES.assistantFilterCreated(checked.data.label),
        )
        break
      }
      case 'update_filter': {
        const a = parsed.data as z.infer<typeof ACTION_SCHEMAS.update_filter>
        const current = findFilter(a.filter)
        if (!current) {
          missing(a.filter)
          break
        }
        const type = a.filterType ?? current.type
        const merged: SimFilter = {
          id: current.id,
          label: a.label ?? current.label,
          parameter: a.parameter ?? current.parameter,
          type,
          options:
            a.options === undefined
              ? current.options
              : (a.options as SimFilter['options']),
          defaultValue:
            a.defaultValue !== undefined
              ? (a.defaultValue as SimFilter['defaultValue'])
              : type === current.type
                ? current.defaultValue
                : defaultFor(type),
        }
        const checked = dashboardFilterSchema.safeParse(forValidation(merged))
        const rest = filters.filter((item) => item.id !== current.id)
        if (
          !checked.success ||
          !optionsAreReadOnly(checked.data) ||
          !dashboardFiltersSchema.safeParse([
            ...rest.map(forValidation),
            checked.data,
          ]).success
        ) {
          invalid()
          break
        }
        const typeChanged = merged.type !== current.type
        Object.assign(current, merged)
        const patch: Partial<Omit<DashboardFilter, 'id'>> = {}
        if (a.label !== undefined) patch.label = merged.label
        if (a.parameter !== undefined) patch.parameter = merged.parameter
        if (a.filterType !== undefined) patch.type = merged.type
        if (a.options !== undefined) patch.options = merged.options
        // o padrão salvo só muda se a ação o trouxe ou se o tipo mudou (o servidor não o conhece)
        if (a.defaultValue !== undefined || typeChanged) {
          patch.defaultValue = merged.defaultValue
        }
        accept(
          { type: 'update_filter', filter: { id: current.id, ...patch } },
          MESSAGES.assistantFilterUpdated(merged.label),
        )
        break
      }
      case 'remove_filter': {
        const a = parsed.data as z.infer<typeof ACTION_SCHEMAS.remove_filter>
        const current = findFilter(a.filter)
        if (!current) {
          missing(a.filter)
          break
        }
        filters.splice(filters.indexOf(current), 1)
        accept(
          { type: 'remove_filter', filterId: current.id },
          MESSAGES.assistantFilterRemoved(current.label),
        )
        break
      }
      case 'rename_dashboard': {
        const a = parsed.data as z.infer<typeof ACTION_SCHEMAS.rename_dashboard>
        accept(
          { type: 'rename_dashboard', name: a.name },
          MESSAGES.assistantDashboardRenamed(a.name),
        )
        break
      }
    }
  }
  return plan
}

/** A consulta das opções `QUERY` passa pela mesma validação somente leitura dos widgets; não é executada aqui. */
function optionsAreReadOnly(filter: DashboardFilter): boolean {
  const options = filter.options
  if (options?.source !== 'QUERY' || options.cypher === null) return true
  return validateReadOnlyCypher(options.cypher).ok
}
