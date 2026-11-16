import neo4j from 'neo4j-driver'

function isDateValue(value: unknown): value is { kind: 'date'; value: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'date' &&
    typeof (value as { value?: unknown }).value === 'string'
  )
}

function convert(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(convert)
  if (isDateValue(value)) {
    const [year, month, day] = value.value.split('-').map(Number) as [
      number,
      number,
      number,
    ]
    return new neo4j.types.Date(
      neo4j.int(year),
      neo4j.int(month),
      neo4j.int(day),
    )
  }
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return neo4j.int(value)
  }
  return value
}

/**
 * Valores do fio (JSON) para valores do driver: data vira `Date`, inteiro vira `Integer`,
 * lista converte cada item; o resto segue como veio (FLT-11 a FLT-13).
 */
export function toCypherParams(
  params: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).map(([name, value]) => [name, convert(value)]),
  )
}
