import { Test } from '@nestjs/testing'
import { describe, expect, it } from 'vitest'
import { NEO4J_GATEWAY } from '../../src/neo4j/neo4j.gateway'
import {
  MYSQL_GATEWAY,
  POSTGRES_GATEWAY,
  SQLSERVER_GATEWAY,
} from '../../src/sources/gateways/sql.gateway'
import { Neo4jSource } from '../../src/sources/neo4j.source'
import { SourceRegistry } from '../../src/sources/source-registry'
import { SourcesModule } from '../../src/sources/sources.module'
import { SqlSource } from '../../src/sources/sql.source'
import { FakeNeo4jGateway } from '../fakes/fake-neo4j.gateway'
import { FakeSqlGateway } from '../fakes/fake-sql.gateway'

describe('módulo das fontes', () => {
  it('SRC-22 o módulo registra uma fonte para cada tipo de conexão', async () => {
    const postgres = new FakeSqlGateway()
    const moduleRef = await Test.createTestingModule({
      imports: [SourcesModule],
    })
      .overrideProvider(NEO4J_GATEWAY)
      .useValue(new FakeNeo4jGateway())
      .overrideProvider(POSTGRES_GATEWAY)
      .useValue(postgres)
      .overrideProvider(MYSQL_GATEWAY)
      .useValue(new FakeSqlGateway())
      .overrideProvider(SQLSERVER_GATEWAY)
      .useValue(new FakeSqlGateway())
      .compile()

    const registry = moduleRef.get(SourceRegistry)
    expect(registry.for('NEO4J')).toBeInstanceOf(Neo4jSource)
    for (const [type, dialect] of [
      ['POSTGRES', 'PostgreSQL'],
      ['MYSQL', 'MySQL'],
      ['SQLSERVER', 'T-SQL'],
    ] as const) {
      const source = registry.for(type)
      expect(source).toBeInstanceOf(SqlSource)
      expect(source.type).toBe(type)
      expect(source.dialect).toBe(dialect)
    }

    // A fonte usa o gateway do provider, que os testes trocam por um falso.
    postgres.whenRead('SELECT', [{ n: 1 }])
    await registry.for('POSTGRES').run(
      {
        id: 'c',
        name: 'Vendas',
        type: 'POSTGRES',
        uri: null,
        host: 'h',
        port: 5432,
        ssl: false,
        database: 'd',
        username: 'u',
        password: 'p',
      },
      'SELECT 1 AS n',
      {},
      { timeoutMs: 1000 },
    )
    expect(postgres.reads).toEqual(['SELECT 1 AS n'])
  })
})
