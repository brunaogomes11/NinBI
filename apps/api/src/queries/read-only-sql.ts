import {
  MAX_CYPHER_LENGTH,
  MESSAGES,
  type SqlToken as Token,
  tokenizeSql as tokenize,
} from '@ninbi/contracts'

export type QueryCheck =
  | { ok: true }
  | {
      ok: false
      code:
        | 'QUERY_TOO_LONG'
        | 'QUERY_NOT_SELECT'
        | 'QUERY_MULTIPLE_STATEMENTS'
        | 'QUERY_WRITE_BLOCKED'
      message: string
      clause?: string
    }

export const NOT_SELECT_MESSAGE =
  'Somente consultas de leitura são permitidas. Comece por SELECT ou WITH'

const READ_STARTS = new Set(['SELECT', 'WITH'])

const BLOCKED_WORDS = new Set([
  'INSERT',
  'UPDATE',
  'DELETE',
  'MERGE',
  'DROP',
  'ALTER',
  'CREATE',
  'TRUNCATE',
  'GRANT',
  'REVOKE',
  'EXEC',
  'EXECUTE',
  'CALL',
  'COPY',
  'SET',
  'DO',
  'INTO',
  'DECLARE',
  'WAITFOR',
  'OPENROWSET',
  'OPENQUERY',
  'LOCK',
])

function hasSecondStatement(tokens: Token[]): boolean {
  const first = tokens.findIndex((token) => token.type === 'semicolon')
  return first !== -1 && first < tokens.length - 1
}

function startsWithRead(tokens: Token[]): boolean {
  const first = tokens[0]
  return first?.type === 'word' && READ_STARTS.has(first.value.toUpperCase())
}

/** Palavra logo depois de `.` é parte de um nome qualificado (`t.update`), não uma cláusula. */
function isQualifiedPart(tokens: Token[], index: number): boolean {
  const before = tokens[index - 1]
  return before?.type === 'symbol' && before.value === '.'
}

function findBlockedClause(tokens: Token[]): string | null {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] as Token
    if (token.type !== 'word' || isQualifiedPart(tokens, i)) continue
    const upper = token.value.toUpperCase()
    if (upper === 'FOR') {
      const following = tokens[i + 1]
      if (
        following?.type === 'word' &&
        following.value.toUpperCase() === 'UPDATE'
      ) {
        return 'FOR UPDATE'
      }
      continue
    }
    if (BLOCKED_WORDS.has(upper)) return upper
  }
  return null
}

/**
 * Recusa, antes do banco, o SQL que não é uma única consulta de leitura.
 * Strings, comentários e identificadores entre aspas, `[]` ou crases ficam de
 * fora pelo `tokenizeSql`; uma palavra que é parte de um nome maior
 * (`created_at`) é um token só e não casa com as palavras bloqueadas.
 */
export function validateReadOnlySql(
  query: string,
  maxLength = MAX_CYPHER_LENGTH,
): QueryCheck {
  if (query.length > maxLength) {
    return {
      ok: false,
      code: 'QUERY_TOO_LONG',
      message: MESSAGES.cypherTooLong,
    }
  }
  const tokens = tokenize(query)
  if (hasSecondStatement(tokens)) {
    return {
      ok: false,
      code: 'QUERY_MULTIPLE_STATEMENTS',
      message: MESSAGES.queryMultipleStatements,
    }
  }
  if (!startsWithRead(tokens)) {
    return { ok: false, code: 'QUERY_NOT_SELECT', message: NOT_SELECT_MESSAGE }
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
