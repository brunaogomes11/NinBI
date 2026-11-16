import {
  MESSAGES,
  type QueryResultDto,
  type WidgetVisualization as Visualization,
  type WidgetMapping,
} from '@ninbi/contracts'
import { type ReactNode, useMemo } from 'react'
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
} from './mapping/chart-data'
import { buildKpi, buildList, buildMapPoints } from './mapping/simple-data'
import { validateMapping } from './mapping/suggest'
import { ResultTable } from './ResultTable'

export interface WidgetVisualizationProps {
  result: QueryResultDto
  visualization: string
  config: Record<string, unknown>
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
}: {
  result: QueryResultDto
  mapping: WidgetMapping['MAP']
}) {
  const built = useMemo(
    () => buildMapPoints(result, mapping),
    [result, mapping],
  )
  return (
    <Drawn built={built}>
      {(points, notice) => <MapView points={points} notice={notice} />}
    </Drawn>
  )
}

/** Mostra o resultado na visualização do widget; sem mapeamento completo, cai na tabela (VIZ-12, VIZ-13, VIZ-18). */
export function WidgetVisualization({
  result,
  visualization,
  config,
}: WidgetVisualizationProps) {
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
      <ResultTable result={result} />
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
            <CartesianChartView visualization={v} data={data} mapping={m} />
          )}
        </Drawn>
      )
    }
    case 'PIE': {
      const m = mapping as WidgetMapping['PIE']
      return (
        <Drawn built={buildCategories(result, m, 'PIE')}>
          {(data, notice) => (
            <PieChartView data={data} donut={m.donut} notice={notice} />
          )}
        </Drawn>
      )
    }
    case 'RADIAL': {
      const m = mapping as WidgetMapping['RADIAL']
      return (
        <Drawn built={buildCategories(result, m, 'RADIAL')}>
          {(data, notice) => <RadialChartView data={data} notice={notice} />}
        </Drawn>
      )
    }
    case 'RADAR': {
      const m = mapping as WidgetMapping['RADAR']
      return (
        <Drawn built={buildRadar(result, m)}>
          {(data, notice) => (
            <RadarChartView data={data} series={m.series} notice={notice} />
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
          {(data) => <ListView data={data} />}
        </Drawn>
      )
    case 'MAP':
      return (
        <MapBody result={result} mapping={mapping as WidgetMapping['MAP']} />
      )
  }
}
