import neo4j from 'neo4j-driver'
import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { toCypherParams } from '../../src/queries/cypher-params'
import { QueryService } from '../../src/queries/query.service'
import { createConnection } from '../factories'
import { createTestApp } from '../harness'

let current: Awaited<ReturnType<typeof createTestApp>> | undefined

afterEach(async () => {
  await current?.close()
  current = undefined
})

async function setup() {
  const test = await createTestApp()
  current = test
  const connection = await createConnection(
    test.db,
    test.app.get(CryptoService),
  )
  test.neo4j.whenRead('RETURN', [{ x: 1 }])
  const run = (cypher: string, params?: Record<string, unknown>) =>
    test.app.get(QueryService).run({
      userId: 'u',
      connectionId: connection.id,
      cypher,
      params,
    })
  const lastParams = () =>
    test.neo4j.calls.filter((c) => c.method === 'read').at(-1)?.params
  return { run, lastParams }
}

describe('toCypherParams', () => {
  it('FLT-11 parâmetro vazio chega ao Neo4j como null', async () => {
    expect(toCypherParams({ uf: null })).toEqual({ uf: null })
    const t = await setup()
    await t.run('MATCH (n) WHERE n.uf = $uf RETURN n')
    expect(t.lastParams()).toEqual({ uf: null })
  })

  it('FLT-12 lista de valores chega ao Neo4j como lista', async () => {
    expect(toCypherParams({ c: ['Eletrônicos', 'Livros'] })).toEqual({
      c: ['Eletrônicos', 'Livros'],
    })
    const converted = toCypherParams({ anos: [2024, 2025] }).anos as unknown[]
    expect(converted).toHaveLength(2)
    expect(converted.every((v) => neo4j.isInt(v))).toBe(true)
    expect(converted.map(String)).toEqual(['2024', '2025'])

    const t = await setup()
    await t.run('MATCH (n) WHERE n.c IN $c RETURN n', {
      c: ['Eletrônicos', 'Livros'],
    })
    expect(t.lastParams()).toEqual({ c: ['Eletrônicos', 'Livros'] })
  })

  it('FLT-13 datas do intervalo chegam como datas do Cypher', async () => {
    const t = await setup()
    await t.run(
      'MATCH (n) WHERE n.d >= $periodo_inicio AND n.d <= $periodo_fim RETURN n',
      {
        periodo_inicio: { kind: 'date', value: '2025-01-01' },
        periodo_fim: null,
      },
    )
    const params = t.lastParams() as Record<string, unknown>
    expect(neo4j.isDate(params.periodo_inicio)).toBe(true)
    expect(String(params.periodo_inicio)).toBe('2025-01-01')
    expect(params.periodo_fim).toBeNull()
  })

  it('FLT-12 inteiro vira Integer e decimal fica decimal', () => {
    const out = toCypherParams({ a: 10, b: 10.5, c: 'x', d: true })
    expect(neo4j.isInt(out.a)).toBe(true)
    expect(String(out.a)).toBe('10')
    expect(out.b).toBe(10.5)
    expect(out.c).toBe('x')
    expect(out.d).toBe(true)
  })
})
