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
  | { type: 'word'; value: string; afterDot: boolean }
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

const WORD_START = /[A-Za-z_]/
const WORD_PART = /[A-Za-z0-9_]/

/** Pula strings, comentários e identificadores entre crases; devolve o que sobra. */
function tokenize(cypher: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  let lastWasDot = false
  const push = (token: Token, isDot = false) => {
    tokens.push(token)
    lastWasDot = isDot
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
      push({ type: 'word', value: cypher.slice(i, j), afterDot: lastWasDot })
      i = j
    } else {
      i++
      push({ type: 'symbol', value: ch }, ch === '.')
    }
  }
  return tokens
}

function hasSecondStatement(tokens: Token[]): boolean {
  const first = tokens.findIndex((token) => token.type === 'semicolon')
  return first !== -1 && first < tokens.length - 1
}

function findBlockedClause(tokens: Token[]): string | null {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] as Token
    if (token.type !== 'word' || token.afterDot) continue
    const upper = token.value.toUpperCase()
    if (BLOCKED_WORDS.has(upper)) return upper
    const following = tokens[i + 1]
    if (following?.type === 'word' && !following.afterDot) {
      const pair = `${upper} ${following.value.toUpperCase()}`
      if (BLOCKED_PAIRS.has(pair)) return pair
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
