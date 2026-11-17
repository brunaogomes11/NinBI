import { describe, expect, it } from 'vitest'
import {
  MYSQL_DIALECT,
  POSTGRES_DIALECT,
  SQLSERVER_DIALECT,
} from '../../src/sources/dialects'
import { SqlDateParam } from '../../src/sources/gateways/sql.gateway'
import {
  type SourceConnection,
  SourceGatewayError,
  SourceTimeoutError,
  SourceUnavailableError,
} from '../../src/sources/source'
import { SqlSource } from '../../src/sources/sql.source'
import { FakeSqlGateway } from '../fakes/fake-sql.gateway'

const conn: SourceConnection = {
  id: '00000000-0000-4000-8000-000000000002',
  name: 'Vendas',
  type: 'POSTGRES',
  uri: null,
  host: 'db.exemplo.com',
  port: 5432,
  ssl: true,
  database: 'vendas',
  username: 'leitor',
  password: 'segredo',
}

const cfg = {
  host: 'db.exemplo.com',
  port: 5432,
  database: 'vendas',
  username: 'leitor',
  password: 'segredo',
  ssl: true,
}

const opts = { timeoutMs: 30_000, maxRows: 5_001 }

describe('fonte SQL', () => {
  it('SQX-26 erro de rede do driver é indisponibilidade', async () => {
    const gateway = new FakeSqlGateway()
    const source = new SqlSource('POSTGRES', gateway, POSTGRES_DIALECT)

    for (const code of [
      'ECONNRESET',
      'ETIMEDOUT',
      'ESOCKET',
      'ECONNREFUSED',
      'EPIPE',
      '08006',
      '08001',
    ]) {
      gateway.whenRead('SELECT', new SourceGatewayError(`caiu (${code})`, code))
      const error = await source
        .run(conn, 'SELECT 1', {}, opts)
        .catch((caught: unknown) => caught)
      expect(error, code).toBeInstanceOf(SourceUnavailableError)
      expect(error, code).toBeInstanceOf(SourceGatewayError)
      expect((error as SourceGatewayError).message).toBe(`caiu (${code})`)
      expect((error as SourceGatewayError).code).toBe(code)
    }

    // No teste da conexão e na leitura do schema também.
    gateway.whenVerify(new SourceGatewayError('recusada', 'ECONNREFUSED'))
    await expect(
      source.verify(conn, { timeoutMs: 10_000 }),
    ).rejects.toBeInstanceOf(SourceUnavailableError)
    gateway.whenRead(
      'pg_catalog',
      new SourceGatewayError('caiu no catálogo', 'ECONNRESET'),
    )
    await expect(
      source.readSchema(conn, {
        deadline: Date.now() + 10_000,
        signal: new AbortController().signal,
      }),
    ).rejects.toBeInstanceOf(SourceUnavailableError)

    // Erro do banco que não é de rede segue como erro da consulta.
    gateway.whenRead(
      'SELECT',
      new SourceGatewayError('erro de sintaxe', '42601'),
    )
    const syntax = await source
      .run(conn, 'SELECT 1', {}, opts)
      .catch((caught: unknown) => caught)
    expect(syntax).toBeInstanceOf(SourceGatewayError)
    expect(syntax).not.toBeInstanceOf(SourceUnavailableError)
    expect((syntax as SourceGatewayError).code).toBe('42601')

    // E o prazo continua sendo prazo.
    gateway.whenRead('SELECT', new SourceTimeoutError())
    await expect(source.run(conn, 'SELECT 1', {}, opts)).rejects.toBeInstanceOf(
      SourceTimeoutError,
    )
  })

  it('SQX-15 SqlSource envia ao gateway texto e valores separados', async () => {
    const query =
      "SELECT nome, nome FROM clientes WHERE uf = $uf AND id IN ($ids) AND criado >= $desde AND nota = '$uf' AND ($cidade IS NULL OR cidade = $cidade)"
    const params = {
      uf: "SP'; DROP TABLE clientes; --",
      ids: [1, 2],
      desde: { kind: 'date', value: '2024-01-15' },
      cidade: null,
    }
    const cases = [
      {
        source: new SqlSource(
          'POSTGRES',
          new FakeSqlGateway(),
          POSTGRES_DIALECT,
        ),
        text: "SELECT nome, nome FROM clientes WHERE uf = $1 AND id IN ($2, $3) AND criado >= $4 AND nota = '$uf' AND ((1 = 1) OR cidade = $5)",
      },
      {
        source: new SqlSource('MYSQL', new FakeSqlGateway(), MYSQL_DIALECT),
        text: "SELECT nome, nome FROM clientes WHERE uf = ? AND id IN (?, ?) AND criado >= ? AND nota = '$uf' AND ((1 = 1) OR cidade = ?)",
      },
      {
        source: new SqlSource(
          'SQLSERVER',
          new FakeSqlGateway(),
          SQLSERVER_DIALECT,
        ),
        text: "SELECT nome, nome FROM clientes WHERE uf = @p1 AND id IN (@p2, @p3) AND criado >= @p4 AND nota = '$uf' AND ((1 = 1) OR cidade = @p5)",
      },
    ]

    for (const { source, text } of cases) {
      const gateway = (source as unknown as { gateway: FakeSqlGateway }).gateway
      gateway.whenRead('FROM clientes', {
        keys: ['nome', 'nome'],
        rows: [['Ana', 'Ana']],
      })

      const result = await source.run(conn, query, params, opts)

      const [call] = gateway.calls
      expect(call?.sql).toBe(text)
      expect(call?.sql).not.toContain('DROP')
      expect(call?.values).toEqual([
        "SP'; DROP TABLE clientes; --",
        1,
        2,
        new SqlDateParam('2024-01-15'),
        null,
      ])
      expect(call?.cfg).toEqual(cfg)
      expect(call?.opts).toEqual(opts)
      // Colunas repetidas ganham sufixo (SQX-23).
      expect(result).toEqual({
        keys: ['nome', 'nome_2'],
        rows: [['Ana', 'Ana']],
      })
    }

    // O resto da fonte: validador, parâmetros e dialeto.
    const [{ source }] = cases as [(typeof cases)[number]]
    expect(source.language).toBe('SQL')
    expect(source.dialect).toBe('PostgreSQL')
    expect(cases[1]?.source.dialect).toBe('MySQL')
    expect(cases[2]?.source.dialect).toBe('T-SQL')
    expect(source.parameterNames(query)).toEqual([
      'uf',
      'ids',
      'desde',
      'cidade',
    ])
    expect(source.validate('DELETE FROM clientes')).toMatchObject({
      ok: false,
      code: 'QUERY_NOT_SELECT',
    })
    expect(source.validate(query)).toEqual({ ok: true })
  })
})
