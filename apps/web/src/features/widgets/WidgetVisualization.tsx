import {
  type CrossFilterConfig,
  MESSAGES,
  type QueryResultDto,
  type WidgetVisualization as Visualization,
  type WidgetMapping,
} from '@ninbi/contracts'
import { type ReactNode, useMemo } from 'react'
import { clickValue, selectedRows } from '@/features/filters/cross-filter'
import { useOptionalFilterSession } from '@/features/filters/filter-session'
import { CartesianChartView } from './charts/CartesianChartView'
import { PieChartView } from './charts/PieChartView'
import { RadarChartView, RadialChartView } from './charts/PolarChartViews'
import { KpiView } from './KpiView'
import { ListView } from './ListView'
import { MapView } from './map/MapView'
import {
  type Built,
  buildCartesian,
  buildCategories,
  buildRadar,
  categoryRows,
} from './mapping/chart-data'
import {
  buildKpi,
  buildList,
  buildMapPoints,
  mapPointRows,
} from './mapping/simple-data'
import { validateMapping } from './mapping/suggest'
import { ResultTable } from './ResultTable'
import type { RowInteraction } from './row-interaction'

export interface WidgetVisualizationProps {
  result: QueryResultDto
  visualization: string
  config: Record<string, unknown>
  /** O widget que clica: o "Ao clicar" só vale com `interactive` (visualização, não edição). */
  widgetId?: string
  interactive?: boolean
}

const NO_ROWS: number[] = []

interface ClickBase {
  selected: Set<number>
  onRowClick: (rowIndex: number) => void
}

/** Clique e destaque do widget com "Ao clicar" (XFL-02 a XFL-08); `null` quando não há o que clicar. */
function useClickBase(
  result: QueryResultDto,
  crossFilter: CrossFilterConfig | undefined,
  widgetId: string | undefined,
  interactive: boolean | undefined,
): ClickBase | null {
  const session = useOptionalFilterSession()
  const filters = session?.filters
  const selection = session?.selection ?? null
  const toggleClick = session?.toggleClick
  return useMemo(() => {
    if (!interactive || !crossFilter || !widgetId || !filters || !toggleClick) {
      return null
    }
    const filter = filters.find((f) => f.id === crossFilter.filterId)
    if (!filter) return null
    const selected =
      selection?.widgetId === widgetId && selection.filterId === filter.id
        ? selectedRows(result, crossFilter.column, filter.type, selection.value)
        : new Set<number>()
    return {
      selected,
      onRowClick: (rowIndex) => {
        const value = clickValue(
          result,
          crossFilter.column,
          rowIndex,
          filter.type,
        )
        if (value !== undefined) toggleClick(widgetId, filter.id, value)
      },
    }
  }, [
    result,
    crossFilter,
    widgetId,
    interactive,
    filters,
    selection,
    toggleClick,
  ])
}

function withRows(
  base: ClickBase | null,
  rows: number[],
): RowInteraction | undefined {
  return base ? { ...base, rows } : undefined
}

function Message({
  children,
  error,
}: {
  children: ReactNode
  error?: boolean
}) {
  return error ? (
    <p role="alert" className="text-sm text-destructive">
      {children}
    </p>
  ) : (
    <p className="text-sm text-muted-foreground">{children}</p>
  )
}

/** Dá ao gráfico uma área de altura definida dentro do corpo do card. */
function Fill({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-0 flex-1">
      <div className="absolute inset-0 flex flex-col">{children}</div>
    </div>
  )
}

function Drawn<T>({
  built,
  children,
}: {
  built: Built<T>
  children: (data: T, notice?: string) => ReactNode
}) {
  if (!built.ok) {
    return built.reason === 'empty' ? (
      <Message>{MESSAGES.queryNoData}</Message>
    ) : (
      <Message error>{built.message}</Message>
    )
  }
  return <Fill>{children(built.data, built.notice)}</Fill>
}

/** Os pontos só mudam com o resultado ou o mapeamento; assim o mapa não reenquadra a cada render (MAP-05). */
function MapBody({
  result,
  mapping,
  base,
}: {
  result: QueryResultDto
  mapping: WidgetMapping['MAP']
  base: ClickBase | null
}) {
  const built = useMemo(
    () => buildMapPoints(result, mapping),
    [result, mapping],
  )
  const interaction = useMemo(
    () => withRows(base, mapPointRows(result, mapping)),
    [base, result, mapping],
  )
  return (
    <Drawn built={built}>
      {(points, notice) => (
        <MapView points={points} notice={notice} interaction={interaction} />
      )}
    </Drawn>
  )
}

/** Mostra o resultado na visualização do widget; sem mapeamento completo, cai na tabela (VIZ-12, VIZ-13, VIZ-18). */
export function WidgetVisualization({
  result,
  visualization,
  config,
  widgetId,
  interactive,
}: WidgetVisualizationProps) {
  const crossFilter = config.crossFilter as CrossFilterConfig | undefined
  const base = useClickBase(result, crossFilter, widgetId, interactive)
  const v = visualization as Visualization
  const mapping = config.mapping as Record<string, unknown> | undefined
  if (
    v === 'TABLE' ||
    !mapping ||
    validateMapping(v, mapping as Parameters<typeof validateMapping>[1])
  ) {
    return result.rows.length === 0 ? (
      <Message>{MESSAGES.queryNoData}</Message>
    ) : (
      <ResultTable result={result} interaction={withRows(base, NO_ROWS)} />
    )
  }

  switch (v) {
    case 'AREA':
    case 'BAR':
    case 'LINE': {
      const m = mapping as WidgetMapping['BAR']
      return (
        <Drawn built={buildCartesian(result, m)}>
          {(data) => (
            <CartesianChartView
              visualization={v}
              data={data}
              mapping={m}
              interaction={withRows(base, NO_ROWS)}
            />
          )}
        </Drawn>
      )
    }
    case 'PIE': {
      const m = mapping as WidgetMapping['PIE']
      return (
        <Drawn built={buildCategories(result, m, 'PIE')}>
          {(data, notice) => (
            <PieChartView
              data={data}
              donut={m.donut}
              notice={notice}
              interaction={withRows(base, categoryRows(result, m, 'PIE'))}
            />
          )}
        </Drawn>
      )
    }
    case 'RADIAL': {
      const m = mapping as WidgetMapping['RADIAL']
      return (
        <Drawn built={buildCategories(result, m, 'RADIAL')}>
          {(data, notice) => (
            <RadialChartView
              data={data}
              notice={notice}
              interaction={withRows(base, categoryRows(result, m, 'RADIAL'))}
            />
          )}
        </Drawn>
      )
    }
    case 'RADAR': {
      const m = mapping as WidgetMapping['RADAR']
      return (
        <Drawn built={buildRadar(result, m)}>
          {(data, notice) => (
            <RadarChartView
              data={data}
              series={m.series}
              notice={notice}
              interaction={withRows(base, NO_ROWS)}
            />
          )}
        </Drawn>
      )
    }
    case 'KPI':
      return (
        <Drawn built={buildKpi(result, mapping as WidgetMapping['KPI'])}>
          {(data) => <KpiView data={data} />}
        </Drawn>
      )
    case 'LIST':
      return (
        <Drawn built={buildList(result, mapping as WidgetMapping['LIST'])}>
          {(data) => (
            <ListView data={data} interaction={withRows(base, NO_ROWS)} />
          )}
        </Drawn>
      )
    case 'MAP':
      return (
        <MapBody
          result={result}
          mapping={mapping as WidgetMapping['MAP']}
          base={base}
        />
      )
  }
}
