import { Body, Controller, HttpCode, Inject, Param, Post } from '@nestjs/common'
import {
  type FilterOptionsDraftInput,
  type FilterOptionsDto,
  filterOptionsDraftSchema,
  MESSAGES,
} from '@ninbi/contracts'
import { eq } from 'drizzle-orm'
import { CurrentUser } from '../auth/decorators'
import type { SessionUser } from '../auth/session.service'
import { AppError } from '../common/app-error'
import { ZodValidationPipe } from '../common/zod.pipe'
import { DashboardAccessService } from '../dashboard-access/dashboard-access.service'
import { type AppDatabase, DB } from '../database/database.module'
import { dashboards } from '../database/schema'
import { QueryService } from '../queries/query.service'
import { optionsFromResult } from './filter-options'

function filterNotFound(): AppError {
  return new AppError(404, 'FILTER_NOT_FOUND', MESSAGES.filterNotFound)
}

@Controller('dashboards')
export class FilterOptionsController {
  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(DashboardAccessService)
    private readonly access: DashboardAccessService,
    @Inject(QueryService) private readonly queries: QueryService,
  ) {}

  /** Opções do filtro salvo; quem vê o dashboard (FLT-29). */
  @Post(':id/filters/:filterId/options')
  @HttpCode(200)
  async saved(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('filterId') filterId: string,
  ): Promise<FilterOptionsDto> {
    const access = await this.access.assert(user, id, 'view')
    const [dashboard] = await this.db
      .select({ filters: dashboards.filters })
      .from(dashboards)
      .where(eq(dashboards.id, access.dashboardId))
    const filter = dashboard?.filters.find((item) => item.id === filterId)
    if (!filter?.options) throw filterNotFound()
    if (filter.options.source === 'STATIC') {
      return { options: filter.options.values, truncated: false }
    }
    if (!filter.options.cypher) throw filterNotFound()
    const result = await this.queries.run({
      userId: user.id,
      connectionId: access.connectionId,
      cypher: filter.options.cypher,
      maskErrors: !access.canEdit,
    })
    return optionsFromResult(result)
  }

  /** Opções de um filtro ainda no rascunho; só quem edita (FLT-30). */
  @Post(':id/filter-options')
  @HttpCode(200)
  async draft(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(filterOptionsDraftSchema))
    body: FilterOptionsDraftInput,
  ): Promise<FilterOptionsDto> {
    const access = await this.access.assert(user, id, 'edit')
    const result = await this.queries.run({
      userId: user.id,
      connectionId: body.connectionId ?? access.connectionId,
      cypher: body.cypher,
    })
    return optionsFromResult(result)
  }
}
