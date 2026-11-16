import { beforeAll, describe, expect, it } from 'vitest'
import { DriverNeo4jGateway } from '../src/neo4j/driver-neo4j.gateway'
import { SchemaReader } from '../src/schema/schema-reader'
import type { StoredSchema } from '../src/schema/types'

// Neo4j do docker-compose.dev.yml com o dataset "Varejo".
const cfg = {
  uri: 'bolt://localhost:7688',
  database: null,
  username: 'neo4j',
  password: 'ninbi-dev-password',
}
const gateway = new DriverNeo4jGateway()
let schema: StoredSchema

beforeAll(async () => {
  schema = await new SchemaReader(gateway).read(cfg, {
    deadline: Date.now() + 60_000,
    signal: new AbortController().signal,
  })
})

const label = (name: string) => schema.labels.find((l) => l.name === name)
const type = (name: string) =>
  schema.relationshipTypes.find((t) => t.name === name)

describe('leitor de schema contra o Varejo', () => {
  it('SCH-02 schema do Varejo traz os labels com propriedades e tipos', () => {
    expect(schema.labels.map((l) => l.name)).toEqual(
      expect.arrayContaining([
        'Loja',
        'Categoria',
        'Produto',
        'Cliente',
        'Pedido',
      ]),
    )
    const pedido = label('Pedido')
    expect(pedido?.properties.find((p) => p.name === 'data')?.types).toEqual([
      'Date',
    ])
    expect(pedido?.properties.map((p) => p.name)).toContain('valorTotal')
  })

  it('SCH-03 schema do Varejo traz CONTEM com quantidade', () => {
    expect(type('CONTEM')?.properties.map((p) => p.name)).toContain(
      'quantidade',
    )
  })

  it('SCH-04 exemplo do Varejo existe no banco', async () => {
    const example = label('Pedido')?.properties.find(
      (p) => p.name === 'codigo',
    )?.example
    expect(example).toMatch(/^'PED-\d{4}'$/)

    const result = await gateway.read(
      cfg,
      `MATCH (p:Pedido) WHERE p.codigo = ${example} RETURN count(p) AS total`,
      {},
      { timeoutMs: 10_000 },
    )
    expect(Number(String(result.rows[0]?.total))).toBeGreaterThanOrEqual(1)
  })

  it('SCH-05 Varejo liga Cliente a Pedido por FEZ', () => {
    expect(type('FEZ')?.patterns).toContainEqual({
      from: 'Cliente',
      to: 'Pedido',
    })
    expect(type('VENDIDO_EM')?.patterns).toContainEqual({
      from: 'Pedido',
      to: 'Loja',
    })
  })
})
