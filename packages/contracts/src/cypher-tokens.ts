import type { QueryLanguage } from './connections'
import { tokenizeSql } from './sql-tokens'

export type CypherToken =
  | { type: 'word'; value: string }
  | { type: 'param'; value: string }
  | { type: 'semicolon' }
  | { type: 'symbol'; value: string }

const WORD_START = /[A-Za-z_]/
const WORD_PART = /[A-Za-z0-9_]/

/** Pula strings, comentários e identificadores entre crases; devolve o que sobra. */
export function tokenizeCypher(cypher: string): CypherToken[] {
  const tokens: CypherToken[] = []
  let i = 0
  const push = (token: CypherToken) => {
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

/** Nomes dos `$parametros`, sem repetição, na ordem em que aparecem. */
export function extractParameterNames(
  query: string,
  language: QueryLanguage = 'CYPHER',
): string[] {
  const tokens = language === 'SQL' ? tokenizeSql(query) : tokenizeCypher(query)
  const names: string[] = []
  for (const token of tokens) {
    if (token.type === 'param' && !names.includes(token.value)) {
      names.push(token.value)
    }
  }
  return names
}
