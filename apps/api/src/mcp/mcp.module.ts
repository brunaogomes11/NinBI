import { Module } from '@nestjs/common'
import { McpConnectionsController } from './mcp-connections.controller'
import { McpConnectionsService } from './mcp-connections.service'

@Module({
  controllers: [McpConnectionsController],
  providers: [McpConnectionsService],
  exports: [McpConnectionsService],
})
export class McpModule {}
