import {
  isDate,
  isDateTime,
  isDuration,
  isInt,
  isLocalDateTime,
  isLocalTime,
  isPoint,
  isTime,
} from 'neo4j-driver'

const SIMPLE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Nome de label, tipo, propriedade ou chave de mapa entre crases, com a crase interna dobrada. */
export function escapeIdentifier(name: string): string {
  return `\`${name.replaceAll('`', '``')}\``
}

function quote(text: string): string {
  return `'${text.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`
}

function mapKey(key: string): string {
  return SIMPLE_IDENTIFIER.test(key) ? key : escapeIdentifier(key)
}

/**
 * Converte um valor do neo4j-driver no literal Cypher que o representa (SCH-27).
 * Não corta nada: texto longo sai inteiro (SCH-04).
 */
export function toCypherLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') return quote(value)
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'number') return String(value)
  if (typeof value === 'bigint') return value.toString()
  if (isInt(value)) return value.toString()
  if (isDate(value)) return `date(${quote(value.toString())})`
  if (isDateTime(value)) return `datetime(${quote(value.toString())})`
  if (isLocalDateTime(value)) return `localdatetime(${quote(value.toString())})`
  if (isTime(value)) return `time(${quote(value.toString())})`
  if (isLocalTime(value)) return `localtime(${quote(value.toString())})`
  if (isDuration(value)) return `duration(${quote(value.toString())})`
  if (isPoint(value)) {
    const axes = [
      `srid: ${value.srid.toString()}`,
      `x: ${value.x}`,
      `y: ${value.y}`,
    ]
    if (value.z !== undefined) axes.push(`z: ${value.z}`)
    return `point({${axes.join(', ')}})`
  }
  if (Array.isArray(value)) return `[${value.map(toCypherLiteral).join(', ')}]`
  if (typeof value === 'object') {
    const entries = Object.entries(value).map(
      ([key, item]) => `${mapKey(key)}: ${toCypherLiteral(item)}`,
    )
    return `{${entries.join(', ')}}`
  }
  return quote(String(value))
}
