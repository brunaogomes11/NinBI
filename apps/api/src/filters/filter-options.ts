import {
  FILTER_OPTIONS_MAX,
  type FilterOptionsDto,
  type FilterScalar,
  type QueryResultDto,
  type ResultValue,
} from '@ninbi/contracts'

function toOption(value: ResultValue): FilterScalar | null {
  if (value === null) return null
  if (typeof value === 'object') return value.value
  return value
}

/** Opções de um filtro "Consulta Cypher": primeira coluna, sem nulos nem repetidos, até 1.000 (FLT-06, FLT-24). */
export function optionsFromResult(result: QueryResultDto): FilterOptionsDto {
  if (result.columns.length === 0) return { options: [], truncated: false }
  const seen = new Set<string>()
  const options: FilterScalar[] = []
  let truncated = false
  for (const row of result.rows) {
    const option = toOption(row[0] ?? null)
    if (option === null) continue
    const key = `${typeof option}:${option}`
    if (seen.has(key)) continue
    seen.add(key)
    if (options.length === FILTER_OPTIONS_MAX) {
      truncated = true
      break
    }
    options.push(option)
  }
  return { options, truncated }
}
