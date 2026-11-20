import { Module } from '@nestjs/common'
import { loadQueryLimits } from '../config/env'
import { MCP_TIMEOUT, McpClientService } from './mcp-client.service'
import { McpConnectionsController } from './mcp-connections.controller'
import { McpConnectionsService } from './mcp-connections.service'
import { McpTableService } from './mcp-table.service'

@Module({
  controllers: [McpConnectionsController],
  providers: [
    McpConnectionsService,
    McpClientService,
    McpTableService,
    {
      provide: MCP_TIMEOUT,
      useFactory: () => loadQueryLimits().timeoutMs,
    },
  ],
  exports: [McpConnectionsService, McpTableService],
})
export class McpModule {}
