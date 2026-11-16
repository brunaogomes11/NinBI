import { Body, Controller, Get, HttpCode, Inject, Post } from '@nestjs/common'
import {
  type ConnectionCreate,
  type ConnectionDto,
  connectionCreateSchema,
} from '@ninbi/contracts'
import { RequirePermission } from '../auth/decorators'
import { ZodValidationPipe } from '../common/zod.pipe'
import { ConnectionsService } from './connections.service'

@Controller('connections')
export class ConnectionsController {
  constructor(
    @Inject(ConnectionsService)
    private readonly connections: ConnectionsService,
  ) {}

  @RequirePermission('connections.read')
  @Get()
  list(): Promise<ConnectionDto[]> {
    return this.connections.list()
  }

  @RequirePermission('connections.manage')
  @Post()
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(connectionCreateSchema))
    body: ConnectionCreate,
  ): Promise<ConnectionDto> {
    return this.connections.create(body)
  }
}
