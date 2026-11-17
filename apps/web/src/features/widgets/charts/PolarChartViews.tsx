import {
  Cell,
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
import { type RowInteraction, rowProps } from '../row-interaction'
import { NinbiTooltip } from './chart-theme'

function Notice({ text }: { text?: string }) {
  return text ? <p className="text-xs text-muted-foreground">{text}</p> : null
}

export interface RadarChartViewProps {
  data: RadarPoint[]
  series: string[]
  notice?: string
  interaction?: RowInteraction
}

interface TickProps {
  x?: number | string
  y?: number | string
  index?: number
  textAnchor?: 'start' | 'middle' | 'end' | 'inherit'
  payload?: { value?: string | number }
}

/** Rótulo de eixo clicável do radar (XFL-02). */
function clickableTick(interaction: RowInteraction) {
  return ({ x, y, index = 0, textAnchor, payload }: TickProps) => {
    return (
      <text
        key={`tick-${index}`}
        x={x}
        y={y}
        textAnchor={textAnchor}
        fill="var(--muted-foreground)"
        fontSize={12}
        {...rowProps(interaction, index)}
      >
        {payload?.value}
      </text>
    )
  }
}

/** Radar: um eixo por linha e um polígono por série (CHART-11). */
export function RadarChartView({
  data,
  series,
  notice,
  interaction,
}: RadarChartViewProps) {
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
              tick={
                interaction
                  ? clickableTick(interaction)
                  : { fill: 'var(--muted-foreground)', fontSize: 12 }
              }
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
  interaction?: RowInteraction
}

/** Radial: uma barra por linha, com o comprimento do valor (CHART-12). */
export function RadialChartView({
  data,
  notice,
  interaction,
}: RadialChartViewProps) {
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
            <RadialBar dataKey="value" background isAnimationActive={false}>
              {interaction &&
                bars.map((bar, i) => (
                  <Cell
                    key={bar.key}
                    fill={bar.fill}
                    {...rowProps(interaction, i)}
                  />
                ))}
            </RadialBar>
          </RadialBarChart>
        </ChartContainer>
      </div>
      <Notice text={notice} />
    </div>
  )
}
