import type { ResultValue } from '@ninbi/contracts'

const DECIMAL_TEXT = /^[+-]?(\d+(\.\d*)?|\.\d+)$/

/** `-007.500` vira `-7.5`; o zero perde o sinal. */
function normalizeDecimal(text: string): string {
  const negative = text.startsWith('-')
  const unsigned = text.replace(/^[+-]/, '')
  const [whole = '', fraction = ''] = unsigned.split('.')
  const integer = whole.replace(/^0+/, '') || '0'
  const decimals = fraction.replace(/0+$/, '')
  const body = decimals === '' ? integer : `${integer}.${decimals}`
  return negative && body !== '0' ? `-${body}` : body
}

/** Escreve um número sem notação exponencial (`1e-7` vira `0.0000001`). */
function plainNumber(value: number): string {
  const text = String(value)
  const match = /^(-?)(\d)(?:\.(\d+))?e([+-]\d+)$/.exec(text)
  if (match === null) return text
  const [, sign, lead, rest = '', exponentText] = match
  const digits = `${lead}${rest}`
  const point = 1 + Number(exponentText)
  if (point <= 0) return `${sign}0.${'0'.repeat(-point)}${digits}`
  if (point >= digits.length) {
    return `${sign}${digits}${'0'.repeat(point - digits.length)}`
  }
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`
}

/** Decimal do banco (texto): número quando o `number` o representa exato, senão o texto. */
function decimalValue(text: string): ResultValue {
  if (!DECIMAL_TEXT.test(text)) return text
  const value = Number(text)
  if (!Number.isFinite(value)) return text
  return normalizeDecimal(plainNumber(value)) === normalizeDecimal(text)
    ? value
    : text
}

function isBinary(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array
}

/** JSON como texto: `bigint` sai como dígitos crus, sem passar por `Number`. */
function toJsonText(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'bigint') return value.toString()
  if (isBinary(value)) return JSON.stringify(binaryText(value))
  if (Array.isArray(value)) return `[${value.map(toJsonText).join(',')}]`
  if (typeof value === 'object' && !(value instanceof Date)) {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, entry]) => `${JSON.stringify(key)}:${toJsonText(entry)}`,
    )
    return `{${entries.join(',')}}`
  }
  const text = JSON.stringify(value)
  return text === undefined ? 'null' : text
}

function binaryText(value: Uint8Array): string {
  return `<binário ${value.byteLength} bytes>`
}

export interface SqlValueOptions {
  /** A coluna é decimal (`numeric`/`decimal`) e o driver a entrega como texto. */
  decimal?: boolean
}

/**
 * Valor de uma coluna SQL para `ResultValue` (SQX-21, SQX-22, SQX-27). Data e
 * data com hora já chegam como texto do gateway.
 */
// SPEC_DEVIATION: a task define `toSqlResultValue(value)`; o segundo argumento
// opcional `{ decimal: true }` existe porque os drivers entregam decimal como
// texto, e só o gateway sabe que a coluna é decimal (sem ele o texto segue como texto).
export function toSqlResultValue(
  value: unknown,
  options: SqlValueOptions = {},
): ResultValue {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    return options.decimal === true ? decimalValue(value) : value
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : String(value)
  }
  if (typeof value === 'bigint') {
    return value >= BigInt(Number.MIN_SAFE_INTEGER) &&
      value <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(value)
      : { kind: 'bigint', value: value.toString() }
  }
  if (isBinary(value)) return binaryText(value)
  return { kind: 'json', value: toJsonText(value) }
}

/** Nomes repetidos ganham `_2`, `_3`... a partir da segunda ocorrência (SQX-23). */
export function uniqueColumnNames(keys: string[]): string[] {
  const taken = new Set(keys)
  const seen = new Map<string, number>()
  return keys.map((key) => {
    const count = (seen.get(key) ?? 0) + 1
    seen.set(key, count)
    if (count === 1) return key
    let suffix = count
    while (taken.has(`${key}_${suffix}`)) suffix++
    const name = `${key}_${suffix}`
    taken.add(name)
    return name
  })
}
