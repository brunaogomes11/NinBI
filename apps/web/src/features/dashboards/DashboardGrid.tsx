import {
  GRID_COLUMNS,
  MESSAGES,
  type WidgetDto,
  type WidgetLayout,
} from '@ninbi/contracts'
import { Plus } from 'lucide-react'
import ReactGridLayout, {
  type LayoutItem,
  verticalCompactor,
} from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { Button } from '@/components/ui/button'
import type { AiGenerationState } from '@/features/ai/useAiGenerations'
import type { WidgetEditSource } from '@/features/widgets/useWidgetResult'
import { DRAG_HANDLE_CLASS, WidgetCard } from '@/features/widgets/WidgetCard'
import { useContainerWidth } from './useContainerWidth'

const ROW_HEIGHT = 80
const MARGIN = [16, 16] as const

function toLayoutItem(widget: WidgetDto): LayoutItem {
  return {
    i: widget.id,
    ...widget.layout,
    minW: 2,
    minH: 2,
    maxW: GRID_COLUMNS,
  }
}

/** Ações de edição da grade: presentes só em modo de edição. */
export interface GridEdit extends WidgetEditSource {
  onLayoutChange: (layouts: Record<string, WidgetLayout>) => void
  onAddWidget: () => void
  onEditWidget: (widgetId: string) => void
  onRemoveWidget: (widgetId: string) => void
  /** Presente só para quem pode usar a IA (`ai.use`). */
  ai?: GridAi
}

/** A IA dos widgets da grade: um estado e um pedido por widget. */
export interface GridAi {
  available: boolean
  busy?: boolean
  stateOf: (widgetId: string) => AiGenerationState
  start: (widgetId: string, prompt: string) => void
  cancel: (widgetId: string) => void
}

/** Os widgets de uma aba numa grade de 12 colunas; arrastar e redimensionar só em edição (GRID-04). */
export function DashboardGrid({
  dashboardId,
  version,
  widgets,
  edit,
}: {
  dashboardId: string
  version: number
  widgets: WidgetDto[]
  /** Presente só em edição: os widgets executam o Cypher e a conexão do rascunho. */
  edit?: GridEdit
}) {
  const { ref, width } = useContainerWidth()
  const compact = !edit && width > 0 && width < 560
  const layout = widgets.map(toLayoutItem)
  if (compact) {
    let nextRow = 0
    for (const item of layout.sort((a, b) => a.y - b.y || a.x - b.x)) {
      item.x = 0
      item.y = nextRow
      item.w = GRID_COLUMNS
      nextRow += item.h
    }
  }

  return (
    <div ref={ref} className="flex w-full flex-col gap-3">
      {edit && (
        <div>
          <Button type="button" variant="outline" onClick={edit.onAddWidget}>
            <Plus aria-hidden="true" />
            {MESSAGES.newWidget}
          </Button>
        </div>
      )}
      {widgets.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground text-sm">
          {MESSAGES.tabEmpty}
        </p>
      ) : (
        <ReactGridLayout
          className="dashboard-widget-grid"
          width={width}
          layout={layout}
          gridConfig={{
            cols: GRID_COLUMNS,
            rowHeight: ROW_HEIGHT,
            margin: MARGIN,
            containerPadding: [0, 0],
            maxRows: Number.POSITIVE_INFINITY,
          }}
          dragConfig={{
            enabled: Boolean(edit),
            bounded: false,
            threshold: 3,
            handle: `.${DRAG_HANDLE_CLASS}`,
          }}
          resizeConfig={{ enabled: Boolean(edit), handles: edit ? ['se'] : [] }}
          compactor={verticalCompactor}
          onLayoutChange={(layout) =>
            edit?.onLayoutChange(
              Object.fromEntries(
                layout.map(({ i, x, y, w, h }) => [i, { x, y, w, h }]),
              ),
            )
          }
        >
          {widgets.map((widget) => (
            <div key={widget.id}>
              <WidgetCard
                dashboardId={dashboardId}
                version={version}
                widget={widget}
                edit={
                  edit && {
                    connectionId: edit.connectionId,
                    language: edit.language,
                    onEdit: () => edit.onEditWidget(widget.id),
                    onRemove: () => edit.onRemoveWidget(widget.id),
                    ai: edit.ai && {
                      available: edit.ai.available,
                      busy: edit.ai.busy,
                      state: edit.ai.stateOf(widget.id),
                      onStart: (prompt) => edit.ai?.start(widget.id, prompt),
                      onCancel: () => edit.ai?.cancel(widget.id),
                    },
                  }
                }
              />
            </div>
          ))}
        </ReactGridLayout>
      )}
    </div>
  )
}
