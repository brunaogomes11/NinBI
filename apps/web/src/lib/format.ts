import type { ResultValue } from '@ninbi/contracts'

const DATE_TIME = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** `2026-11-16T17:30:00Z` vira `16/11/2026, 14:30` no fuso do navegador. */
export function formatDateTime(iso: string): string {
  const parts = Object.fromEntries(
    DATE_TIME.formatToParts(new Date(iso)).map((part) => [
      part.type,
      part.value,
    ]),
  )
  return `${parts.day}/${parts.month}/${parts.year}, ${parts.hour}:${parts.minute}`
}

const NUMBER = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/

/** `1234.56` vira `1.234,56`: até duas casas decimais. */
export function formatNumber(n: number): string {
  return NUMBER.format(n)
}

/** Texto que começa com `AAAA-MM-DD` vira `DD/MM/AAAA`, sem conversão de fuso. */
export function formatDate(text: string): string {
  const match = ISO_DATE.exec(text)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : text
}

export function formatValue(value: ResultValue): string {
  if (value === null) return '—'
  if (typeof value === 'number') return formatNumber(value)
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'string') return formatDate(value)
  if (value.kind === 'bigint')
    return BigInt(value.value).toLocaleString('pt-BR')
  return value.value
}
