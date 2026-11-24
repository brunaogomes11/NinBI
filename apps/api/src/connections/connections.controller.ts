import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import {
  type ConnectionCreate,
  type ConnectionDto,
  type ConnectionUpdate,
  connectionCreateSchema,
  connectionUpdateSchema,
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
  @Post('test')
  @HttpCode(200)
  async testNew(
    @Body(new ZodValidationPipe(connectionCreateSchema))
    body: ConnectionCreate,
  ): Promise<{ ok: true }> {
    await this.connections.testNew(body)
    return { ok: true }
  }

  @RequirePermission('connections.manage')
  @Post(':id/test')
  @HttpCode(200)
  async testExisting(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(connectionUpdateSchema))
    body: ConnectionUpdate,
  ): Promise<{ ok: true }> {
    await this.connections.testExisting(id, body)
    return { ok: true }
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

  @RequirePermission('connections.manage')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(connectionUpdateSchema))
    body: ConnectionUpdate,
  ): Promise<ConnectionDto> {
    return this.connections.update(id, body)
  }

  @RequirePermission('connections.manage')
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.connections.remove(id)
  }
}
