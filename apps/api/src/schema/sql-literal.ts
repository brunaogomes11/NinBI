function quote(text: string): string {
  return `'${text.replaceAll("'", "''")}'`
}

function isTagged(
  value: object,
  kind: 'bigint' | 'json',
): value is { kind: typeof kind; value: string } {
  const tagged = value as { kind?: unknown; value?: unknown }
  return (
    tagged.kind === kind &&
    typeof tagged.value === 'string' &&
    Object.keys(value).length === 2
  )
}

function toJsonText(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    typeof item === 'bigint' ? item.toString() : item,
  )
}

/**
 * Valor de exemplo de uma coluna como literal SQL (SCS-14): texto e data entre
 * aspas simples com `'` dobrado, número e booleano sem aspas, binário como
 * `'<binário N bytes>'`, objeto como texto JSON entre aspas. Nulo não tem
 * exemplo. Não corta nada.
 */
export function toSqlLiteral(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return quote(value)
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : quote(String(value))
  }
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Uint8Array) {
    return quote(`<binário ${value.byteLength} bytes>`)
  }
  if (value instanceof Date) return quote(value.toISOString())
  if (typeof value === 'object') {
    if (isTagged(value, 'bigint')) return value.value
    if (isTagged(value, 'json')) return quote(value.value)
    return quote(toJsonText(value))
  }
  return quote(String(value))
}
