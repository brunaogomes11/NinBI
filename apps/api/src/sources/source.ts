import type {
  ConnectionType,
  QueryLanguage,
  ResultValue,
} from '@ninbi/contracts'
import type { QueryCheck } from '../queries/read-only-sql'
import type { SchemaReadOptions } from '../schema/schema-reader'
import type { StoredRelationalSchema, StoredSchema } from '../schema/types'

/** Idioma da consulta que o prompt da IA pede ao modelo (SAI-01, SAI-03). */
export type PromptDialect = 'Cypher' | 'PostgreSQL' | 'MySQL' | 'T-SQL'

/** Conexão pronta para a fonte; a senha já vem decifrada pelo chamador. */
export interface SourceConnection {
  id: string
  name: string
  type: ConnectionType
  /** Só no Neo4j. */
  uri: string | null
  /** Só nos tipos SQL. */
  host: string | null
  port: number | null
  ssl: boolean
  database: string | null
  username: string
  password: string
}

/** Resultado de uma consulta, com os valores já em `ResultValue`. */
export interface SourceResult {
  keys: string[]
  rows: ResultValue[][]
}

export interface SourceReadOptions {
  timeoutMs: number
  maxRows?: number
  signal?: AbortSignal
}

/** Documento do schema guardado: de grafo (sem `kind`) ou relacional. */
export type SourceSchema = StoredSchema | StoredRelationalSchema

/** Tudo o que o backend faz com o banco de um tipo de conexão (AD-137). */
export interface Source {
  readonly type: ConnectionType
  readonly language: QueryLanguage
  readonly dialect: PromptDialect
  verify(conn: SourceConnection, opts: { timeoutMs: number }): Promise<void>
  validate(query: string): QueryCheck
  parameterNames(query: string): string[]
  run(
    conn: SourceConnection,
    query: string,
    params: Record<string, unknown>,
    opts: SourceReadOptions,
  ): Promise<SourceResult>
  readSchema(
    conn: SourceConnection,
    opts: SchemaReadOptions,
  ): Promise<SourceSchema>
}

/** O banco não respondeu no prazo (ou a operação foi cancelada). */
export class SourceTimeoutError extends Error {
  constructor(message = 'O banco não respondeu no prazo') {
    super(message)
    this.name = 'SourceTimeoutError'
  }
}

/** O banco recusou ou falhou; `message` é a do banco, sem alteração. */
export class SourceGatewayError extends Error {
  constructor(
    message: string,
    /** Código do erro do driver (`ECONNRESET`, `42601`, `Neo.ClientError...`), quando houver. */
    readonly code?: string,
  ) {
    super(message)
    this.name = 'SourceGatewayError'
  }
}
