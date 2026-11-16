import { formatNumber } from '@/lib/format'

/** Uma linha da dica no formato que o Recharts entrega em `payload`. */
export interface TooltipItem {
  name?: string | number
  value?: number | string | null
  color?: string
  payload?: { xLabel?: string; axis?: string; label?: string }
}

export interface NinbiTooltipProps {
  active?: boolean
  payload?: TooltipItem[]
  label?: string | number
}

/** Conteúdo da dica de todos os gráficos: rótulo do ponto e uma linha por série. */
export function NinbiTooltip({ active, payload, label }: NinbiTooltipProps) {
  if (active === false || !payload || payload.length === 0) return null
  const first = payload[0]
  // O radial entrega o índice numérico da barra como `label`: não é título.
  const heading =
    first?.payload?.xLabel ??
    first?.payload?.axis ??
    (typeof label === 'string' ? label : undefined)
  return (
    <div className="grid min-w-32 gap-1.5 rounded-control border border-border bg-card-elevated px-3 py-2 text-xs shadow-xl">
      {heading !== undefined && heading !== '' && (
        <div className="font-medium">{heading}</div>
      )}
      {payload.map((item, index) => (
        <div
          key={`${item.name ?? index}`}
          className="flex items-center justify-between gap-4"
        >
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.color }}
            />
            {item.payload?.label ?? item.name}
          </span>
          <span className="font-mono font-medium tabular-nums">
            {typeof item.value === 'number'
              ? formatNumber(item.value)
              : (item.value ?? '—')}
          </span>
        </div>
      ))}
    </div>
  )
}

export const GRID_PROPS = {
  vertical: false,
  strokeDasharray: '3 3',
  stroke: 'var(--border)',
} as const

export const AXIS_PROPS = {
  tickLine: false,
  axisLine: false,
  tick: { fill: 'var(--muted-foreground)', fontSize: 12 },
} as const
