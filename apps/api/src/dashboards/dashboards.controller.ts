import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
} from '@nestjs/common'
import {
  type DashboardCreateInput,
  type DashboardDto,
  type DashboardSummaryDto,
  dashboardCreateSchema,
} from '@ninbi/contracts'
import { CurrentUser, RequirePermission } from '../auth/decorators'
import type { SessionUser } from '../auth/session.service'
import { ZodValidationPipe } from '../common/zod.pipe'
import { DashboardsService } from './dashboards.service'

@Controller('dashboards')
export class DashboardsController {
  constructor(
    @Inject(DashboardsService) private readonly dashboards: DashboardsService,
  ) {}

  @RequirePermission('dashboards.create')
  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(dashboardCreateSchema))
    body: DashboardCreateInput,
  ): Promise<DashboardDto> {
    return this.dashboards.create(user, body)
  }

  @RequirePermission('dashboards.all')
  @Get()
  listAll(): Promise<DashboardSummaryDto[]> {
    return this.dashboards.listAll()
  }

  @Get(':id')
  get(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ): Promise<DashboardDto> {
    return this.dashboards.get(user, id)
  }
}
