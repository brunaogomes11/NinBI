import { Global, Module } from '@nestjs/common'
import { DriverNeo4jGateway } from '../neo4j/driver-neo4j.gateway'
import { NEO4J_GATEWAY } from '../neo4j/neo4j.gateway'
import { MYSQL_DIALECT, POSTGRES_DIALECT, SQLSERVER_DIALECT } from './dialects'
import { MssqlGateway } from './gateways/mssql.gateway'
import { MysqlGateway } from './gateways/mysql.gateway'
import { PgGateway } from './gateways/pg.gateway'
import {
  MYSQL_GATEWAY,
  POSTGRES_GATEWAY,
  SQLSERVER_GATEWAY,
  type SqlGateway,
} from './gateways/sql.gateway'
import { Neo4jSource } from './neo4j.source'
import { SOURCES, SourceRegistry } from './source-registry'
import { SqlSource } from './sql.source'

/**
 * Acesso aos bancos do usuário: os gateways dos drivers e as fontes por tipo de
 * conexão. Substitui o antigo `Neo4jModule` e segue exportando `NEO4J_GATEWAY`.
 */
// SPEC_DEVIATION: os gateways SQL, as fontes e o `SourceRegistry` entram neste
// módulo na T19, quando as quatro fontes existem. Reason: o registro encerra a
// inicialização quando um tipo de `CONNECTION_TYPES` não tem fonte (SRC-22), e
// as fontes SQL nasceram nas T16 a T19; registrá-lo antes derrubaria a API.
@Global()
@Module({
  providers: [
    { provide: NEO4J_GATEWAY, useClass: DriverNeo4jGateway },
    { provide: POSTGRES_GATEWAY, useFactory: () => new PgGateway() },
    { provide: MYSQL_GATEWAY, useFactory: () => new MysqlGateway() },
    { provide: SQLSERVER_GATEWAY, useFactory: () => new MssqlGateway() },
    Neo4jSource,
    {
      provide: SOURCES,
      useFactory: (
        neo4j: Neo4jSource,
        postgres: SqlGateway,
        mysql: SqlGateway,
        sqlServer: SqlGateway,
      ) => [
        neo4j,
        new SqlSource('POSTGRES', postgres, POSTGRES_DIALECT),
        new SqlSource('MYSQL', mysql, MYSQL_DIALECT),
        new SqlSource('SQLSERVER', sqlServer, SQLSERVER_DIALECT),
      ],
      inject: [Neo4jSource, POSTGRES_GATEWAY, MYSQL_GATEWAY, SQLSERVER_GATEWAY],
    },
    SourceRegistry,
  ],
  exports: [
    NEO4J_GATEWAY,
    POSTGRES_GATEWAY,
    MYSQL_GATEWAY,
    SQLSERVER_GATEWAY,
    SourceRegistry,
  ],
})
export class SourcesModule {}
