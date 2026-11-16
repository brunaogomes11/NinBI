import { GRID_COLUMNS, MESSAGES, type WidgetDto } from '@ninbi/contracts'
import ReactGridLayout, {
  type LayoutItem,
  verticalCompactor,
} from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import type { WidgetEditSource } from '@/features/widgets/useWidgetResult'
import { WidgetCard } from '@/features/widgets/WidgetCard'
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

/** Os widgets de uma aba numa grade de 12 colunas; em visualização não há arraste nem redimensionamento. */
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
  edit?: WidgetEditSource
}) {
  const { ref, width } = useContainerWidth()

  return (
    <div ref={ref} className="w-full">
      {widgets.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground text-sm">
          {MESSAGES.tabEmpty}
        </p>
      ) : (
        <ReactGridLayout
          width={width}
          layout={widgets.map(toLayoutItem)}
          gridConfig={{
            cols: GRID_COLUMNS,
            rowHeight: ROW_HEIGHT,
            margin: MARGIN,
            containerPadding: [0, 0],
            maxRows: Number.POSITIVE_INFINITY,
          }}
          dragConfig={{ enabled: false, bounded: false, threshold: 3 }}
          resizeConfig={{ enabled: false, handles: [] }}
          compactor={verticalCompactor}
        >
          {widgets.map((widget) => (
            <div key={widget.id}>
              <WidgetCard
                dashboardId={dashboardId}
                version={version}
                widget={widget}
                edit={edit}
              />
            </div>
          ))}
        </ReactGridLayout>
      )}
    </div>
  )
}
