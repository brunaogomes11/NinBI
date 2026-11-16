import { Global, Module } from '@nestjs/common'
import { DriverNeo4jGateway } from './driver-neo4j.gateway'
import { NEO4J_GATEWAY } from './neo4j.gateway'

@Global()
@Module({
  providers: [{ provide: NEO4J_GATEWAY, useClass: DriverNeo4jGateway }],
  exports: [NEO4J_GATEWAY],
})
export class Neo4jModule {}
