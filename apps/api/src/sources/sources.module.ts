import { Global, Module } from '@nestjs/common'
import { DriverNeo4jGateway } from '../neo4j/driver-neo4j.gateway'
import { NEO4J_GATEWAY } from '../neo4j/neo4j.gateway'

/**
 * Acesso aos bancos do usuário: os gateways dos drivers e as fontes por tipo de
 * conexão. Substitui o antigo `Neo4jModule` e segue exportando `NEO4J_GATEWAY`.
 */
// SPEC_DEVIATION: o `SourceRegistry` entra neste módulo só quando as quatro
// fontes existem (T19). Reason: o registro encerra a inicialização quando um
// tipo de `CONNECTION_TYPES` não tem fonte (SRC-22), e as fontes SQL nascem nas
// T16 a T19; registrá-lo antes derrubaria a API e todos os testes que a sobem.
@Global()
@Module({
  providers: [{ provide: NEO4J_GATEWAY, useClass: DriverNeo4jGateway }],
  exports: [NEO4J_GATEWAY],
})
export class SourcesModule {}
