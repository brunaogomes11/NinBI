import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
} from '@nestjs/common'
import {
  type ExampleSetting,
  exampleSettingSchema,
  type SchemaDto,
  type SchemaStateDto,
} from '@ninbi/contracts'
import { RequirePermission } from '../auth/decorators'
import { ZodValidationPipe } from '../common/zod.pipe'
import { SchemaQueryService } from './schema-query.service'
import { SchemaRefreshService } from './schema-refresh.service'

@Controller('connections/:id/schema')
export class SchemaController {
  constructor(
    @Inject(SchemaQueryService) private readonly query: SchemaQueryService,
    @Inject(SchemaRefreshService)
    private readonly refresh: SchemaRefreshService,
  ) {}

  @RequirePermission('connections.read')
  @Get()
  get(@Param('id') id: string): Promise<SchemaDto> {
    return this.query.get(id)
  }

  @RequirePermission('connections.read')
  @Post('refresh')
  @HttpCode(202)
  startRefresh(@Param('id') id: string): Promise<SchemaStateDto> {
    return this.refresh.start(id)
  }

  @RequirePermission('connections.manage')
  @Put('example-settings')
  @HttpCode(204)
  setExampleSetting(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(exampleSettingSchema)) body: ExampleSetting,
  ): Promise<void> {
    return this.query.setExampleSetting(id, body)
  }
}
