import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
} from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import {
  buildChartConfig,
  type CategoryItem,
  type RadarPoint,
} from '../mapping/chart-data'
import { NinbiTooltip } from './chart-theme'

function Notice({ text }: { text?: string }) {
  return text ? <p className="text-xs text-muted-foreground">{text}</p> : null
}

export interface RadarChartViewProps {
  data: RadarPoint[]
  series: string[]
  notice?: string
}

/** Radar: um eixo por linha e um polígono por série (CHART-11). */
export function RadarChartView({ data, series, notice }: RadarChartViewProps) {
  const config = buildChartConfig(series)
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="min-h-0 flex-1">
        <ChartContainer config={config} className="h-full w-full aspect-auto">
          <RadarChart data={data}>
            <ChartTooltip content={<NinbiTooltip />} />
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            />
            {series.map((name, i) => (
              <Radar
                key={name}
                dataKey={`s${i}`}
                name={name}
                stroke={`var(--color-s${i})`}
                fill={`var(--color-s${i})`}
                fillOpacity={0.3}
                isAnimationActive={false}
              />
            ))}
          </RadarChart>
        </ChartContainer>
      </div>
      <Notice text={notice} />
    </div>
  )
}

export interface RadialChartViewProps {
  data: CategoryItem[]
  notice?: string
}

/** Radial: uma barra por linha, com o comprimento do valor (CHART-12). */
export function RadialChartView({ data, notice }: RadialChartViewProps) {
  const config = buildChartConfig(
    data.map((item) => item.label),
    'c',
  )
  const bars = data.map((item) => ({
    ...item,
    fill: `var(--color-${item.key})`,
  }))
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="min-h-0 flex-1">
        <ChartContainer config={config} className="h-full w-full aspect-auto">
          <RadialBarChart
            data={bars}
            startAngle={90}
            endAngle={-180}
            innerRadius="20%"
            outerRadius="90%"
          >
            <ChartTooltip content={<NinbiTooltip />} />
            <PolarAngleAxis type="number" tick={false} axisLine={false} />
            <RadialBar dataKey="value" background isAnimationActive={false} />
          </RadialBarChart>
        </ChartContainer>
      </div>
      <Notice text={notice} />
    </div>
  )
}
