import { MAX_CYPHER_LENGTH, MESSAGES } from '@ninbi/contracts'

export type CypherCheck =
  | { ok: true }
  | {
      ok: false
      code:
        | 'QUERY_TOO_LONG'
        | 'QUERY_MULTIPLE_STATEMENTS'
        | 'QUERY_WRITE_BLOCKED'
      message: string
      clause?: string
    }

type Token =
  | { type: 'word'; value: string }
  | { type: 'param'; value: string }
  | { type: 'semicolon' }
  | { type: 'symbol'; value: string }

const BLOCKED_WORDS = new Set([
  'CREATE',
  'MERGE',
  'DELETE',
  'SET',
  'REMOVE',
  'DROP',
  'ALTER',
  'RENAME',
  'GRANT',
  'DENY',
  'REVOKE',
  'FOREACH',
])
const BLOCKED_PAIRS = new Set(['LOAD CSV', 'IN TRANSACTIONS'])

/** Símbolos depois dos quais uma palavra ainda pode ser o início de uma cláusula. */
const CLAUSE_END_SYMBOLS = new Set([')', ']', '}', 'string', 'identifier'])
/** Símbolos depois de `.` que fazem dele um seletor de propriedade (`n.set`, `n {.set}`). */
const SELECTOR_BEFORE_DOT = new Set([')', ']', 'identifier', '{', ','])
/** Símbolos logo depois da palavra que mostram que ela é uma variável ou valor, não uma cláusula. */
const OPERAND_AFTER = new Set([
  '=',
  '<',
  '>',
  ',',
  ')',
  ']',
  '}',
  ':',
  '+',
  '*',
  '/',
  '%',
  '^',
  '.',
])
const SUBQUERY_OPENERS = new Set(['CALL', 'EXISTS', 'COUNT', 'COLLECT'])

const WORD_START = /[A-Za-z_]/
const WORD_PART = /[A-Za-z0-9_]/

/** Pula strings, comentários e identificadores entre crases; devolve o que sobra. */
function tokenize(cypher: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const push = (token: Token) => {
    tokens.push(token)
  }
  while (i < cypher.length) {
    const ch = cypher[i] as string
    const next = cypher[i + 1]
    if (ch === "'" || ch === '"') {
      i++
      while (i < cypher.length && cypher[i] !== ch) {
        i += cypher[i] === '\\' ? 2 : 1
      }
      i++
      push({ type: 'symbol', value: 'string' })
    } else if (ch === '`') {
      i++
      while (i < cypher.length) {
        if (cypher[i] === '`') {
          if (cypher[i + 1] === '`') i += 2
          else break
        } else i++
      }
      i++
      push({ type: 'symbol', value: 'identifier' })
    } else if (ch === '/' && next === '/') {
      while (i < cypher.length && cypher[i] !== '\n') i++
    } else if (ch === '/' && next === '*') {
      const end = cypher.indexOf('*/', i + 2)
      i = end === -1 ? cypher.length : end + 2
    } else if (/\s/.test(ch)) {
      i++
    } else if (ch === ';') {
      i++
      push({ type: 'semicolon' })
    } else if (ch === '$' && next !== undefined && WORD_PART.test(next)) {
      let j = i + 1
      while (j < cypher.length && WORD_PART.test(cypher[j] as string)) j++
      push({ type: 'param', value: cypher.slice(i + 1, j) })
      i = j
    } else if (WORD_START.test(ch)) {
      let j = i + 1
      while (j < cypher.length && WORD_PART.test(cypher[j] as string)) j++
      push({ type: 'word', value: cypher.slice(i, j) })
      i = j
    } else {
      i++
      push({ type: 'symbol', value: ch })
    }
  }
  return tokens
}

function hasSecondStatement(tokens: Token[]): boolean {
  const first = tokens.findIndex((token) => token.type === 'semicolon')
  return first !== -1 && first < tokens.length - 1
}

/** `.` que segue identificador, `)`, `]` ou crases (ou abre `{.prop}`); um número com ponto final não. */
function isSelectorDot(tokens: Token[], dotIndex: number): boolean {
  const before = tokens[dotIndex - 1]
  if (before === undefined) return false
  if (before.type === 'word') return true
  return before.type === 'symbol' && SELECTOR_BEFORE_DOT.has(before.value)
}

function isPropertyName(tokens: Token[], index: number): boolean {
  const before = tokens[index - 1]
  return (
    before?.type === 'symbol' &&
    before.value === '.' &&
    isSelectorDot(tokens, index - 1)
  )
}

/** A palavra está onde uma cláusula pode começar (e não como chave de mapa, alias, rótulo ou propriedade). */
function isClausePosition(tokens: Token[], index: number): boolean {
  const before = tokens[index - 1]
  if (before === undefined) return true
  if (before.type === 'semicolon' || before.type === 'param') return true
  if (before.type === 'word') return before.value.toUpperCase() !== 'AS'
  if (before.value === '.') return !isSelectorDot(tokens, index - 1)
  if (before.value === '{') {
    const opener = tokens[index - 2]
    return opener?.type === 'symbol'
      ? opener.value === ')'
      : opener?.type === 'word' &&
          SUBQUERY_OPENERS.has(opener.value.toUpperCase())
  }
  return CLAUSE_END_SYMBOLS.has(before.value) || /[0-9]/.test(before.value)
}

function isOperand(tokens: Token[], index: number): boolean {
  const after = tokens[index + 1]
  // Uma cláusula nunca termina a consulta: no fim da entrada a palavra é só um valor.
  if (after === undefined || after.type === 'semicolon') return true
  return after.type === 'symbol' && OPERAND_AFTER.has(after.value)
}

function findBlockedClause(tokens: Token[]): string | null {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] as Token
    if (token.type !== 'word' || isPropertyName(tokens, i)) continue
    if (!isClausePosition(tokens, i) || isOperand(tokens, i)) continue
    const upper = token.value.toUpperCase()
    if (BLOCKED_WORDS.has(upper)) return upper
    if (upper === 'IN') {
      // `CALL { ... } IN [n CONCURRENT] TRANSACTIONS`; `x IN transactions` é só uma lista.
      const closing = tokens[i - 1]
      if (closing?.type !== 'symbol' || closing.value !== '}') continue
      const ahead = tokens.slice(i + 1, i + 4)
      if (
        ahead.some(
          (next) =>
            next.type === 'word' && next.value.toUpperCase() === 'TRANSACTIONS',
        )
      ) {
        return 'IN TRANSACTIONS'
      }
      continue
    }
    const following = tokens[i + 1]
    if (
      following?.type === 'word' &&
      !isPropertyName(tokens, i + 1) &&
      BLOCKED_PAIRS.has(`${upper} ${following.value.toUpperCase()}`)
    ) {
      return `${upper} ${following.value.toUpperCase()}`
    }
  }
  return null
}

export function validateReadOnlyCypher(
  cypher: string,
  maxLength = MAX_CYPHER_LENGTH,
): CypherCheck {
  if (cypher.length > maxLength) {
    return {
      ok: false,
      code: 'QUERY_TOO_LONG',
      message: MESSAGES.cypherTooLong,
    }
  }
  const tokens = tokenize(cypher)
  if (hasSecondStatement(tokens)) {
    return {
      ok: false,
      code: 'QUERY_MULTIPLE_STATEMENTS',
      message: MESSAGES.queryMultipleStatements,
    }
  }
  const clause = findBlockedClause(tokens)
  if (clause !== null) {
    return {
      ok: false,
      code: 'QUERY_WRITE_BLOCKED',
      message: MESSAGES.queryWriteBlocked(clause),
      clause,
    }
  }
  return { ok: true }
}

/** Nomes dos `$parametros`, sem repetição, na ordem em que aparecem. */
export function extractParameterNames(cypher: string): string[] {
  const names: string[] = []
  for (const token of tokenize(cypher)) {
    if (token.type === 'param' && !names.includes(token.value)) {
      names.push(token.value)
    }
  }
  return names
}
