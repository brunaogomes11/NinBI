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

/** O banco cujas regras de comentário e de escape valem na leitura. */
export type SqlTokenDialect = 'POSTGRES' | 'MYSQL' | 'SQLSERVER'

export interface SqlTokenizeOptions {
  /**
   * Sem dialeto, vale a leitura comum ao PostgreSQL e ao SQL Server. No
   * `MYSQL`, `#` abre comentário de linha, `--` só é comentário se seguido de
   * espaço, `\` escapa dentro de `'...'` e `"..."`, e o corpo de `/*! *\/` é
   * lido como SQL (o MySQL o executa).
   */
  dialect?: SqlTokenDialect
}

const WORD_START = /[\p{L}_]/u
const WORD_PART = /[\p{L}\p{N}_]/u
const DIGIT = /[0-9]/
const BACKSLASH = String.fromCharCode(92)
/** Delimitador de texto entre cifrões do PostgreSQL: `$$` ou `$tag$`. */
const DOLLAR_QUOTE = /\$(?:[\p{L}_][\p{L}\p{N}_]*)?\$/uy
/** Abertura de comentário executável do MySQL e MariaDB, com a versão opcional. */
const MYSQL_EXECUTABLE_COMMENT = /\/\*M?!\d*/y

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

/** Fim (exclusivo) de um trecho entre `close` em que `\` também escapa. */
function endOfEscapedQuoted(sql: string, from: number, close: string): number {
  let i = from
  while (i < sql.length) {
    if (sql[i] === BACKSLASH) i += 2
    else if (sql[i] === close) {
      if (sql[i + 1] === close) i += 2
      else return i + 1
    } else i++
  }
  return sql.length
}

function matchAt(pattern: RegExp, sql: string, at: number): string | null {
  pattern.lastIndex = at
  const match = pattern.exec(sql)
  return match === null ? null : match[0]
}

/** No MySQL, `--` só abre comentário se o que vem depois é espaço, controle ou o fim. */
function isMysqlDashComment(sql: string, at: number): boolean {
  const after = sql[at + 2]
  return after === undefined || /[\s\p{Cc}]/u.test(after)
}

/**
 * Separa o SQL em tokens com posição. Comentários `--` e `/* *\/` ficam de
 * fora, e o conteúdo de strings e identificadores não vira palavra nem
 * parâmetro. `$` seguido de letra ou `_` é parâmetro; `$1` não é, e `$$` e
 * `$tag$` são um `symbol` só (o delimitador inteiro), que o validador recusa.
 */
export function tokenizeSql(
  sql: string,
  options: SqlTokenizeOptions = {},
): SqlToken[] {
  const mysql = options.dialect === 'MYSQL'
  const tokens: SqlToken[] = []
  const push = (type: SqlTokenType, start: number, end: number) => {
    tokens.push({ type, value: sql.slice(start, end), start, end })
  }
  const endOfString = (from: number, close: string) =>
    mysql ? endOfEscapedQuoted(sql, from, close) : endOfQuoted(sql, from, close)
  let i = 0
  while (i < sql.length) {
    const ch = sql[i] as string
    const next = sql[i + 1]
    if (ch === '-' && next === '-' && (!mysql || isMysqlDashComment(sql, i))) {
      while (i < sql.length && sql[i] !== '\n') i++
    } else if (mysql && ch === '#') {
      while (i < sql.length && sql[i] !== '\n') i++
    } else if (ch === '/' && next === '*') {
      const executable = mysql
        ? matchAt(MYSQL_EXECUTABLE_COMMENT, sql, i)
        : null
      if (executable !== null) {
        i += executable.length
      } else {
        const end = sql.indexOf('*/', i + 2)
        i = end === -1 ? sql.length : end + 2
      }
    } else if (/\s/.test(ch)) {
      i++
    } else if (ch === "'") {
      const end = endOfString(i + 1, "'")
      push('string', i, end)
      i = end
    } else if ((ch === 'N' || ch === 'n') && next === "'") {
      const end = endOfString(i + 2, "'")
      push('string', i, end)
      i = end
    } else if ((ch === 'E' || ch === 'e') && next === "'") {
      const end = endOfEscapedQuoted(sql, i + 2, "'")
      push('string', i, end)
      i = end
    } else if (ch === '"') {
      const end = endOfString(i + 1, ch)
      push('identifier', i, end)
      i = end
    } else if (ch === '`') {
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
    } else if (ch === '$' && matchAt(DOLLAR_QUOTE, sql, i) !== null) {
      const end = i + (matchAt(DOLLAR_QUOTE, sql, i) as string).length
      push('symbol', i, end)
      i = end
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

/** Delimitador `$$` ou `$tag$` entre os tokens, se houver. */
export function findDollarQuote(tokens: SqlToken[]): SqlToken | null {
  return (
    tokens.find(
      (token) =>
        token.type === 'symbol' &&
        token.value.length > 1 &&
        token.value.startsWith('$'),
    ) ?? null
  )
}
