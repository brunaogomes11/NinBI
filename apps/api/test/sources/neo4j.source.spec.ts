import neo4j from 'neo4j-driver'
import { describe, expect, it } from 'vitest'
import { toCypherParams } from '../../src/queries/cypher-params'
import { extractParameterNames } from '../../src/queries/read-only-cypher'
import { toResultValue } from '../../src/queries/result-value'
import { Neo4jSource } from '../../src/sources/neo4j.source'
import type { SourceConnection } from '../../src/sources/source'
import { FakeNeo4jGateway } from '../fakes/fake-neo4j.gateway'

const CONNECTION_ID = '00000000-0000-4000-8000-000000000001'

const row = {
  id: CONNECTION_ID,
  name: 'Grafo',
  type: 'NEO4J',
  uri: 'neo4j://grafo:7687',
  host: null,
  port: null,
  ssl: false,
  database: 'vendas',
  username: 'neo4j',
  passwordEncrypted: 'cifrada',
}

const conn: SourceConnection = {
  id: CONNECTION_ID,
  name: 'Grafo',
  type: 'NEO4J',
  uri: 'neo4j://grafo:7687',
  host: null,
  port: null,
  ssl: false,
  database: 'vendas',
  username: 'neo4j',
  password: 'segredo',
}

/**
 * O corpo do QueryService de antes da feature (validar, `null` nos parâmetros
 * sem valor, `toCypherParams`, gateway, `toResultValue`), copiado aqui porque a
 * T22 passou o serviço para o registro de fontes.
 */
// SPEC_DEVIATION: a T22 tocou este teste da T15: o construtor antigo do
// QueryService (com o gateway) deixou de existir; o caminho antigo vive aqui.
async function legacyQueryRun(
  gateway: FakeNeo4jGateway,
  cypher: string,
  input: Record<string, unknown>,
) {
  const params: Record<string, unknown> = {}
  for (const name of extractParameterNames(cypher)) params[name] = null
  Object.assign(params, input)
  const read = await gateway.read(
    {
      uri: row.uri,
      database: row.database,
      username: row.username,
      password: 'segredo',
    },
    cypher,
    toCypherParams(params),
    { timeoutMs: 30_000, maxRows: 5_001 },
  )
  return {
    columns: read.keys,
    rows: read.rows.map((r) => read.keys.map((key) => toResultValue(r[key]))),
  }
}

function program(gateway: FakeNeo4jGateway): void {
  gateway.whenRead('MATCH', {
    keys: ['nome', 'total', 'grande', 'dia', 'quando', 'tags', 'mapa', 'nada'],
    rows: [
      {
        nome: 'Ana',
        total: neo4j.int(42),
        grande: neo4j.int('9007199254740993'),
        dia: new neo4j.types.Date(2024, 3, 9),
        quando: new neo4j.types.DateTime(2024, 3, 9, 10, 30, 0, 0, 0),
        tags: ['a', 'b'],
        mapa: { x: neo4j.int(1) },
        nada: null,
      },
      {
        nome: 'Bia',
        total: 1.5,
        grande: neo4j.int(-3),
        dia: null,
        quando: null,
        tags: [],
        mapa: {},
        nada: true,
      },
    ],
  })
}

describe('fonte do Neo4j', () => {
  it('SMG-03 Neo4jSource devolve o mesmo resultado que o QueryService devolvia', async () => {
    const cypher =
      'MATCH (c:Cliente) WHERE c.uf = $uf AND c.desde >= $desde RETURN c'
    const params = {
      uf: 'SP',
      desde: { kind: 'date', value: '2024-01-01' },
      ids: [1, 2],
    }

    const before = new FakeNeo4jGateway()
    program(before)
    const expected = await legacyQueryRun(before, cypher, params)

    const after = new FakeNeo4jGateway()
    program(after)
    const source = new Neo4jSource(after)
    const result = await source.run(conn, cypher, params, {
      timeoutMs: 30_000,
      maxRows: 5_001,
    })

    expect(result.keys).toEqual(expected.columns)
    expect(result.rows).toEqual(expected.rows)
    // O gateway recebe a mesma configuração e os mesmos parâmetros convertidos.
    expect(
      after.calls.map(({ cfg, cypher, params }) => ({ cfg, cypher, params })),
    ).toEqual(
      before.calls.map(({ cfg, cypher, params }) => ({ cfg, cypher, params })),
    )
    expect(after.calls[0]?.opts).toEqual({ timeoutMs: 30_000, maxRows: 5_001 })

    // O resto da fonte é o que existia: validador, parâmetros, dialeto e teste de conexão.
    expect(source.type).toBe('NEO4J')
    expect(source.language).toBe('CYPHER')
    expect(source.dialect).toBe('Cypher')
    expect(source.validate('MATCH (n) DELETE n')).toMatchObject({
      ok: false,
      code: 'QUERY_WRITE_BLOCKED',
    })
    expect(source.validate(cypher)).toEqual({ ok: true })
    expect(source.parameterNames(cypher)).toEqual(['uf', 'desde'])
    await source.verify(conn, { timeoutMs: 10_000 })
    expect(after.calls.at(-1)).toMatchObject({
      method: 'verify',
      cfg: {
        uri: 'neo4j://grafo:7687',
        database: 'vendas',
        username: 'neo4j',
        password: 'segredo',
      },
    })
  })
})
