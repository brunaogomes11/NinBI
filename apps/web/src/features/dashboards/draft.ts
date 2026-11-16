import {
  type DashboardDto,
  type DashboardSaveInput,
  MESSAGES,
  type WidgetDto,
  type WidgetLayout,
} from '@ninbi/contracts'

/** O dashboard como a pessoa o está editando, antes de salvar. */
export interface DashboardDraft {
  version: number
  name: string
  connectionId: string
  tabs: DashboardDto['tabs']
}

const NEW_WIDGET_SIZE = { w: 4, h: 4 } as const

export function fromDto(dto: DashboardDto): DashboardDraft {
  return structuredClone({
    version: dto.version,
    name: dto.name,
    connectionId: dto.connectionId,
    tabs: dto.tabs,
  })
}

/** O corpo do `PUT /api/dashboards/:id`: o rascunho inteiro, com a versão que ele leu. */
export function toSavePayload(draft: DashboardDraft): DashboardSaveInput {
  return {
    version: draft.version,
    name: draft.name,
    connectionId: draft.connectionId,
    tabs: draft.tabs.map((tab) => ({
      id: tab.id,
      name: tab.name,
      widgets: tab.widgets.map((widget) => ({
        id: widget.id,
        title: widget.title,
        cypher: widget.cypher,
        visualization: widget.visualization as 'TABLE',
        config: widget.config,
        layout: widget.layout,
      })),
    })),
  }
}

/** Acrescenta a aba "Aba N", com N igual ao número de abas depois de adicionar. */
export function addTab(
  draft: DashboardDraft,
  id: string = crypto.randomUUID(),
): DashboardDraft {
  return {
    ...draft,
    tabs: [
      ...draft.tabs,
      { id, name: `Aba ${draft.tabs.length + 1}`, widgets: [] },
    ],
  }
}

export function renameTab(
  draft: DashboardDraft,
  tabId: string,
  name: string,
): DashboardDraft {
  return {
    ...draft,
    tabs: draft.tabs.map((tab) => (tab.id === tabId ? { ...tab, name } : tab)),
  }
}

export function removeTab(
  draft: DashboardDraft,
  tabId: string,
): DashboardDraft {
  return { ...draft, tabs: draft.tabs.filter((tab) => tab.id !== tabId) }
}

function mapTab(
  draft: DashboardDraft,
  tabId: string,
  change: (widgets: WidgetDto[]) => WidgetDto[],
): DashboardDraft {
  return {
    ...draft,
    tabs: draft.tabs.map((tab) =>
      tab.id === tabId ? { ...tab, widgets: change(tab.widgets) } : tab,
    ),
  }
}

/** Widget 4 por 4, "Novo widget", abaixo do último da aba. */
export function addWidget(
  draft: DashboardDraft,
  tabId: string,
  id: string = crypto.randomUUID(),
): DashboardDraft {
  return mapTab(draft, tabId, (widgets) => {
    const y = widgets.reduce(
      (bottom, widget) => Math.max(bottom, widget.layout.y + widget.layout.h),
      0,
    )
    return [
      ...widgets,
      {
        id,
        title: MESSAGES.newWidget,
        cypher: null,
        hasQuery: false,
        visualization: 'TABLE',
        config: {},
        layout: { x: 0, y, ...NEW_WIDGET_SIZE },
      },
    ]
  })
}

export function updateWidget(
  draft: DashboardDraft,
  tabId: string,
  widgetId: string,
  changes: Partial<Pick<WidgetDto, 'title' | 'cypher'>>,
): DashboardDraft {
  return mapTab(draft, tabId, (widgets) =>
    widgets.map((widget) =>
      widget.id === widgetId
        ? {
            ...widget,
            ...changes,
            hasQuery:
              changes.cypher === undefined
                ? widget.hasQuery
                : (changes.cypher ?? '').trim() !== '',
          }
        : widget,
    ),
  )
}

export function removeWidget(
  draft: DashboardDraft,
  tabId: string,
  widgetId: string,
): DashboardDraft {
  return mapTab(draft, tabId, (widgets) =>
    widgets.filter((widget) => widget.id !== widgetId),
  )
}

/** Grava posição e tamanho dos widgets de uma aba, pelo id; sem mudança devolve o mesmo rascunho. */
export function setLayout(
  draft: DashboardDraft,
  tabId: string,
  layouts: Record<string, WidgetLayout>,
): DashboardDraft {
  const same = (a: WidgetLayout, b: WidgetLayout) =>
    a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
  const tab = draft.tabs.find((candidate) => candidate.id === tabId)
  if (
    !tab ||
    tab.widgets.every((widget) => {
      const layout = layouts[widget.id]
      return !layout || same(layout, widget.layout)
    })
  ) {
    return draft
  }
  return mapTab(draft, tabId, (widgets) =>
    widgets.map((widget) => {
      const layout = layouts[widget.id]
      return layout ? { ...widget, layout } : widget
    }),
  )
}

export function setName(draft: DashboardDraft, name: string): DashboardDraft {
  return { ...draft, name }
}

export function setConnection(
  draft: DashboardDraft,
  connectionId: string,
): DashboardDraft {
  return { ...draft, connectionId }
}

/** Há diferença entre o rascunho e o que está salvo? */
export function isDirty(draft: DashboardDraft, saved: DashboardDto): boolean {
  return JSON.stringify(draft) !== JSON.stringify(fromDto(saved))
}
