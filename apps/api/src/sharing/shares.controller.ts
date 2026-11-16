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
  type DashboardSharesDto,
  type ShareUpdateInput,
  type ShareUpsertInput,
  shareUpdateSchema,
  shareUpsertSchema,
} from '@ninbi/contracts'
import { CurrentUser } from '../auth/decorators'
import type { SessionUser } from '../auth/session.service'
import { ZodValidationPipe } from '../common/zod.pipe'
import { SharesService } from './shares.service'

@Controller('dashboards/:id/shares')
export class SharesController {
  constructor(@Inject(SharesService) private readonly shares: SharesService) {}

  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ): Promise<DashboardSharesDto> {
    return this.shares.list(user, id)
  }

  @Post()
  @HttpCode(200)
  upsert(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(shareUpsertSchema)) body: ShareUpsertInput,
  ): Promise<DashboardSharesDto> {
    return this.shares.upsert(user, id, body)
  }

  @Patch(':shareId')
  change(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('shareId') shareId: string,
    @Body(new ZodValidationPipe(shareUpdateSchema)) body: ShareUpdateInput,
  ): Promise<DashboardSharesDto> {
    return this.shares.change(user, id, shareId, body.permission)
  }

  @Delete(':shareId')
  remove(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('shareId') shareId: string,
  ): Promise<DashboardSharesDto> {
    return this.shares.remove(user, id, shareId)
  }
}
