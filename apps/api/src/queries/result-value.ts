import type { ResultValue } from '@ninbi/contracts'
import neo4j from 'neo4j-driver'

function isTemporalOrPoint(value: unknown): boolean {
  return (
    neo4j.isDate(value) ||
    neo4j.isDateTime(value) ||
    neo4j.isLocalDateTime(value) ||
    neo4j.isTime(value) ||
    neo4j.isLocalTime(value) ||
    neo4j.isDuration(value) ||
    neo4j.isPoint(value)
  )
}

/** JSON como texto: `Integer` sai como dígitos crus, sem passar por `Number`. */
function toJsonText(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (neo4j.isInt(value)) return value.toString()
  if (typeof value === 'bigint') return value.toString()
  if (isTemporalOrPoint(value)) return JSON.stringify(String(value))
  if (neo4j.isNode(value)) {
    return toJsonText({ labels: value.labels, properties: value.properties })
  }
  if (neo4j.isRelationship(value)) {
    return toJsonText({ type: value.type, properties: value.properties })
  }
  if (neo4j.isPath(value)) {
    const nodes = [value.start, ...value.segments.map((s) => s.end)]
    const relationships = value.segments.map((s) => s.relationship)
    return toJsonText({ nodes, relationships })
  }
  if (Array.isArray(value)) return `[${value.map(toJsonText).join(',')}]`
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, entry]) => `${JSON.stringify(key)}:${toJsonText(entry)}`,
    )
    return `{${entries.join(',')}}`
  }
  const text = JSON.stringify(value)
  return text === undefined ? 'null' : text
}

export function toResultValue(value: unknown): ResultValue {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean' || typeof value === 'string') return value
  if (typeof value === 'number') return value
  if (typeof value === 'bigint')
    return { kind: 'bigint', value: value.toString() }
  if (neo4j.isInt(value)) {
    return neo4j.integer.inSafeRange(value)
      ? value.toNumber()
      : { kind: 'bigint', value: value.toString() }
  }
  if (isTemporalOrPoint(value)) return String(value)
  return { kind: 'json', value: toJsonText(value) }
}
