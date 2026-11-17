import type { ConnectionOptions, TypeCast } from 'mysql2'
import { describe, expect, it } from 'vitest'
import {
  type MysqlConnection,
  MysqlGateway,
  type MysqlRows,
  mysqlConnectionOptions,
  mysqlTypeCast,
} from '../../../src/sources/gateways/mysql.gateway'
import { SqlDateParam } from '../../../src/sources/gateways/sql.gateway'
import {
  SourceGatewayError,
  SourceTimeoutError,
} from '../../../src/sources/source'

const cfg = {
  host: 'db.exemplo.com',
  port: 3306,
  database: 'vendas',
  username: 'leitor',
  password: 'segredo',
  ssl: false,
}

interface Script {
  fields?: string[]
  rows?: unknown[][]
  hang?: boolean
  fail?: Error
}

/** Conexão falsa que registra as instruções enviadas e simula o fluxo de linhas. */
class FakeMysqlConnection implements MysqlConnection {
  readonly log: string[] = []
  values: unknown[] = []
  ended = false
  destroyed = false
  delivered = 0

  constructor(
    readonly options: ConnectionOptions,
    private readonly script: Script,
  ) {}

  async connect(): Promise<void> {
    this.log.push('CONNECT')
  }

  async query(sql: string): Promise<void> {
    this.log.push(sql)
  }

  stream(sql: string, values: unknown[]): MysqlRows {
    this.log.push(sql)
    this.values = values
    const script = this.script
    const connection = this
    async function* rows(): AsyncGenerator<unknown[]> {
      if (script.hang) await new Promise(() => undefined)
      if (script.fail) throw script.fail
      for (const row of script.rows ?? []) {
        connection.delivered++
        yield row
      }
    }
    return { fields: () => this.script.fields ?? [], rows: rows() }
  }

  async end(): Promise<void> {
    this.log.push('END')
    this.ended = true
  }

  destroy(): void {
    this.log.push('DESTROY')
    this.destroyed = true
  }
}

function gatewayWith(script: Script) {
  const connections: FakeMysqlConnection[] = []
  const gateway = new MysqlGateway((options) => {
    const connection = new FakeMysqlConnection(options, script)
    connections.push(connection)
    return connection
  })
  return { gateway, connections }
}

const opts = { timeoutMs: 30_000, maxRows: 5_001 }

/** Chama o `typeCast` como o `mysql2` chama, com o valor que o `next()` daria. */
function cast(type: string, raw: unknown): unknown {
  const typeCast = mysqlConnectionOptions(cfg, 1000).typeCast as Exclude<
    TypeCast,
    boolean
  >
  return typeCast({ type } as Parameters<typeof typeCast>[0], () => raw)
}

describe('gateway do MySQL', () => {
  it('SQX-03 MySQL consulta termina em ROLLBACK e fecha a conexão', async () => {
    const { gateway, connections } = gatewayWith({
      fields: ['n'],
      rows: [[1]],
    })

    const result = await gateway.read(cfg, 'SELECT ? AS n', [1], opts)

    expect(result).toEqual({ keys: ['n'], rows: [[1]] })
    expect(connections[0]?.log.slice(-2)).toEqual(['ROLLBACK', 'END'])

    // Também quando a consulta falha: erro do banco, ROLLBACK e fechamento.
    const failing = gatewayWith({
      fail: Object.assign(new Error("Table 'vendas.x' doesn't exist"), {
        code: 'ER_NO_SUCH_TABLE',
        errno: 1146,
      }),
    })
    const error = await failing.gateway
      .read(cfg, 'SELECT * FROM x', [], opts)
      .catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(SourceGatewayError)
    expect((error as SourceGatewayError).message).toBe(
      "Table 'vendas.x' doesn't exist",
    )
    expect((error as SourceGatewayError).code).toBe('1146')
    expect(failing.connections[0]?.log.slice(-2)).toEqual(['ROLLBACK', 'END'])

    // Erro de rede segue com o código de rede (SQX-26).
    const dropped = gatewayWith({
      fail: Object.assign(new Error('read ECONNRESET'), {
        code: 'ECONNRESET',
        errno: -4077,
      }),
    })
    const network = await dropped.gateway
      .read(cfg, 'SELECT 1', [], opts)
      .catch((caught: unknown) => caught)
    expect((network as SourceGatewayError).code).toBe('ECONNRESET')

    // O teste da conexão também fecha a conexão.
    const verifying = gatewayWith({})
    await verifying.gateway.verify(cfg, { timeoutMs: 10_000 })
    expect(verifying.connections[0]?.log).toEqual([
      'CONNECT',
      'SELECT 1',
      'END',
    ])
  })

  it('SQX-04 MySQL abre a transação em modo leitura', async () => {
    const { gateway, connections } = gatewayWith({ fields: ['n'], rows: [[1]] })

    await gateway.read(
      cfg,
      'SELECT * FROM t WHERE d = ? AND id = ?',
      [new SqlDateParam('2024-01-15'), 7],
      opts,
    )

    const log = connections[0]?.log ?? []
    const begin = log.indexOf('START TRANSACTION READ ONLY')
    expect(begin).toBeGreaterThan(0)
    expect(
      log.indexOf('SELECT * FROM t WHERE d = ? AND id = ?'),
    ).toBeGreaterThan(begin)
    // A data vai ao MySQL como o texto `AAAA-MM-DD` (SQX-20).
    expect(connections[0]?.values).toEqual(['2024-01-15', 7])
  })

  it('SQX-10 MySQL aplica o prazo e cancela ao estourar', async () => {
    const { gateway, connections } = gatewayWith({ hang: true })
    const started = Date.now()

    await expect(
      gateway.read(cfg, 'SELECT SLEEP(60)', [], { timeoutMs: 80 }),
    ).rejects.toBeInstanceOf(SourceTimeoutError)

    expect(Date.now() - started).toBeLessThan(2000)
    const connection = connections[0]
    expect(connection?.log).toContain('SET SESSION max_execution_time = 80')
    expect(connection?.destroyed).toBe(true)
    expect(connection?.log).not.toContain('ROLLBACK')

    // O sinal de cancelamento também encerra a consulta.
    const aborted = gatewayWith({ hang: true })
    const abort = new AbortController()
    const reading = aborted.gateway.read(cfg, 'SELECT SLEEP(60)', [], {
      timeoutMs: 30_000,
      signal: abort.signal,
    })
    abort.abort()
    await expect(reading).rejects.toBeInstanceOf(SourceTimeoutError)
    expect(aborted.connections[0]?.destroyed).toBe(true)

    // O prazo vencido do lado do banco (ER_QUERY_TIMEOUT) também é prazo.
    const server = gatewayWith({
      fail: Object.assign(
        new Error(
          'Query execution was interrupted, maximum statement execution time exceeded',
        ),
        { code: 'ER_QUERY_TIMEOUT', errno: 3024 },
      ),
    })
    await expect(
      server.gateway.read(cfg, 'SELECT 1', [], opts),
    ).rejects.toBeInstanceOf(SourceTimeoutError)
  })

  it('SQX-11 MySQL para a leitura em maxRows', async () => {
    const rows = Array.from({ length: 10_000 }, (_, i) => [i])
    const { gateway, connections } = gatewayWith({ fields: ['i'], rows })

    const result = await gateway.read(cfg, 'SELECT i FROM t', [], {
      timeoutMs: 30_000,
      maxRows: 1_201,
    })

    expect(result.rows).toHaveLength(1_201)
    expect(result.rows.at(-1)).toEqual([1_200])
    const connection = connections[0]
    // Para de consumir o fluxo no limite e derruba a conexão com o resto.
    expect(connection?.delivered).toBe(1_201)
    expect(connection?.destroyed).toBe(true)
  })

  it('SQX-21 MySQL converte data, data com hora e decimal', async () => {
    expect(cast('DATE', '2024-01-15')).toBe('2024-01-15')
    expect(cast('DATETIME', '2024-01-15 10:30:00')).toBe('2024-01-15T10:30:00')
    expect(cast('DATETIME', '2024-01-15 10:30:00.250')).toBe(
      '2024-01-15T10:30:00.250',
    )
    expect(cast('TIMESTAMP', '2024-01-15 10:30:00')).toBe(
      '2024-01-15T10:30:00Z',
    )
    expect(cast('NEWDECIMAL', '19.90')).toBe(19.9)
    expect(cast('NEWDECIMAL', '12345678901234567890.123')).toBe(
      '12345678901234567890.123',
    )
    expect(cast('LONGLONG', '9007199254740993')).toBe(9007199254740993n)
    expect(cast('LONGLONG', 42)).toBe(42)
    expect(cast('DATETIME', null)).toBeNull()
    expect(cast('VAR_STRING', 'texto')).toBe('texto')
    expect(mysqlTypeCast).toBe(mysqlConnectionOptions(cfg, 1).typeCast)

    // A sessão lê TIMESTAMP em UTC.
    const { gateway, connections } = gatewayWith({
      fields: [
        'dia',
        'quando',
        'instante',
        'preco',
        'grande',
        'arquivo',
        'dados',
        'nada',
      ],
      rows: [
        [
          '2024-01-15',
          '2024-01-15T10:30:00',
          '2024-01-15T10:30:00Z',
          19.9,
          9007199254740993n,
          Buffer.from([1, 2, 3]),
          { a: 1 },
          null,
        ],
      ],
    })
    const result = await gateway.read(cfg, 'SELECT * FROM tipos', [], opts)
    expect(connections[0]?.log).toContain("SET SESSION time_zone = '+00:00'")
    expect(result.rows).toEqual([
      [
        '2024-01-15',
        '2024-01-15T10:30:00',
        '2024-01-15T10:30:00Z',
        19.9,
        { kind: 'bigint', value: '9007199254740993' },
        '<binário 3 bytes>',
        { kind: 'json', value: '{"a":1}' },
        null,
      ],
    ])
    const options = mysqlConnectionOptions(cfg, 1000)
    expect(options).toMatchObject({
      dateStrings: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
    })
  })

  it('SRC-12 MySQL com SSL criptografa e valida o certificado', () => {
    const options = mysqlConnectionOptions({ ...cfg, ssl: true }, 10_000)

    expect(options.ssl).toEqual({ rejectUnauthorized: true })
    expect(options).toMatchObject({
      host: 'db.exemplo.com',
      port: 3306,
      database: 'vendas',
      user: 'leitor',
      password: 'segredo',
    })
  })

  it('SRC-13 MySQL sem SSL abre a conexão sem criptografia', () => {
    const options = mysqlConnectionOptions({ ...cfg, ssl: false }, 10_000)

    expect('ssl' in options).toBe(false)
  })
})
