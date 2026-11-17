export type SqlTokenType =
  | 'word'
  | 'string'
  | 'identifier'
  | 'param'
  | 'number'
  | 'symbol'
  | 'semicolon'

/**
 * `value` é o texto exato de `start` a `end` (fim exclusivo), exceto no
 * `param`, em que é o nome sem o `$`.
 */
export interface SqlToken {
  type: SqlTokenType
  value: string
  start: number
  end: number
}

const WORD_START = /[\p{L}_]/u
const WORD_PART = /[\p{L}\p{N}_]/u
const DIGIT = /[0-9]/

/** Fim (exclusivo) de um trecho entre `close`, em que `close` dobrado é literal. */
function endOfQuoted(sql: string, from: number, close: string): number {
  let i = from
  while (i < sql.length) {
    if (sql[i] === close) {
      if (sql[i + 1] === close) i += 2
      else return i + 1
    } else i++
  }
  return sql.length
}

/** Fim (exclusivo) de uma string `E'...'`, em que `\` também escapa. */
function endOfEscapedString(sql: string, from: number): number {
  let i = from
  while (i < sql.length) {
    if (sql[i] === String.fromCharCode(92)) i += 2
    else if (sql[i] === "'") {
      if (sql[i + 1] === "'") i += 2
      else return i + 1
    } else i++
  }
  return sql.length
}

/**
 * Separa o SQL em tokens com posição. Comentários `--` e `/* *\/` ficam de
 * fora, e o conteúdo de strings e identificadores não vira palavra nem
 * parâmetro. `$` seguido de letra ou `_` é parâmetro; `$1` e `$$` não são.
 */
export function tokenizeSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = []
  const push = (type: SqlTokenType, start: number, end: number) => {
    tokens.push({ type, value: sql.slice(start, end), start, end })
  }
  let i = 0
  while (i < sql.length) {
    const ch = sql[i] as string
    const next = sql[i + 1]
    if (ch === '-' && next === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
    } else if (ch === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2)
      i = end === -1 ? sql.length : end + 2
    } else if (/\s/.test(ch)) {
      i++
    } else if (ch === "'") {
      const end = endOfQuoted(sql, i + 1, "'")
      push('string', i, end)
      i = end
    } else if ((ch === 'N' || ch === 'n') && next === "'") {
      const end = endOfQuoted(sql, i + 2, "'")
      push('string', i, end)
      i = end
    } else if ((ch === 'E' || ch === 'e') && next === "'") {
      const end = endOfEscapedString(sql, i + 2)
      push('string', i, end)
      i = end
    } else if (ch === '"' || ch === '`') {
      const end = endOfQuoted(sql, i + 1, ch)
      push('identifier', i, end)
      i = end
    } else if (ch === '[') {
      const end = endOfQuoted(sql, i + 1, ']')
      push('identifier', i, end)
      i = end
    } else if (ch === ';') {
      push('semicolon', i, i + 1)
      i++
    } else if (ch === '$' && next !== undefined && WORD_START.test(next)) {
      let j = i + 1
      while (j < sql.length && WORD_PART.test(sql[j] as string)) j++
      tokens.push({
        type: 'param',
        value: sql.slice(i + 1, j),
        start: i,
        end: j,
      })
      i = j
    } else if (WORD_START.test(ch)) {
      let j = i + 1
      while (j < sql.length && WORD_PART.test(sql[j] as string)) j++
      push('word', i, j)
      i = j
    } else if (DIGIT.test(ch)) {
      let j = i + 1
      while (j < sql.length && DIGIT.test(sql[j] as string)) j++
      push('number', i, j)
      i = j
    } else {
      push('symbol', i, i + 1)
      i++
    }
  }
  return tokens
}
