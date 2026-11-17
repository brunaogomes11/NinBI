import {
  MESSAGES,
  REFRESH_INTERVAL_LABELS,
  REFRESH_INTERVALS,
  type RefreshInterval,
} from '@ninbi/contracts'
import { hashKey, type QueryKey, useIsFetching } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatClock } from '@/lib/format'

/** Hora em que as execuções dos widgets da aba ativa terminaram pela última vez (RFR-11). */
export function useLastUpdate(queryKeys: QueryKey[]): Date | null {
  const hashes = new Set(queryKeys.map((key) => hashKey(key)))
  const fetching = useIsFetching({
    predicate: (query) => hashes.has(query.queryHash),
  })
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const wasFetching = useRef(false)
  useEffect(() => {
    if (fetching > 0) {
      wasFetching.current = true
    } else if (wasFetching.current) {
      wasFetching.current = false
      setUpdatedAt(new Date())
    }
  }, [fetching])
  return updatedAt
}

/** Intervalo da atualização automática e a hora da última atualização, ao lado de "Atualizar". */
export function RefreshControl({
  value,
  onChange,
  updatedAt,
}: {
  value: number
  onChange: (sec: RefreshInterval) => void
  updatedAt: Date | null
}) {
  return (
    <div className="flex items-center gap-2">
      {updatedAt && (
        <span className="text-muted-foreground text-sm">
          {MESSAGES.updatedAt(formatClock(updatedAt, { seconds: true }))}
        </span>
      )}
      <Select
        value={String(value)}
        onValueChange={(next) => onChange(Number(next) as RefreshInterval)}
      >
        <SelectTrigger aria-label="Atualização automática" className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {REFRESH_INTERVALS.map((sec) => (
            <SelectItem key={sec} value={String(sec)}>
              {REFRESH_INTERVAL_LABELS[sec]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
