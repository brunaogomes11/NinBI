import { Pie, PieChart } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { buildChartConfig, type CategoryItem } from '../mapping/chart-data'
import { NinbiTooltip } from './chart-theme'

export interface PieChartViewProps {
  data: CategoryItem[]
  donut: boolean
  notice?: string
}

/** Pizza com uma fatia por item; "Donut" vaza o centro (CHART-09, CHART-10). */
export function PieChartView({ data, donut, notice }: PieChartViewProps) {
  const config = buildChartConfig(
    data.map((item) => item.label),
    'c',
  )
  const slices = data.map((item) => ({
    ...item,
    fill: `var(--color-${item.key})`,
  }))
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="min-h-0 flex-1">
        <ChartContainer config={config} className="h-full w-full aspect-auto">
          <PieChart>
            <ChartTooltip content={<NinbiTooltip />} />
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius={donut ? '60%' : 0}
              outerRadius="80%"
              stroke="var(--card)"
              isAnimationActive={false}
            />
          </PieChart>
        </ChartContainer>
      </div>
      {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
    </div>
  )
}
