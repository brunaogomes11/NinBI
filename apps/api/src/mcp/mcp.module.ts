import { Module } from '@nestjs/common'
import { loadQueryLimits } from '../config/env'
import { MCP_TIMEOUT, McpClientService } from './mcp-client.service'
import { McpConnectionsController } from './mcp-connections.controller'
import { McpConnectionsService } from './mcp-connections.service'

@Module({
  controllers: [McpConnectionsController],
  providers: [
    McpConnectionsService,
    McpClientService,
    {
      provide: MCP_TIMEOUT,
      useFactory: () => loadQueryLimits().timeoutMs,
    },
  ],
  exports: [McpConnectionsService],
})
export class McpModule {}
