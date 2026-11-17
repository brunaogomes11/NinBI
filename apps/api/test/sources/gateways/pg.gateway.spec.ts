import type pg from 'pg'
import { describe, expect, it } from 'vitest'
import {
  PG_TYPES,
  type PgClient,
  type PgCursor,
  type PgField,
  PgGateway,
  pgClientConfig,
} from '../../../src/sources/gateways/pg.gateway'
import { SqlDateParam } from '../../../src/sources/gateways/sql.gateway'
import {
  SourceGatewayError,
  SourceTimeoutError,
} from '../../../src/sources/source'

const cfg = {
  host: 'db.exemplo.com',
  port: 5432,
  database: 'vendas',
  username: 'leitor',
  password: 'segredo',
  ssl: false,
}

interface Script {
  fields?: PgField[]
  rows?: unknown[][]
  /** A leitura do cursor nunca responde. */
  hang?: boolean
  /** A consulta falha com este erro. */
  fail?: Error
  /** O fechamento nunca termina (servidor mudo). */
  endHangs?: boolean
}

/** Conexão falsa que registra as instruções enviadas e simula o cursor. */
class FakePgClient implements PgClient {
  readonly log: string[] = []
  values: unknown[] = []
  ended = false
  cursorClosed = false
  readSizes: number[] = []
  delivered = 0

  constructor(
    readonly config: pg.ClientConfig,
    private readonly script: Script,
  ) {}

  async connect(): Promise<void> {
    this.log.push('CONNECT')
  }

  async query(text: string): Promise<void> {
    this.log.push(text)
  }

  cursor(text: string, values: unknown[]): PgCursor {
    this.log.push(text)
    this.values = values
    const rows = this.script.rows ?? []
    let started = false
    return {
      read: (size) => {
        this.readSizes.push(size)
        if (this.script.hang) return new Promise(() => undefined)
        if (this.script.fail) return Promise.reject(this.script.fail)
        started = true
        const batch = rows.slice(this.delivered, this.delivered + size)
        this.delivered += batch.length
        return Promise.resolve(batch)
      },
      fields: () => (started ? (this.script.fields ?? []) : []),
      close: async () => {
        this.cursorClosed = true
      },
    }
  }

  end(): Promise<void> {
    this.log.push('END')
    this.ended = true
    return this.script.endHangs
      ? new Promise(() => undefined)
      : Promise.resolve()
  }
}

function gatewayWith(script: Script) {
  const clients: FakePgClient[] = []
  const gateway = new PgGateway((config) => {
    const client = new FakePgClient(config, script)
    clients.push(client)
    return client
  })
  return { gateway, clients }
}

const opts = { timeoutMs: 30_000, maxRows: 5_001 }
function parse(oid: number, text: string): unknown {
  const types = pgClientConfig(cfg, 1000).types
  if (!types) throw new Error('sem parsers de tipo')
  const parser = types.getTypeParser(oid, 'text') as (value: string) => unknown
  return parser(text)
}

describe('gateway do PostgreSQL', () => {
  it('SQX-03 PostgreSQL consulta termina em ROLLBACK e fecha a conexão', async () => {
    const { gateway, clients } = gatewayWith({
      fields: [{ name: 'n', dataTypeID: 23 }],
      rows: [[1]],
    })

    const result = await gateway.read(cfg, 'SELECT $1::int AS n', [1], opts)

    expect(result).toEqual({ keys: ['n'], rows: [[1]] })
    const [client] = clients
    expect(client?.log.at(-2)).toBe('ROLLBACK')
    expect(client?.log.at(-1)).toBe('END')
    expect(client?.cursorClosed).toBe(true)

    // Também quando a consulta falha: erro do banco, ROLLBACK e fechamento.
    const failing = gatewayWith({
      fail: Object.assign(new Error('relation "x" does not exist'), {
        code: '42P01',
      }),
    })
    const error = await failing.gateway
      .read(cfg, 'SELECT * FROM x', [], opts)
      .catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(SourceGatewayError)
    expect((error as SourceGatewayError).message).toBe(
      'relation "x" does not exist',
    )
    expect((error as SourceGatewayError).code).toBe('42P01')
    expect(failing.clients[0]?.log.slice(-2)).toEqual(['ROLLBACK', 'END'])

    // O teste da conexão também fecha a conexão.
    const verifying = gatewayWith({})
    await verifying.gateway.verify(cfg, { timeoutMs: 10_000 })
    expect(verifying.clients[0]?.log).toEqual(['CONNECT', 'SELECT 1', 'END'])
  })

  it('SQX-04 PostgreSQL abre a transação em modo leitura', async () => {
    const { gateway, clients } = gatewayWith({
      fields: [{ name: 'n', dataTypeID: 23 }],
      rows: [[1]],
    })

    await gateway.read(
      cfg,
      'SELECT * FROM t WHERE d = $1 AND id = $2',
      [new SqlDateParam('2024-01-15'), 7],
      opts,
    )

    const log = clients[0]?.log ?? []
    expect(log[0]).toBe('CONNECT')
    expect(log[1]).toBe('BEGIN TRANSACTION READ ONLY')
    expect(log.indexOf('SELECT * FROM t WHERE d = $1 AND id = $2')).toBe(3)
    // A data vai ao PostgreSQL como o texto `AAAA-MM-DD` (SQX-20).
    expect(clients[0]?.values).toEqual(['2024-01-15', 7])
  })

  it('SQX-10 PostgreSQL aplica o prazo e cancela ao estourar', async () => {
    const { gateway, clients } = gatewayWith({ hang: true, endHangs: true })
    const started = Date.now()

    await expect(
      gateway.read(cfg, 'SELECT pg_sleep(60)', [], { timeoutMs: 80 }),
    ).rejects.toBeInstanceOf(SourceTimeoutError)

    // Não espera o fechamento do servidor mudo.
    expect(Date.now() - started).toBeLessThan(2000)
    const client = clients[0]
    expect(client?.log[2]).toBe('SET LOCAL statement_timeout = 80')
    expect(client?.ended).toBe(true)
    expect(client?.log).not.toContain('ROLLBACK')

    // O sinal de cancelamento também encerra a consulta.
    const aborted = gatewayWith({ hang: true })
    const abort = new AbortController()
    const reading = aborted.gateway.read(cfg, 'SELECT pg_sleep(60)', [], {
      timeoutMs: 30_000,
      signal: abort.signal,
    })
    abort.abort()
    await expect(reading).rejects.toBeInstanceOf(SourceTimeoutError)
    expect(aborted.clients[0]?.ended).toBe(true)

    // O prazo vencido do lado do banco (57014) também é prazo.
    const server = gatewayWith({
      fail: Object.assign(
        new Error('canceling statement due to statement timeout'),
        { code: '57014' },
      ),
    })
    await expect(
      server.gateway.read(cfg, 'SELECT 1', [], opts),
    ).rejects.toBeInstanceOf(SourceTimeoutError)
  })

  it('SQX-11 PostgreSQL para a leitura em maxRows', async () => {
    const rows = Array.from({ length: 10_000 }, (_, i) => [i])
    const { gateway, clients } = gatewayWith({
      fields: [{ name: 'i', dataTypeID: 23 }],
      rows,
    })

    const result = await gateway.read(cfg, 'SELECT i FROM t', [], {
      timeoutMs: 30_000,
      maxRows: 1_201,
    })

    expect(result.rows).toHaveLength(1_201)
    expect(result.rows.at(-1)).toEqual([1_200])
    const client = clients[0]
    // Lê do cursor só o que precisa, em lotes, e não pede além do limite.
    expect(client?.delivered).toBe(1_201)
    expect(client?.readSizes.every((size) => size <= 500)).toBe(true)
    expect(client?.cursorClosed).toBe(true)
    expect(client?.log.slice(-2)).toEqual(['ROLLBACK', 'END'])
  })

  it('SQX-21 PostgreSQL converte data, data com hora e decimal', async () => {
    // Os parsers do cliente entregam data e hora como texto.
    expect(parse(PG_TYPES.DATE, '2024-01-15')).toBe('2024-01-15')
    expect(parse(PG_TYPES.TIMESTAMP, '2024-01-15 10:30:00')).toBe(
      '2024-01-15T10:30:00',
    )
    expect(parse(PG_TYPES.TIMESTAMP, '2024-01-15 10:30:00.123456')).toBe(
      '2024-01-15T10:30:00.123456',
    )
    expect(parse(PG_TYPES.TIMESTAMPTZ, '2024-01-15 07:30:00-03')).toBe(
      '2024-01-15T10:30:00Z',
    )
    expect(parse(PG_TYPES.TIMESTAMPTZ, '2024-01-15 23:30:00.25+05:30')).toBe(
      '2024-01-15T18:00:00.25Z',
    )
    expect(parse(PG_TYPES.NUMERIC, '12345678901234567890.123')).toBe(
      '12345678901234567890.123',
    )
    expect(parse(PG_TYPES.INT8, '9007199254740993')).toBe(9007199254740993n)
    // `bytea` segue o parser do `pg`, que entrega `Buffer`.
    expect(Buffer.isBuffer(parse(17, '\\x0102'))).toBe(true)

    // O gateway devolve os valores já em `ResultValue`.
    const { gateway } = gatewayWith({
      fields: [
        { name: 'dia', dataTypeID: PG_TYPES.DATE },
        { name: 'quando', dataTypeID: PG_TYPES.TIMESTAMP },
        { name: 'instante', dataTypeID: PG_TYPES.TIMESTAMPTZ },
        { name: 'preco', dataTypeID: PG_TYPES.NUMERIC },
        { name: 'enorme', dataTypeID: PG_TYPES.NUMERIC },
        { name: 'grande', dataTypeID: PG_TYPES.INT8 },
        { name: 'pequeno', dataTypeID: PG_TYPES.INT8 },
        { name: 'arquivo', dataTypeID: 17 },
        { name: 'dados', dataTypeID: 3802 },
        { name: 'id', dataTypeID: 2950 },
        { name: 'ativo', dataTypeID: 16 },
        { name: 'nada', dataTypeID: 25 },
      ],
      rows: [
        [
          '2024-01-15',
          '2024-01-15T10:30:00',
          '2024-01-15T10:30:00Z',
          '19.90',
          '12345678901234567890.123',
          9007199254740993n,
          42n,
          Buffer.from([1, 2, 3]),
          { a: 1 },
          '1b4e28ba-2fa1-11d2-883f-0016d3cca427',
          true,
          null,
        ],
      ],
    })

    const result = await gateway.read(cfg, 'SELECT * FROM tipos', [], opts)

    expect(result.rows).toEqual([
      [
        '2024-01-15',
        '2024-01-15T10:30:00',
        '2024-01-15T10:30:00Z',
        19.9,
        '12345678901234567890.123',
        { kind: 'bigint', value: '9007199254740993' },
        42,
        '<binário 3 bytes>',
        { kind: 'json', value: '{"a":1}' },
        '1b4e28ba-2fa1-11d2-883f-0016d3cca427',
        true,
        null,
      ],
    ])
  })

  it('SRC-12 PostgreSQL com SSL criptografa e valida o certificado', () => {
    const config = pgClientConfig({ ...cfg, ssl: true }, 10_000)

    expect(config.ssl).toEqual({ rejectUnauthorized: true })
    expect(config).toMatchObject({
      host: 'db.exemplo.com',
      port: 5432,
      database: 'vendas',
      user: 'leitor',
      password: 'segredo',
    })
  })

  it('SRC-13 PostgreSQL sem SSL abre a conexão sem criptografia', () => {
    expect(pgClientConfig({ ...cfg, ssl: false }, 10_000).ssl).toBe(false)
  })
})
