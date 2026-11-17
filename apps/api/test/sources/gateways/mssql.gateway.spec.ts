import type sql from 'mssql'
import { describe, expect, it } from 'vitest'
import { SQLSERVER_DIALECT } from '../../../src/sources/dialects'
import {
  type MssqlColumn,
  MssqlGateway,
  type MssqlParam,
  type MssqlRequest,
  type MssqlSession,
  mssqlConfig,
  mssqlValue,
} from '../../../src/sources/gateways/mssql.gateway'
import { SqlDateParam } from '../../../src/sources/gateways/sql.gateway'
import {
  type SourceConnection,
  SourceGatewayError,
  SourceTimeoutError,
} from '../../../src/sources/source'
import { SqlSource } from '../../../src/sources/sql.source'

const cfg = {
  host: 'db.exemplo.com',
  port: 1433,
  database: 'vendas',
  username: 'leitor',
  password: 'segredo',
  ssl: false,
}

interface Script {
  columns?: MssqlColumn[]
  rows?: unknown[][]
  hang?: boolean
  fail?: Error
}

/** Sessão falsa que registra as instruções enviadas e simula o fluxo de linhas. */
class FakeMssqlSession implements MssqlSession {
  readonly log: string[] = []
  params: MssqlParam[] = []
  closed = false
  cancelled = false
  delivered = 0

  constructor(
    readonly config: sql.config,
    private readonly script: Script,
  ) {}

  async connect(): Promise<void> {
    this.log.push('CONNECT')
  }

  async begin(): Promise<void> {
    this.log.push('BEGIN TRANSACTION')
  }

  query(text: string, params: MssqlParam[]): MssqlRequest {
    this.log.push(text)
    this.params = params
    const script = this.script
    const session = this
    async function* rows(): AsyncGenerator<unknown[]> {
      if (script.hang) await new Promise(() => undefined)
      if (script.fail) throw script.fail
      for (const row of script.rows ?? []) {
        if (session.cancelled) return
        session.delivered++
        yield row
      }
    }
    return {
      columns: () => this.script.columns ?? [],
      rows: rows(),
      cancel: () => {
        this.log.push('CANCEL')
        this.cancelled = true
      },
      finished: async () => undefined,
    }
  }

  async rollback(): Promise<void> {
    this.log.push('ROLLBACK')
  }

  async close(): Promise<void> {
    this.log.push('CLOSE')
    this.closed = true
  }
}

function gatewayWith(script: Script) {
  const sessions: FakeMssqlSession[] = []
  const gateway = new MssqlGateway((config) => {
    const session = new FakeMssqlSession(config, script)
    sessions.push(session)
    return session
  })
  return { gateway, sessions }
}

const opts = { timeoutMs: 30_000, maxRows: 5_001 }

describe('gateway do SQL Server', () => {
  it('SQX-03 SQL Server consulta termina em ROLLBACK e fecha a conexão', async () => {
    const { gateway, sessions } = gatewayWith({
      columns: [{ name: 'n', type: 'int' }],
      rows: [[1]],
    })

    const result = await gateway.read(cfg, 'SELECT @p1 AS n', [1], opts)

    expect(result).toEqual({ keys: ['n'], rows: [[1]] })
    expect(sessions[0]?.log).toEqual([
      'CONNECT',
      'BEGIN TRANSACTION',
      'SELECT @p1 AS n',
      'ROLLBACK',
      'CLOSE',
    ])
    expect(sessions[0]?.params).toEqual([{ name: 'p1', value: 1 }])

    // Também quando a consulta falha: erro do banco, ROLLBACK e fechamento.
    const failing = gatewayWith({
      fail: Object.assign(new Error("Invalid object name 'x'."), {
        code: 'EREQUEST',
        number: 208,
      }),
    })
    const error = await failing.gateway
      .read(cfg, 'SELECT * FROM x', [], opts)
      .catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(SourceGatewayError)
    expect((error as SourceGatewayError).message).toBe(
      "Invalid object name 'x'.",
    )
    expect((error as SourceGatewayError).code).toBe('208')
    expect(failing.sessions[0]?.log.slice(-2)).toEqual(['ROLLBACK', 'CLOSE'])

    // Erro de conexão segue com o código do driver (SQX-26).
    const dropped = gatewayWith({
      fail: Object.assign(new Error('Connection lost - read ECONNRESET'), {
        code: 'ESOCKET',
      }),
    })
    const network = await dropped.gateway
      .read(cfg, 'SELECT 1', [], opts)
      .catch((caught: unknown) => caught)
    expect((network as SourceGatewayError).code).toBe('ESOCKET')

    // O teste da conexão também fecha a conexão.
    const verifying = gatewayWith({ rows: [[1]] })
    await verifying.gateway.verify(cfg, { timeoutMs: 10_000 })
    expect(verifying.sessions[0]?.log).toEqual(['CONNECT', 'SELECT 1', 'CLOSE'])
  })

  it('SQX-03 SQL Server não tem modo leitura e depende do ROLLBACK e do validador', async () => {
    const { gateway, sessions } = gatewayWith({
      columns: [{ name: 'n', type: 'int' }],
      rows: [[1]],
    })
    const source = new SqlSource('SQLSERVER', gateway, SQLSERVER_DIALECT)
    const conn: SourceConnection = {
      id: '00000000-0000-4000-8000-000000000003',
      name: 'Vendas',
      type: 'SQLSERVER',
      uri: null,
      host: 'db.exemplo.com',
      port: 1433,
      ssl: false,
      database: 'vendas',
      username: 'leitor',
      password: 'segredo',
    }

    await source.run(conn, 'SELECT 1 AS n', {}, opts)

    // A transação é comum (não há modo leitura) e termina em ROLLBACK mesmo com sucesso.
    const log = sessions[0]?.log ?? []
    expect(log).toContain('BEGIN TRANSACTION')
    expect(log.some((line) => /READ\s+ONLY/i.test(line))).toBe(false)
    expect(log.at(-2)).toBe('ROLLBACK')
    expect(log).not.toContain('COMMIT')
    // A escrita é barrada pelo validador antes de chegar ao banco.
    for (const write of [
      'DELETE FROM clientes',
      'SELECT * INTO copia FROM clientes',
      "EXEC xp_cmdshell 'dir'",
      'UPDATE clientes SET nome = 1',
    ]) {
      expect(source.validate(write).ok, write).toBe(false)
    }
  })

  it('SQX-10 SQL Server aplica o prazo e cancela ao estourar', async () => {
    const { gateway, sessions } = gatewayWith({ hang: true })
    const started = Date.now()

    await expect(
      gateway.read(cfg, "WAITFOR DELAY '00:01:00'", [], { timeoutMs: 80 }),
    ).rejects.toBeInstanceOf(SourceTimeoutError)

    expect(Date.now() - started).toBeLessThan(2000)
    const session = sessions[0]
    expect(session?.config.requestTimeout).toBe(80)
    expect(session?.log).toContain('CANCEL')
    expect(session?.closed).toBe(true)

    // O sinal de cancelamento também encerra a consulta.
    const aborted = gatewayWith({ hang: true })
    const abort = new AbortController()
    const reading = aborted.gateway.read(cfg, 'SELECT 1', [], {
      timeoutMs: 30_000,
      signal: abort.signal,
    })
    // Espera a consulta começar antes de cancelar.
    await new Promise((resolve) => setTimeout(resolve, 10))
    abort.abort()
    await expect(reading).rejects.toBeInstanceOf(SourceTimeoutError)
    expect(aborted.sessions[0]?.log).toContain('CANCEL')
    expect(aborted.sessions[0]?.closed).toBe(true)

    // O prazo da requisição vencido no driver (ETIMEOUT) também é prazo.
    const driver = gatewayWith({
      fail: Object.assign(new Error('Timeout: Request failed to complete'), {
        code: 'ETIMEOUT',
      }),
    })
    await expect(
      driver.gateway.read(cfg, 'SELECT 1', [], opts),
    ).rejects.toBeInstanceOf(SourceTimeoutError)
  })

  it('SQX-11 SQL Server para a leitura em maxRows', async () => {
    const rows = Array.from({ length: 10_000 }, (_, i) => [i])
    const { gateway, sessions } = gatewayWith({
      columns: [{ name: 'i', type: 'int' }],
      rows,
    })

    const result = await gateway.read(cfg, 'SELECT i FROM t', [], {
      timeoutMs: 30_000,
      maxRows: 1_201,
    })

    expect(result.rows).toHaveLength(1_201)
    expect(result.rows.at(-1)).toEqual([1_200])
    const session = sessions[0]
    expect(session?.delivered).toBe(1_201)
    // Cancela o resto no servidor e então desfaz e fecha.
    expect(session?.log.slice(-3)).toEqual(['CANCEL', 'ROLLBACK', 'CLOSE'])
  })

  it('SQX-21 SQL Server converte data, data com hora e decimal', async () => {
    const instant = new Date('2024-01-15T10:30:00.000Z')
    expect(mssqlValue(instant, 'datetimeoffset')).toBe('2024-01-15T10:30:00Z')
    expect(
      mssqlValue(new Date('2024-01-15T10:30:00.250Z'), 'datetimeoffset'),
    ).toBe('2024-01-15T10:30:00.250Z')
    expect(mssqlValue(instant, 'datetime')).toBe('2024-01-15T10:30:00')
    expect(mssqlValue(instant, 'datetime2')).toBe('2024-01-15T10:30:00')
    expect(mssqlValue(instant, 'smalldatetime')).toBe('2024-01-15T10:30:00')
    expect(mssqlValue(new Date('2024-01-15T00:00:00Z'), 'date')).toBe(
      '2024-01-15',
    )
    expect(mssqlValue('9007199254740993', 'bigint')).toBe(9007199254740993n)
    expect(mssqlValue(19.9, 'decimal')).toBe(19.9)
    // Limite do driver (AD-140, Assumptions da spec): o `tedious` entrega o
    // decimal como número, então mais de ~15 dígitos sai arredondado, não texto.
    // O valor como o driver o entrega para `12345678901234567.89`.
    const fromDriver = Number('12345678901234567.89')
    const rounded = mssqlValue(fromDriver, 'decimal')
    expect(typeof rounded).toBe('number')
    expect(String(rounded)).toBe('12345678901234568')
    expect(String(mssqlValue(fromDriver, 'numeric'))).toBe('12345678901234568')
    expect(mssqlValue(null, 'date')).toBeNull()
    // `useUTC` faz o driver ler a data sem fuso como gravada.
    expect(mssqlConfig(cfg, 1000).options?.useUTC).toBe(true)

    const { gateway, sessions } = gatewayWith({
      columns: [
        { name: 'dia', type: 'date' },
        { name: 'quando', type: 'datetime2' },
        { name: 'instante', type: 'datetimeoffset' },
        { name: 'preco', type: 'decimal' },
        { name: 'grande', type: 'bigint' },
        { name: 'pequeno', type: 'bigint' },
        { name: 'arquivo', type: 'varbinary' },
        { name: 'id', type: 'uniqueidentifier' },
        { name: 'ativo', type: 'bit' },
        { name: 'nada', type: 'nvarchar' },
      ],
      rows: [
        [
          new Date('2024-01-15T00:00:00Z'),
          new Date('2024-01-15T10:30:00Z'),
          new Date('2024-01-15T10:30:00Z'),
          19.9,
          '9007199254740993',
          '42',
          Buffer.from([1, 2, 3]),
          '1B4E28BA-2FA1-11D2-883F-0016D3CCA427',
          true,
          null,
        ],
      ],
    })

    const result = await gateway.read(
      cfg,
      'SELECT * FROM tipos WHERE dia >= @p1',
      [new SqlDateParam('2024-01-01')],
      opts,
    )

    expect(result.rows).toEqual([
      [
        '2024-01-15',
        '2024-01-15T10:30:00',
        '2024-01-15T10:30:00Z',
        19.9,
        { kind: 'bigint', value: '9007199254740993' },
        42,
        '<binário 3 bytes>',
        '1B4E28BA-2FA1-11D2-883F-0016D3CCA427',
        true,
        null,
      ],
    ])
    // `{ kind: 'date' }` chega ao banco como `sql.Date` (SQX-20).
    expect(sessions[0]?.params).toEqual([
      { name: 'p1', value: '2024-01-01', date: true },
    ])
  })

  it('SRC-12 SQL Server com SSL criptografa e valida o certificado', () => {
    const config = mssqlConfig({ ...cfg, ssl: true }, 10_000)

    expect(config.options).toMatchObject({
      encrypt: true,
      trustServerCertificate: false,
    })
    expect(config).toMatchObject({
      server: 'db.exemplo.com',
      port: 1433,
      database: 'vendas',
      user: 'leitor',
      password: 'segredo',
    })
  })

  it('SRC-13 SQL Server sem SSL abre a conexão sem criptografia', () => {
    expect(mssqlConfig({ ...cfg, ssl: false }, 10_000).options?.encrypt).toBe(
      false,
    )
  })
})
