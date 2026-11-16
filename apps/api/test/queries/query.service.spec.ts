import { Logger } from '@nestjs/common'
import neo4j from 'neo4j-driver'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../src/common/app-error'
import { CryptoService } from '../../src/crypto/crypto.service'
import { Neo4jGatewayError } from '../../src/neo4j/neo4j.gateway'
import {
  QUERY_MAX_ROWS,
  QUERY_TIMEOUT_MS,
  QueryService,
} from '../../src/queries/query.service'
import { createConnection } from '../factories'
import { createTestApp } from '../harness'

let current: Awaited<ReturnType<typeof createTestApp>> | undefined

afterEach(async () => {
  vi.restoreAllMocks()
  await current?.close()
  current = undefined
})

async function setup(
  overrides: { provide: unknown; useValue: unknown }[] = [],
) {
  const test = await createTestApp({ overrides })
  current = test
  const connection = await createConnection(
    test.db,
    test.app.get(CryptoService),
    { name: 'Vendas' },
  )
  const service = test.app.get(QueryService)
  const run = (
    cypher: string,
    extra: { params?: Record<string, unknown>; maskErrors?: boolean } = {},
  ) =>
    service.run({
      userId: 'user-1',
      connectionId: connection.id,
      cypher,
      widgetId: 'widget-1',
      ...extra,
    })
  return { ...test, connection, service, run }
}

async function failure(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof AppError) return error
    throw error
  }
  throw new Error('esperava um AppError')
}

describe('QueryService', () => {
  it('QRY-02 Cypher de escrita não chega ao Neo4j', async () => {
    const t = await setup()
    const error = await failure(t.run('CREATE (n)'))
    expect(error.status).toBe(400)
    expect(error.code).toBe('QUERY_WRITE_BLOCKED')
    expect(error.message).toBe(
      'Somente consultas de leitura são permitidas. Cláusula bloqueada: CREATE',
    )
    expect(t.neo4j.calls).toEqual([])
  })

  it('QRY-06 recusa de escrita do Neo4j mostra Somente consultas de leitura são permitidas', async () => {
    const t = await setup()
    t.neo4j.whenRead(
      'createLabel',
      new Neo4jGatewayError(
        'Writing in read access mode not allowed.',
        'Neo.ClientError.Statement.AccessMode',
      ),
    )
    const error = await failure(t.run("CALL db.createLabel('X')"))
    expect(error.status).toBe(422)
    expect(error.code).toBe('QUERY_WRITE_BLOCKED')
    expect(error.message).toBe('Somente consultas de leitura são permitidas')
  })

  it('QRY-07 consulta que passa do prazo responde A consulta excedeu o tempo limite', async () => {
    const t = await setup([{ provide: QUERY_TIMEOUT_MS, useValue: 1_000 }])
    t.neo4j.whenRead('RETURN 1', 'hang')
    const started = Date.now()
    const error = await failure(t.run('RETURN 1'))
    expect(Date.now() - started).toBeLessThan(3_000)
    expect(error.status).toBe(422)
    expect(error.code).toBe('QUERY_TIMEOUT')
    expect(error.message).toBe('A consulta excedeu o tempo limite de 1 s')
  })

  it('QRY-07 prazo padrão é 30 s', async () => {
    const t = await setup()
    expect(t.app.get(QUERY_TIMEOUT_MS)).toBe(30_000)
    expect(t.app.get(QUERY_MAX_ROWS)).toBe(5_000)
    t.neo4j.whenRead('RETURN 1', [{ n: neo4j.int(1) }])
    const read = vi.spyOn(t.neo4j, 'read')
    await t.run('RETURN 1')
    expect(read).toHaveBeenCalledWith(
      expect.anything(),
      'RETURN 1',
      {},
      { timeoutMs: 30_000, maxRows: 5_001 },
    )
  })

  it('QRY-08 resultado com mais linhas que o limite devolve as primeiras e marca truncated', async () => {
    const t = await setup([{ provide: QUERY_MAX_ROWS, useValue: 3 }])
    t.neo4j.whenRead('UNWIND', [{ i: 1 }, { i: 2 }, { i: 3 }, { i: 4 }])
    const result = await t.run('UNWIND [1,2,3,4] AS i RETURN i')
    expect(result.rows).toEqual([[1], [2], [3]])
    expect(result.columns).toEqual(['i'])
    expect(result.truncated).toBe(true)
    expect(result.rowLimit).toBe(3)

    t.neo4j.whenRead('UNWIND', [{ i: 1 }, { i: 2 }, { i: 3 }])
    const exact = await t.run('UNWIND [1,2,3] AS i RETURN i')
    expect(exact.truncated).toBe(false)
    expect(exact.rows).toHaveLength(3)
  })

  it('QRY-10 parâmetro sem valor é enviado como null', async () => {
    const t = await setup()
    t.neo4j.whenRead('uf', [{ n: 1 }])
    await t.run('MATCH (n) WHERE n.uf = $uf RETURN n')
    await t.run('MATCH (n) WHERE n.uf = $uf RETURN n', {
      params: { uf: 'SP' },
    })
    expect(t.neo4j.calls.map((call) => call.params)).toEqual([
      { uf: null },
      { uf: 'SP' },
    ])
  })

  it('QRY-13 Neo4j inacessível mostra Não foi possível conectar ao banco', async () => {
    const t = await setup()
    t.neo4j.whenRead(
      'RETURN 1',
      new Neo4jGatewayError(
        'Could not perform discovery',
        'ServiceUnavailable',
      ),
    )
    const error = await failure(t.run('RETURN 1'))
    expect(error.status).toBe(422)
    expect(error.code).toBe('NEO4J_UNAVAILABLE')
    expect(error.message).toBe('Não foi possível conectar ao banco Vendas')
  })

  it('QRY-14 log de execução tem usuário, conexão, widget, duração, linhas e resultado sem as linhas', async () => {
    const t = await setup()
    const lines: string[] = []
    vi.spyOn(Logger.prototype, 'log').mockImplementation((message: unknown) => {
      lines.push(String(message))
    })
    t.neo4j.whenRead('segredo', [
      { nome: 'Ana Secreta' },
      { nome: 'Bia Oculta' },
    ])
    await t.run("MATCH (c) WHERE c.x = 'segredo' RETURN c.nome AS nome")
    await failure(t.run('CREATE (n)'))
    const queryLines = lines.filter((line) => line.startsWith('query '))
    expect(queryLines).toHaveLength(2)
    expect(queryLines[0]).toMatch(
      new RegExp(
        `^query user=user-1 connection=${t.connection.id} widget=widget-1 durationMs=\\d+ rows=2 result=ok$`,
      ),
    )
    expect(queryLines[1]).toContain('result=blocked')
    for (const line of queryLines) {
      expect(line).not.toContain('Ana Secreta')
      expect(line).not.toContain('Bia Oculta')
      expect(line).not.toContain('segredo')
      expect(line).not.toContain('MATCH')
    }
  })

  it('TBL-12 outro erro do Neo4j dá QUERY_FAILED com a mensagem original e, com maskErrors, a genérica', async () => {
    const t = await setup()
    t.neo4j.whenRead(
      'RETURN 1',
      new Neo4jGatewayError(
        'Variable `x` not defined',
        'Neo.ClientError.Statement.SyntaxError',
      ),
    )
    const plain = await failure(t.run('RETURN 1'))
    expect(plain.status).toBe(422)
    expect(plain.code).toBe('QUERY_FAILED')
    expect(plain.message).toBe('Variable `x` not defined')

    const masked = await failure(t.run('RETURN 1', { maskErrors: true }))
    expect(masked.code).toBe('QUERY_FAILED')
    expect(masked.message).toBe('Não foi possível carregar este widget')
  })
})
