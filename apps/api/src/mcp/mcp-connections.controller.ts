import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import {
  can,
  type McpConnectionCreate,
  type McpConnectionUpdate,
  mcpConnectionCreateSchema,
  mcpConnectionUpdateSchema,
} from '@ninbi/contracts'
import { CurrentUser, RequirePermission } from '../auth/decorators'
import type { SessionUser } from '../auth/session.service'
import { ZodValidationPipe } from '../common/zod.pipe'
import { McpConnectionsService } from './mcp-connections.service'
import { McpTableService } from './mcp-table.service'

@Controller('mcp/connections')
export class McpConnectionsController {
  constructor(
    @Inject(McpConnectionsService)
    private readonly connections: McpConnectionsService,
    @Inject(McpTableService) private readonly table: McpTableService,
  ) {}

  @Get()
  @RequirePermission('connections.read')
  list(@CurrentUser() user: SessionUser) {
    return this.connections.list(can(user.role, 'connections.manage'))
  }

  @Get(':id/tools')
  @RequirePermission('connections.read')
  tools(@Param('id') id: string) {
    return this.table.tools(id)
  }

  @Post()
  @RequirePermission('connections.manage')
  create(
    @Body(new ZodValidationPipe(mcpConnectionCreateSchema))
    input: McpConnectionCreate,
  ) {
    return this.connections.create(input)
  }

  @Patch(':id')
  @RequirePermission('connections.manage')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(mcpConnectionUpdateSchema))
    input: McpConnectionUpdate,
  ) {
    return this.connections.update(id, input)
  }
}
