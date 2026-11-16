import neo4j from 'neo4j-driver'
import { describe, expect, it } from 'vitest'
import { Neo4jGatewayError } from '../../src/neo4j/neo4j.gateway'
import { SchemaReader } from '../../src/schema/schema-reader'
import { FakeNeo4jGateway } from '../fakes/fake-neo4j.gateway'
import { programSchema } from '../fakes/schema-fixture'

const cfg = {
  uri: 'bolt://h',
  database: null,
  username: 'neo4j',
  password: 'segredo',
}

function setup() {
  const fake = new FakeNeo4jGateway()
  const reader = new SchemaReader(fake)
  const read = () =>
    reader.read(cfg, {
      deadline: Date.now() + 5000,
      signal: new AbortController().signal,
    })
  return { fake, read }
}

describe('leitor de schema', () => {
  it('SCH-02 cada label guarda as propriedades com todos os tipos', async () => {
    const { fake, read } = setup()
    programSchema(fake, {
      nodes: [
        {
          labels: ['Pessoa', 'Cliente'],
          properties: [{ name: 'nome', types: ['String'] }],
        },
        {
          labels: ['Cliente'],
          properties: [{ name: 'codigo', types: ['String'] }],
        },
        {
          labels: ['Cliente'],
          properties: [{ name: 'codigo', types: ['Long'] }],
        },
        { labels: ['Vazio'], properties: [] },
      ],
    })

    const schema = await read()

    const byName = Object.fromEntries(
      schema.labels.map((label) => [
        label.name,
        label.properties.map((p) => [p.name, p.types]),
      ]),
    )
    expect(byName).toEqual({
      Pessoa: [['nome', ['String']]],
      Cliente: [
        ['nome', ['String']],
        ['codigo', ['String', 'Long']],
      ],
      Vazio: [],
    })
  })

  it('SCH-03 cada tipo de relacionamento guarda as propriedades com todos os tipos', async () => {
    const { fake, read } = setup()
    programSchema(fake, {
      relationships: [
        {
          type: 'CONTEM',
          properties: [{ name: 'quantidade', types: ['Long'] }],
          patterns: [['Pedido', 'Produto']],
        },
        { type: 'FEZ', properties: [], patterns: [['Cliente', 'Pedido']] },
      ],
    })

    const schema = await read()

    expect(schema.relationshipTypes.map((type) => type.name)).toEqual([
      'CONTEM',
      'FEZ',
    ])
    expect(schema.relationshipTypes[0]?.properties).toEqual([
      { name: 'quantidade', types: ['Long'], example: null },
    ])
    expect(schema.relationshipTypes[1]?.properties).toEqual([])
  })

  it('SCH-04 exemplo é o primeiro valor não nulo inteiro', async () => {
    const { fake, read } = setup()
    const longText = 'texto '.repeat(1000)
    programSchema(fake, {
      nodes: [
        {
          labels: ['Cliente'],
          properties: [
            { name: 'bio', types: ['String'], example: longText },
            { name: 'idade', types: ['Long'], example: neo4j.int(41) },
            { name: 'apelido', types: ['String'] },
          ],
        },
      ],
      relationships: [
        {
          type: 'CONTEM',
          properties: [
            { name: 'quantidade', types: ['Long'], example: neo4j.int(3) },
          ],
          patterns: [['Pedido', 'Produto']],
        },
      ],
    })

    const schema = await read()

    const [cliente] = schema.labels
    expect(cliente?.properties).toEqual([
      { name: 'bio', types: ['String'], example: `'${longText}'` },
      { name: 'idade', types: ['Long'], example: '41' },
      { name: 'apelido', types: ['String'], example: null },
    ])
    expect(schema.relationshipTypes[0]?.properties[0]?.example).toBe('3')
    const exampleCall = fake.calls.find((call) =>
      call.cypher?.includes('UNWIND $props'),
    )
    expect(exampleCall?.cypher).toContain('IS NOT NULL')
    expect(exampleCall?.cypher).toContain('LIMIT 1')
    expect(exampleCall?.params).toEqual({ props: ['bio', 'idade', 'apelido'] })
  })

  it('SCH-05 tipo de relacionamento guarda os pares de origem e destino', async () => {
    const { fake, read } = setup()
    programSchema(fake, {
      relationships: [
        {
          type: 'FEZ',
          properties: [],
          patterns: [
            ['Cliente', 'Pedido'],
            ['Loja', 'Pedido'],
          ],
        },
        { type: 'TEM`CRASE', properties: [], patterns: [['A', 'B']] },
      ],
    })

    const schema = await read()

    expect(schema.relationshipTypes[0]).toMatchObject({
      name: 'FEZ',
      patterns: [
        { from: 'Cliente', to: 'Pedido' },
        { from: 'Loja', to: 'Pedido' },
      ],
    })
    expect(schema.relationshipTypes[1]?.name).toBe('TEM`CRASE')
    expect(
      fake.calls.some((call) => call.cypher?.includes('[:`TEM``CRASE`]')),
    ).toBe(true)
  })

  it('SCH-26 sem permissão nos procedimentos a leitura falha com a mensagem do Neo4j', async () => {
    const { fake, read } = setup()
    const message =
      'Neo.ClientError.Security.Forbidden: Permission denied for db.schema.nodeTypeProperties'
    fake.whenRead(
      'db.schema.nodeTypeProperties',
      new Neo4jGatewayError(message),
    )

    const error = await read().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(Neo4jGatewayError)
    expect((error as Error).message).toBe(message)
  })
})
