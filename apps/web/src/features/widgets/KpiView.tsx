import { ArrowDown, ArrowUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { KpiData } from './mapping/simple-data'

/** Valor em destaque e, quando há variação, o chip com seta e porcentagem (KPI-01 a KPI-05). */
export function KpiView({ data }: { data: KpiData }) {
  const up = data.direction === 'up'
  return (
    <div className="flex h-full min-h-0 flex-col justify-center gap-2">
      <p className="truncate text-3xl font-semibold tabular-nums">
        {data.value}
      </p>
      {data.direction !== null && (
        <Badge
          variant="ghost"
          data-direction={data.direction}
          className={cn(
            'gap-1 px-2 py-1',
            up
              ? 'bg-primary/15 text-accent-text'
              : 'bg-destructive/15 text-destructive',
          )}
        >
          {up ? (
            <ArrowUp role="img" aria-label="alta" />
          ) : (
            <ArrowDown role="img" aria-label="queda" />
          )}
          {data.changeLabel}
        </Badge>
      )}
    </div>
  )
}
