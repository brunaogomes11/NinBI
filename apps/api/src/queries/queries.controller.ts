import { Body, Controller, HttpCode, Inject, Param, Post } from '@nestjs/common'
import {
  filterParameterNames,
  MESSAGES,
  type QueryResultDto,
  type QueryRunInput,
  queryRunSchema,
  type WidgetRunInput,
  widgetRunSchema,
} from '@ninbi/contracts'
import { and, eq } from 'drizzle-orm'
import { CurrentUser } from '../auth/decorators'
import type { SessionUser } from '../auth/session.service'
import { AppError } from '../common/app-error'
import { ZodValidationPipe } from '../common/zod.pipe'
import { DashboardAccessService } from '../dashboard-access/dashboard-access.service'
import { type AppDatabase, DB } from '../database/database.module'
import { dashboards, widgets } from '../database/schema'
import { QueryService } from './query.service'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function widgetNotFound(): AppError {
  return new AppError(404, 'WIDGET_NOT_FOUND', MESSAGES.widgetNotFound)
}

@Controller('dashboards')
export class QueriesController {
  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(DashboardAccessService)
    private readonly access: DashboardAccessService,
    @Inject(QueryService) private readonly queries: QueryService,
  ) {}

  /** Executa o Cypher enviado como texto; só quem edita o dashboard (QRY-11). */
  @Post(':id/query')
  @HttpCode(200)
  async runText(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(queryRunSchema)) body: QueryRunInput,
  ): Promise<QueryResultDto> {
    const access = await this.access.assert(user, id, 'edit')
    return this.queries.run({
      userId: user.id,
      connectionId: body.connectionId ?? access.connectionId,
      cypher: body.cypher,
      params: body.params,
    })
  }

  /** Executa o Cypher salvo de um widget, pelo id; quem vê o dashboard (QRY-12). */
  @Post(':id/widgets/:widgetId/run')
  @HttpCode(200)
  async runWidget(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('widgetId') widgetId: string,
    @Body(new ZodValidationPipe(widgetRunSchema)) body: WidgetRunInput,
  ): Promise<QueryResultDto> {
    const access = await this.access.assert(user, id, 'view')
    if (!UUID_PATTERN.test(widgetId)) throw widgetNotFound()
    const [widget] = await this.db
      .select({ cypher: widgets.cypher })
      .from(widgets)
      .where(and(eq(widgets.id, widgetId), eq(widgets.dashboardId, id)))
    if (!widget) throw widgetNotFound()
    if (widget.cypher === null || widget.cypher.trim() === '') {
      throw new AppError(400, 'VALIDATION_ERROR', MESSAGES.widgetNoQuery)
    }
    // FLT-28: só os parâmetros dos filtros salvos chegam ao Cypher do widget.
    const [dashboard] = await this.db
      .select({ filters: dashboards.filters })
      .from(dashboards)
      .where(eq(dashboards.id, id))
    const allowed = new Set(
      (dashboard?.filters ?? []).flatMap((filter) =>
        filterParameterNames(filter),
      ),
    )
    const params = Object.fromEntries(
      Object.entries(body.params ?? {}).filter(([name]) => allowed.has(name)),
    )
    return this.queries.run({
      userId: user.id,
      connectionId: access.connectionId,
      cypher: widget.cypher,
      params,
      widgetId,
      maskErrors: !access.canEdit,
    })
  }
}
