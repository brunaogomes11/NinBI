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
