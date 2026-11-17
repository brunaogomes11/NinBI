import type { SourceReadOptions, SourceResult } from '../source'

/** Onde está o banco SQL do usuário; a senha já vem decifrada. */
export interface SqlConnectionConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  /** Criptografa a conexão e valida o certificado do servidor (SRC-12, SRC-13). */
  ssl: boolean
}

/**
 * O único ponto que importa um driver SQL. `read` abre uma conexão, abre a
 * transação (de leitura onde o banco tem), aplica o prazo, lê em fluxo até
 * `maxRows`, termina em `ROLLBACK`, fecha a conexão e devolve as linhas já em
 * `ResultValue`. Erros saem como `SourceTimeoutError` ou `SourceGatewayError`.
 */
export interface SqlGateway {
  /** Prova host, porta, banco e credenciais de uma vez. */
  verify(cfg: SqlConnectionConfig, opts: { timeoutMs: number }): Promise<void>
  read(
    cfg: SqlConnectionConfig,
    sql: string,
    values: unknown[],
    opts: SourceReadOptions,
  ): Promise<SourceResult>
}

export const POSTGRES_GATEWAY = Symbol('POSTGRES_GATEWAY')
export const MYSQL_GATEWAY = Symbol('MYSQL_GATEWAY')
export const SQLSERVER_GATEWAY = Symbol('SQLSERVER_GATEWAY')

/**
 * Valor de parâmetro que é uma data `AAAA-MM-DD` (SQX-20). O PostgreSQL e o
 * MySQL a recebem como o texto; o SQL Server, como `sql.Date`.
 */
export class SqlDateParam {
  constructor(readonly value: string) {}
}

/** Valor de parâmetro para drivers que recebem a data como texto. */
export function plainSqlValue(value: unknown): unknown {
  return value instanceof SqlDateParam ? value.value : value
}

/** Códigos de rede dos drivers: o banco caiu ou não foi alcançado (SQX-26). */
export const NETWORK_ERROR_CODES: ReadonlySet<string> = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ESOCKET',
  'ECONNREFUSED',
  'EPIPE',
])

/** Código de rede de um driver ou classe `08` (exceção de conexão) do SQLSTATE. */
export function isNetworkErrorCode(code: string | undefined): boolean {
  if (code === undefined) return false
  return NETWORK_ERROR_CODES.has(code) || /^08[0-9A-Z]{3}$/.test(code)
}
