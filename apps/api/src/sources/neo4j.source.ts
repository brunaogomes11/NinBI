import { Inject, Injectable } from '@nestjs/common'
import {
  NEO4J_GATEWAY,
  type Neo4jConnectionConfig,
  type Neo4jGateway,
  Neo4jGatewayError,
} from '../neo4j/neo4j.gateway'
import { toCypherParams } from '../queries/cypher-params'
import {
  extractParameterNames,
  validateReadOnlyCypher,
} from '../queries/read-only-cypher'
import type { QueryCheck } from '../queries/read-only-sql'
import { toResultValue } from '../queries/result-value'
import { SchemaReader, type SchemaReadOptions } from '../schema/schema-reader'
import type { StoredSchema } from '../schema/types'
import type {
  Source,
  SourceConnection,
  SourceReadOptions,
  SourceResult,
} from './source'

/** A fonte do Neo4j: embrulha o gateway, o validador e o leitor de schema que já existiam. */
@Injectable()
export class Neo4jSource implements Source {
  readonly type = 'NEO4J' as const
  readonly language = 'CYPHER' as const
  readonly dialect = 'Cypher' as const
  private readonly schemaReader: SchemaReader

  constructor(@Inject(NEO4J_GATEWAY) private readonly gateway: Neo4jGateway) {
    this.schemaReader = new SchemaReader(gateway)
  }

  verify(conn: SourceConnection, opts: { timeoutMs: number }): Promise<void> {
    return this.gateway.verify(this.config(conn), opts)
  }

  validate(query: string): QueryCheck {
    return validateReadOnlyCypher(query)
  }

  parameterNames(query: string): string[] {
    return extractParameterNames(query, 'CYPHER')
  }

  async run(
    conn: SourceConnection,
    query: string,
    params: Record<string, unknown>,
    opts: SourceReadOptions,
  ): Promise<SourceResult> {
    const read = await this.gateway.read(
      this.config(conn),
      query,
      toCypherParams(params),
      opts,
    )
    return {
      keys: read.keys,
      rows: read.rows.map((row) =>
        read.keys.map((key) => toResultValue(row[key])),
      ),
    }
  }

  readSchema(
    conn: SourceConnection,
    opts: SchemaReadOptions,
  ): Promise<StoredSchema> {
    return this.schemaReader.read(this.config(conn), opts)
  }

  private config(conn: SourceConnection): Neo4jConnectionConfig {
    if (conn.uri === null) {
      throw new Neo4jGatewayError(`A conexão ${conn.name} não tem URI`)
    }
    return {
      uri: conn.uri,
      database: conn.database,
      username: conn.username,
      password: conn.password,
    }
  }
}
