import {
  type SqlToken,
  type SqlTokenDialect,
  tokenizeSql,
} from '@ninbi/contracts'

export type PlaceholderStyle = 'dollar' | 'question' | 'at'

export interface BoundSql {
  text: string
  values: unknown[]
}

interface Replacement {
  start: number
  end: number
  text: string
}

function isDateValue(value: unknown): value is { kind: 'date'; value: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'date' &&
    typeof (value as { value?: unknown }).value === 'string'
  )
}

/** Valor do fio para o driver: data vira o texto `AAAA-MM-DD`; ausente vira `null`. */
function toDriverValue(value: unknown): unknown {
  if (value === undefined) return null
  if (isDateValue(value)) return value.value
  return value
}

function isWord(token: SqlToken | undefined, word: string): boolean {
  return token?.type === 'word' && token.value.toUpperCase() === word
}

/**
 * `$nome IS NULL` e `$nome IS NOT NULL` a partir do token `index`: devolve o
 * índice do token `NULL` e se a expressão tem `NOT`, ou `null` se não casa.
 */
function nullTest(
  tokens: SqlToken[],
  index: number,
): { last: number; negated: boolean } | null {
  if (!isWord(tokens[index + 1], 'IS')) return null
  if (isWord(tokens[index + 2], 'NULL'))
    return { last: index + 2, negated: false }
  if (isWord(tokens[index + 2], 'NOT') && isWord(tokens[index + 3], 'NULL')) {
    return { last: index + 3, negated: true }
  }
  return null
}

function applyReplacements(sql: string, replacements: Replacement[]): string {
  let text = ''
  let cursor = 0
  for (const replacement of replacements) {
    text += sql.slice(cursor, replacement.start) + replacement.text
    cursor = replacement.end
  }
  return text + sql.slice(cursor)
}

/**
 * Troca cada `$nome` fora de strings, comentários e identificadores por
 * marcadores do driver (`$1`, `?` ou `@p1`) e devolve os valores na ordem
 * dos marcadores; o valor nunca é colado no texto. `$nome IS [NOT] NULL` vira
 * `(1 = 1)` ou `(1 = 0)` antes de tudo. Lista vira um marcador por item, e
 * lista vazia vira `NULL`. No estilo `question` cada ocorrência leva o seu
 * valor; nos outros, o mesmo nome reaproveita o mesmo número.
 */
export function bindSqlParams(
  sql: string,
  params: Record<string, unknown>,
  style: PlaceholderStyle,
  dialect?: SqlTokenDialect,
): BoundSql {
  const tokens = tokenizeSql(sql, { dialect })
  const values: unknown[] = []
  const numbered = new Map<string, string>()
  const replacements: Replacement[] = []

  const marker = (value: unknown): string => {
    values.push(value)
    if (style === 'question') return '?'
    return style === 'dollar' ? `$${values.length}` : `@p${values.length}`
  }

  const markersFor = (value: unknown): string => {
    if (!Array.isArray(value)) return marker(toDriverValue(value))
    if (value.length === 0) return 'NULL'
    return value.map((item) => marker(toDriverValue(item))).join(', ')
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] as SqlToken
    if (token.type !== 'param') continue
    const value = params[token.value]
    const test = nullTest(tokens, i)
    if (test !== null) {
      const isNull = value === null || value === undefined
      replacements.push({
        start: token.start,
        end: (tokens[test.last] as SqlToken).end,
        text: isNull !== test.negated ? '(1 = 1)' : '(1 = 0)',
      })
      i = test.last
      continue
    }
    let text: string
    if (style === 'question') {
      text = markersFor(value)
    } else {
      text = numbered.get(token.value) ?? markersFor(value)
      numbered.set(token.value, text)
    }
    replacements.push({ start: token.start, end: token.end, text })
  }

  return { text: applyReplacements(sql, replacements), values }
}
