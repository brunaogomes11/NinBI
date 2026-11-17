import {
  type AssistantAction,
  type DashboardFilter,
  extractParameterNames,
  type FilterType,
  type QueryLanguage,
  type QueryResultDto,
  type WidgetDto,
  type WidgetVisualization,
} from '@ninbi/contracts'
import { resolveAiMapping } from '@/features/ai/resolve-mapping'
import {
  addFilter,
  type DashboardDraft,
  insertTab,
  insertWidget,
  removeFilter,
  removeTab,
  removeWidget,
  renameTab,
  setLayout,
  setName,
  updateFilter,
  updateWidget,
} from '@/features/dashboards/draft'
import {
  type MappingDraft,
  validateMapping,
} from '@/features/widgets/mapping/suggest'

type Resolved = Pick<WidgetDto, 'visualization' | 'config'>

const TABLE: Resolved = { visualization: 'TABLE', config: {} }

/** Visualização e mapeamento que o widget passa a ter: o da IA se serve, a sugestão se não, senão Tabela (GEN-06). */
function resolveWidget(
  visualization: WidgetVisualization,
  mapping: Record<string, unknown> | null,
  result: QueryResultDto | null,
): Resolved {
  if (visualization === 'TABLE') return TABLE
  if (result) return resolveAiMapping(visualization, mapping, result)
  const given = mapping as MappingDraft | null
  if (given && validateMapping(visualization, given) === null) {
    return { visualization, config: { mapping: given } }
  }
  return TABLE
}

function findWidget(draft: DashboardDraft, widgetId: string) {
  for (const tab of draft.tabs) {
    const widget = tab.widgets.find((candidate) => candidate.id === widgetId)
    if (widget) return { tabId: tab.id, widget }
  }
  return null
}

function defaultFor(type: FilterType): DashboardFilter['defaultValue'] {
  if (type === 'MULTI_SELECT') return []
  if (type === 'DATE_RANGE') return { start: null, end: null }
  return null
}

function applyOne(
  draft: DashboardDraft,
  action: AssistantAction,
  language: QueryLanguage,
): DashboardDraft {
  const hasTab = (tabId: string) => draft.tabs.some((tab) => tab.id === tabId)
  switch (action.type) {
    case 'create_tab':
      return hasTab(action.tabId)
        ? draft
        : insertTab(draft, { id: action.tabId, name: action.name })
    case 'rename_tab':
      return hasTab(action.tabId)
        ? renameTab(draft, action.tabId, action.name)
        : draft
    case 'remove_tab':
      // o dashboard precisa de ao menos uma aba (CHAT-24)
      return hasTab(action.tabId) && draft.tabs.length > 1
        ? removeTab(draft, action.tabId)
        : draft
    case 'create_widget': {
      if (!hasTab(action.tabId) || findWidget(draft, action.widgetId)) {
        return draft
      }
      const resolved = resolveWidget(
        action.error === null ? action.visualization : 'TABLE',
        action.mapping,
        action.result,
      )
      return insertWidget(draft, action.tabId, {
        id: action.widgetId,
        title: action.title,
        cypher: action.cypher,
        hasQuery: (action.cypher ?? '').trim() !== '',
        visualization: resolved.visualization,
        config: resolved.config,
        layout: action.layout,
        parameters: extractParameterNames(action.cypher ?? '', language),
      })
    }
    case 'update_widget': {
      const found = findWidget(draft, action.widgetId)
      if (!found) return draft // widget removido durante o pedido (CHAT-23)
      const { widget } = found
      const changes: Partial<
        Pick<
          WidgetDto,
          'title' | 'cypher' | 'visualization' | 'config' | 'parameters'
        >
      > = {}
      if (action.title !== undefined) changes.title = action.title
      if (action.cypher !== undefined) {
        changes.cypher = action.cypher
        changes.parameters = extractParameterNames(action.cypher, language)
      }
      const reshapes =
        action.visualization !== undefined ||
        action.mapping !== undefined ||
        action.cypher !== undefined
      if (reshapes) {
        // com erro de consulta a visualização pedida vale: a prévia mostra o erro
        const visualization =
          action.visualization ?? (widget.visualization as WidgetVisualization)
        const mapping =
          action.mapping !== undefined
            ? action.mapping
            : ((widget.config.mapping as Record<string, unknown> | undefined) ??
              null)
        const resolved = resolveWidget(visualization, mapping, action.result)
        const keepCross =
          action.cypher === undefined &&
          resolved.visualization !== 'KPI' &&
          widget.config.crossFilter !== undefined
        changes.visualization = resolved.visualization
        changes.config = keepCross
          ? { ...resolved.config, crossFilter: widget.config.crossFilter }
          : resolved.config
      }
      return updateWidget(draft, found.tabId, action.widgetId, changes)
    }
    case 'remove_widget': {
      const found = findWidget(draft, action.widgetId)
      return found ? removeWidget(draft, found.tabId, action.widgetId) : draft
    }
    case 'set_layout': {
      const found = findWidget(draft, action.widgetId)
      return found
        ? setLayout(draft, found.tabId, { [action.widgetId]: action.layout })
        : draft
    }
    case 'create_filter':
      return draft.filters.some((filter) => filter.id === action.filter.id)
        ? draft
        : addFilter(draft, action.filter)
    case 'update_filter': {
      const current = draft.filters.find(
        (filter) => filter.id === action.filter.id,
      )
      if (!current) return draft
      // a alteração é parcial: o servidor não conhece opções nem valor padrão (CHAT-06)
      const merged: DashboardFilter = { ...current, ...action.filter }
      if (
        merged.type !== current.type &&
        action.filter.defaultValue === undefined
      ) {
        merged.defaultValue = defaultFor(merged.type)
      }
      return updateFilter(draft, current.id, merged)
    }
    case 'remove_filter':
      return draft.filters.some((filter) => filter.id === action.filterId)
        ? removeFilter(draft, action.filterId)
        : draft
    case 'rename_dashboard':
      return setName(draft, action.name)
  }
}

/**
 * Aplica as ações da resposta, em ordem, de uma vez só (AD-121). O rascunho de entrada não é
 * mudado; ação sobre aba, widget ou filtro que já não existe é ignorada (CHAT-23).
 */
export function applyAssistantActions(
  draft: DashboardDraft,
  actions: AssistantAction[],
  language: QueryLanguage = 'CYPHER',
): DashboardDraft {
  return actions.reduce(
    (current, action) => applyOne(current, action, language),
    draft,
  )
}
