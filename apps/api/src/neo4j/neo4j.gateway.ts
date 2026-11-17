import { SourceGatewayError, SourceTimeoutError } from '../sources/source'

/** Único contrato de acesso ao Neo4j do usuário; o resto do backend nunca importa o driver. */
export interface Neo4jConnectionConfig {
  uri: string
  /** `null` usa o banco padrão do servidor. */
  database: string | null
  username: string
  password: string
}

export interface Neo4jReadResult {
  keys: string[]
  /** Valores nativos do neo4j-driver (Integer, Date, Point...). */
  rows: Record<string, unknown>[]
}

export interface Neo4jGateway {
  /** Prova URI, credenciais e banco de uma vez. */
  verify(cfg: Neo4jConnectionConfig, opts: { timeoutMs: number }): Promise<void>
  /** Executa uma consulta numa transação de leitura. */
  read(
    cfg: Neo4jConnectionConfig,
    cypher: string,
    params: Record<string, unknown>,
    opts: { timeoutMs: number; maxRows?: number; signal?: AbortSignal },
  ): Promise<Neo4jReadResult>
}

export const NEO4J_GATEWAY = Symbol('NEO4J_GATEWAY')

/** O Neo4j não respondeu no prazo (ou a operação foi cancelada). */
export class Neo4jTimeoutError extends SourceTimeoutError {
  constructor(message = 'O Neo4j não respondeu no prazo') {
    super(message)
    this.name = 'Neo4jTimeoutError'
  }
}

/**
 * O Neo4j recusou ou falhou; `message` é a do Neo4j, sem alteração, e `code` o
 * do driver (`Neo.ClientError...`, `ServiceUnavailable`...), quando houver.
 */
export class Neo4jGatewayError extends SourceGatewayError {
  constructor(message: string, code?: string) {
    super(message, code)
    this.name = 'Neo4jGatewayError'
  }
}
