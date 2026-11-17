import { Logger } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../src/common/app-error'
import { loadQueryLimits } from '../../src/config/env'
import { CryptoService } from '../../src/crypto/crypto.service'
import {
  QUERY_MAX_ROWS,
  QUERY_TIMEOUT_MS,
  QueryService,
} from '../../src/queries/query.service'
import { SourceGatewayError } from '../../src/sources/source'
import { createConnection, createDashboard } from '../factories'
import { createTestApp } from '../harness'
import { signInAs } from '../support/sign-in'

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
  const crypto = test.app.get(CryptoService)
  const connection = await createConnection(test.db, crypto, {
    name: 'Vendas SQL',
    type: 'POSTGRES',
    host: 'pg.exemplo',
    port: 5432,
    database: 'vendas',
    username: 'leitor',
  })
  const service = test.app.get(QueryService)
  const run = (
    query: string,
    extra: { params?: Record<string, unknown>; maskErrors?: boolean } = {},
  ) =>
    service.run({
      userId: 'user-1',
      connectionId: connection.id,
      cypher: query,
      widgetId: 'widget-1',
      ...extra,
    })
  return { ...test, connection, service, run, pg: test.sql.POSTGRES }
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

describe('QueryService com conexão SQL', () => {
  it('SQX-10 consulta que passa de 30 s mostra o tempo limite', async () => {
    expect(loadQueryLimits({}).timeoutMs).toBe(30_000)
    const t = await setup([{ provide: QUERY_TIMEOUT_MS, useValue: 1_000 }])
    t.pg.whenRead('SELECT', 'hang')
    const started = Date.now()
    const error = await failure(t.run('SELECT pg_sleep(60)'))
    expect(Date.now() - started).toBeLessThan(3_000)
    expect(error.status).toBe(422)
    expect(error.code).toBe('QUERY_TIMEOUT')
    expect(error.message).toBe('A consulta excedeu o tempo limite de 1 s')
    expect(t.pg.calls[0]?.opts?.timeoutMs).toBe(1_000)
  })

  it('SQX-11 resultado acima de 5.000 linhas devolve as primeiras e avisa', async () => {
    expect(loadQueryLimits({}).maxRows).toBe(5_000)
    const t = await setup([{ provide: QUERY_MAX_ROWS, useValue: 3 }])
    t.pg.whenRead('FROM pedidos', [{ i: 1 }, { i: 2 }, { i: 3 }, { i: 4 }])
    const result = await t.run('SELECT i FROM pedidos')
    expect(t.pg.calls[0]?.opts?.maxRows).toBe(4)
    expect(result).toEqual({
      columns: ['i'],
      rows: [[1], [2], [3]],
      truncated: true,
      rowLimit: 3,
    })

    t.pg.whenRead('FROM pedidos', [{ i: 1 }, { i: 2 }, { i: 3 }])
    const exact = await t.run('SELECT i FROM pedidos')
    expect(exact.truncated).toBe(false)
    expect(exact.rows).toHaveLength(3)
  })

  it('SQX-13 erro do banco SQL aparece a quem edita e genérico a quem só vê', async () => {
    const t = await setup()
    t.pg.whenRead(
      'FROM nada',
      new SourceGatewayError('relation "nada" does not exist', '42P01'),
    )
    const plain = await failure(t.run('SELECT * FROM nada'))
    expect(plain.status).toBe(422)
    expect(plain.code).toBe('QUERY_FAILED')
    expect(plain.message).toBe('relation "nada" does not exist')

    const masked = await failure(
      t.run('SELECT * FROM nada', { maskErrors: true }),
    )
    expect(masked.code).toBe('QUERY_FAILED')
    expect(masked.message).toBe('Não foi possível carregar este widget')

    const blocked = await failure(
      t.run('DELETE FROM clientes', { maskErrors: true }),
    )
    expect(blocked.status).toBe(400)
    expect(blocked.message).toBe('Não foi possível carregar este widget')
  })

  it('SQX-14 banco SQL inacessível mostra o nome da conexão', async () => {
    const t = await setup()
    t.pg.whenRead(
      'SELECT',
      new SourceGatewayError(
        'connect ECONNREFUSED 10.0.0.1:5432',
        'ECONNREFUSED',
      ),
    )
    const error = await failure(t.run('SELECT 1'))
    expect(error.status).toBe(422)
    expect(error.code).toBe('SOURCE_UNAVAILABLE')
    expect(error.message).toBe('Não foi possível conectar ao banco Vendas SQL')
  })

  it('SQX-17 QueryService executa $nome sem valor com null', async () => {
    const t = await setup()
    t.pg.whenRead('FROM clientes', [{ n: 1 }])
    await t.run('SELECT * FROM clientes WHERE cidade = $cidade')
    await t.run('SELECT * FROM clientes WHERE cidade = $cidade', {
      params: { cidade: 'Recife' },
    })
    expect(t.pg.calls.map((call) => call.values)).toEqual([[null], ['Recife']])
    expect(t.pg.reads[0]).toBe('SELECT * FROM clientes WHERE cidade = $1')
    expect(t.neo4j.calls).toEqual([])
  })

  it('SQX-24 log de execução traz o tipo e não traz as linhas', async () => {
    const t = await setup()
    const lines: string[] = []
    vi.spyOn(Logger.prototype, 'log').mockImplementation((message: unknown) => {
      lines.push(String(message))
    })
    t.pg.whenRead('segredo', [{ nome: 'Ana Secreta' }, { nome: 'Bia Oculta' }])
    await t.run("SELECT nome FROM clientes WHERE x = 'segredo'")
    await failure(t.run('DELETE FROM clientes'))
    const queryLines = lines.filter((line) => line.startsWith('query '))
    expect(queryLines).toHaveLength(2)
    expect(queryLines[0]).toMatch(
      new RegExp(
        `^query user=user-1 connection=${t.connection.id} type=POSTGRES widget=widget-1 durationMs=\\d+ rows=2 result=ok$`,
      ),
    )
    expect(queryLines[1]).toContain('type=POSTGRES')
    expect(queryLines[1]).toContain('result=blocked')
    for (const line of queryLines) {
      expect(line).not.toContain('Ana Secreta')
      expect(line).not.toContain('Bia Oculta')
      expect(line).not.toContain('segredo')
      expect(line).not.toContain('SELECT')
    }
  })

  it('SQX-25 SQL enviado como texto por quem não edita responde 403', async () => {
    const t = await setup()
    const owner = await signInAs(t.app, t.db, 'EDITOR', 'dono@x.com')
    const dashboard = await createDashboard(t.db, {
      ownerId: owner.user.id,
      connectionId: t.connection.id,
    })
    const viewer = await signInAs(t.app, t.db, 'VIEWER', 'vis@x.com')
    t.shares.grant(viewer.user.id, dashboard.id, 'view')
    t.pg.whenRead('FROM clientes', [{ nome: 'Ana' }])

    const res = await viewer.agent
      .post(`/api/dashboards/${dashboard.id}/query`)
      .send({ cypher: 'SELECT nome FROM clientes' })
    expect(res.status).toBe(403)
    expect(t.pg.calls).toEqual([])

    const ok = await owner.agent
      .post(`/api/dashboards/${dashboard.id}/query`)
      .send({ cypher: 'SELECT nome FROM clientes' })
    expect(ok.status).toBe(200)
    expect(ok.body.rows).toEqual([['Ana']])
  })

  it('SMG-03 consulta Cypher passa pelo registro com o mesmo resultado', async () => {
    const t = await setup()
    const neo4jConnection = await createConnection(
      t.db,
      t.app.get(CryptoService),
      { name: 'Grafo' },
    )
    t.neo4j.whenRead('MATCH (l:Loja)', [{ nome: 'Centro' }, { nome: 'Norte' }])
    const result = await t.service.run({
      userId: 'user-1',
      connectionId: neo4jConnection.id,
      cypher: 'MATCH (l:Loja) WHERE l.uf = $uf RETURN l.nome AS nome',
    })
    expect(result).toEqual({
      columns: ['nome'],
      rows: [['Centro'], ['Norte']],
      truncated: false,
      rowLimit: 5000,
    })
    expect(t.neo4j.calls).toHaveLength(1)
    expect(t.neo4j.calls[0]?.params).toEqual({ uf: null })
    expect(t.neo4j.calls[0]?.cfg.uri).toBe('neo4j://vendas.exemplo:7687')
    for (const gateway of Object.values(t.sql)) {
      expect(gateway.calls).toEqual([])
    }

    const blocked = await failure(
      t.service.run({
        userId: 'user-1',
        connectionId: neo4jConnection.id,
        cypher: 'CREATE (n)',
      }),
    )
    expect(blocked.code).toBe('QUERY_WRITE_BLOCKED')
  })
})
