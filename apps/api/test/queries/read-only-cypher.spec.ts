import { describe, expect, it } from 'vitest'
import {
  extractParameterNames,
  validateReadOnlyCypher,
} from '../../src/queries/read-only-cypher'

const blockedMessage = (clause: string) =>
  `Somente consultas de leitura são permitidas. Cláusula bloqueada: ${clause}`

describe('validateReadOnlyCypher', () => {
  it('QRY-02 recusa cada cláusula bloqueada com a mensagem', () => {
    const cases: [string, string][] = [
      ['CREATE (n)', 'CREATE'],
      ['MATCH (n) MERGE (m)', 'MERGE'],
      ['MATCH (n) DETACH DELETE n', 'DELETE'],
      ['MATCH (n) SET n.a = 1', 'SET'],
      ['MATCH (n) REMOVE n.a', 'REMOVE'],
      ['DROP INDEX i', 'DROP'],
      ['ALTER DATABASE x SET ACCESS READ ONLY', 'ALTER'],
      ['RENAME ROLE a TO b', 'RENAME'],
      ['GRANT ROLE a TO b', 'GRANT'],
      ['DENY MATCH {*} ON GRAPH * TO r', 'DENY'],
      ['REVOKE ROLE a FROM b', 'REVOKE'],
      ["LOAD CSV FROM 'x' AS l RETURN l", 'LOAD CSV'],
      ['MATCH (n) FOREACH (x IN [1] | RETURN x)', 'FOREACH'],
      ['CALL { MATCH (n) RETURN n } IN TRANSACTIONS', 'IN TRANSACTIONS'],
    ]
    for (const [cypher, clause] of cases) {
      const result = validateReadOnlyCypher(cypher)
      expect(result, cypher).toEqual({
        ok: false,
        code: 'QUERY_WRITE_BLOCKED',
        message: blockedMessage(clause),
        clause,
      })
    }
  })

  it('QRY-03 cláusulas bloqueadas sem diferenciar maiúsculas', () => {
    for (const cypher of [
      'create (n)',
      'Create (n)',
      "load csv from 'x' as l",
    ]) {
      const result = validateReadOnlyCypher(cypher)
      expect(result.ok, cypher).toBe(false)
    }
    expect(validateReadOnlyCypher('Create (n)')).toMatchObject({
      message: blockedMessage('CREATE'),
    })
    expect(validateReadOnlyCypher('load  csv from x')).toMatchObject({
      message: blockedMessage('LOAD CSV'),
    })
  })

  it('QRY-04 palavra bloqueada em string, comentário ou crases é aceita', () => {
    const accepted = [
      'RETURN "CREATE" AS texto',
      "RETURN 'it''s SET'",
      'RETURN "a\\"DELETE"',
      '// CREATE\nRETURN 1',
      '/* MERGE */ RETURN 1',
      'MATCH (n:`CREATE`) RETURN n',
      'MATCH (n:`a``DELETE`) RETURN n',
      'MATCH (n) RETURN n.set',
    ]
    for (const cypher of accepted) {
      expect(validateReadOnlyCypher(cypher), cypher).toEqual({ ok: true })
    }
  })

  it('QRY-04 palavra bloqueada como chave de mapa, alias ou lista é aceita', () => {
    const accepted = [
      'RETURN {set: 1} AS m',
      'RETURN {a: 1, create: 2} AS m',
      'WITH 1 AS set RETURN set',
      'MATCH (t) WHERE t.id IN transactions RETURN t',
      'MATCH (set) RETURN set.nome',
      'MATCH (n) WHERE n.id IN $ids AND set > 1 RETURN n',
      'MATCH (n:Create)-[:DELETE|MERGE]->(m) RETURN n',
      'MATCH (n) RETURN n {.set, .remove}',
      'MATCH (n) RETURN n.a AS delete, n.b AS merge',
    ]
    for (const cypher of accepted) {
      expect(validateReadOnlyCypher(cypher), cypher).toEqual({ ok: true })
    }
  })

  it('QRY-02 escrita em posição de cláusula continua recusada em subconsulta, depois de número e de fecha-chave', () => {
    const blocked: [string, string][] = [
      ['CALL { CREATE (n) } RETURN 1', 'CREATE'],
      ['CALL (x) { MERGE (n) } RETURN 1', 'MERGE'],
      ['MATCH (n) WHERE n.a = 1. CREATE (m) RETURN m', 'CREATE'],
      ['MATCH (n) WHERE n.a = 1.5 SET n.b = 2', 'SET'],
      ["MATCH (n) WHERE n.a = 'x' DELETE n", 'DELETE'],
      ['MATCH (n) WHERE EXISTS { MATCH (n) } SET n.a = 1', 'SET'],
      [
        'CALL { MATCH (n) RETURN n } IN TRANSACTIONS OF 10 ROWS',
        'IN TRANSACTIONS',
      ],
      [
        'CALL { MATCH (n) RETURN n } IN 3 CONCURRENT TRANSACTIONS',
        'IN TRANSACTIONS',
      ],
      ['UNWIND [1] AS x CREATE (n)', 'CREATE'],
    ]
    for (const [cypher, clause] of blocked) {
      expect(validateReadOnlyCypher(cypher), cypher).toMatchObject({
        ok: false,
        code: 'QUERY_WRITE_BLOCKED',
        clause,
      })
    }
  })

  it('QRY-05 mais de uma instrução é recusada', () => {
    expect(validateReadOnlyCypher('RETURN 1; RETURN 2')).toMatchObject({
      ok: false,
      code: 'QUERY_MULTIPLE_STATEMENTS',
      message: 'Envie uma consulta por vez',
    })
    expect(validateReadOnlyCypher('RETURN 1;')).toEqual({ ok: true })
    expect(validateReadOnlyCypher('RETURN 1; // fim')).toEqual({ ok: true })
    expect(validateReadOnlyCypher("RETURN ';'")).toEqual({ ok: true })
    expect(validateReadOnlyCypher('RETURN 1; CREATE (n)')).toMatchObject({
      code: 'QUERY_MULTIPLE_STATEMENTS',
    })
  })

  it('QRY-09 Cypher com mais de 20000 caracteres é recusado', () => {
    const padding = (n: number) => `RETURN '${'a'.repeat(n - 9)}'`
    expect(validateReadOnlyCypher(padding(20_000))).toEqual({ ok: true })
    expect(validateReadOnlyCypher(padding(20_001))).toMatchObject({
      ok: false,
      code: 'QUERY_TOO_LONG',
      message: 'A consulta passa de 20.000 caracteres',
    })
    const tooLongAndBlocked = `CREATE (n); ${'a'.repeat(20_001)}`
    expect(validateReadOnlyCypher(tooLongAndBlocked)).toMatchObject({
      code: 'QUERY_TOO_LONG',
    })
  })

  it('QRY-15 CREATE dentro de um nome maior é aceito', () => {
    const accepted = [
      'MATCH (n) RETURN n.created_at',
      "CALL db.createLabel('X')",
      'MATCH (n) WHERE n.resetting RETURN n',
      'MATCH (n) WHERE n.a = $create RETURN n',
    ]
    for (const cypher of accepted) {
      expect(validateReadOnlyCypher(cypher), cypher).toEqual({ ok: true })
    }
  })
})

describe('extractParameterNames', () => {
  it('QRY-10 lista os parâmetros sem repetição e na ordem em que aparecem', () => {
    expect(
      extractParameterNames(
        "MATCH (n) WHERE n.a = $loja AND n.b = $loja OR n.c = $ano RETURN '$texto'",
      ),
    ).toEqual(['loja', 'ano'])
  })
})
