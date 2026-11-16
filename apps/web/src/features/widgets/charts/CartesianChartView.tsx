import { useEffect, useId, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from '@/components/ui/chart'
import { formatNumber } from '@/lib/format'
import {
  buildChartConfig,
  type CartesianPoint,
  seriesColor,
  tickInterval,
} from '../mapping/chart-data'
import { AXIS_PROPS, GRID_PROPS, NinbiTooltip } from './chart-theme'

export interface CartesianMapping {
  x: string
  series: string[]
  stacked?: boolean
  horizontal?: boolean
}

export interface CartesianChartViewProps {
  visualization: 'AREA' | 'BAR' | 'LINE'
  data: CartesianPoint[]
  mapping: CartesianMapping
}

/** Largura do elemento, atualizada quando o card muda de tamanho (CHART-08). */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number | null>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

export function CartesianChartView({
  visualization,
  data,
  mapping,
}: CartesianChartViewProps) {
  const { ref, width } = useWidth()
  const gradientId = `area-${useId().replace(/:/g, '')}`
  const config = buildChartConfig(mapping.series)
  const keys = mapping.series.map((_, i) => `s${i}`)
  const stackId = mapping.stacked ? 'a' : undefined
  const horizontal = visualization === 'BAR' && mapping.horizontal === true
  const interval = tickInterval(
    data.map((point) => point.xLabel),
    width ?? Number.POSITIVE_INFINITY,
  )
  const single = data.length === 1
  const oneSeries = keys.length === 1

  const common = {
    data,
    margin: { top: 8, right: 8, bottom: 0, left: 0 },
  }
  const children = [
    <CartesianGrid
      key="grid"
      {...GRID_PROPS}
      vertical={horizontal}
      horizontal={!horizontal}
    />,
    horizontal ? (
      <XAxis
        key="x"
        type="number"
        {...AXIS_PROPS}
        tickFormatter={(value: number) => formatNumber(value)}
      />
    ) : (
      <XAxis
        key="x"
        dataKey="xLabel"
        interval={interval}
        {...AXIS_PROPS}
        tickMargin={8}
      />
    ),
    horizontal ? (
      <YAxis
        key="y"
        type="category"
        dataKey="xLabel"
        interval={0}
        width={72}
        {...AXIS_PROPS}
      />
    ) : (
      <YAxis
        key="y"
        width={56}
        {...AXIS_PROPS}
        tickFormatter={(value: number) => formatNumber(value)}
      />
    ),
    <ChartTooltip key="tooltip" content={<NinbiTooltip />} />,
    keys.length > 1 ? (
      <ChartLegend key="legend" content={<ChartLegendContent />} />
    ) : null,
  ]

  return (
    <div ref={ref} className="h-full min-h-0 w-full">
      <ChartContainer config={config} className="h-full w-full aspect-auto">
        {visualization === 'AREA' ? (
          <AreaChart {...common}>
            {oneSeries && (
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--brand-purple)"
                    stopOpacity={0.45}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--brand-cyan)"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
            )}
            {children}
            {keys.map((key, i) => (
              <Area
                key={key}
                dataKey={key}
                name={mapping.series[i]}
                type="monotone"
                stackId={stackId}
                stroke={seriesColor(i)}
                strokeWidth={2}
                fill={oneSeries ? `url(#${gradientId})` : `var(--color-${key})`}
                fillOpacity={oneSeries ? 1 : 0.35}
                dot={single}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        ) : visualization === 'LINE' ? (
          <LineChart {...common}>
            {children}
            {keys.map((key, i) => (
              <Line
                key={key}
                dataKey={key}
                name={mapping.series[i]}
                type="monotone"
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={single}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart {...common} layout={horizontal ? 'vertical' : 'horizontal'}>
            {children}
            {keys.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                name={mapping.series[i]}
                stackId={stackId}
                fill={`var(--color-${key})`}
                radius={stackId ? 0 : 4}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        )}
      </ChartContainer>
    </div>
  )
}
