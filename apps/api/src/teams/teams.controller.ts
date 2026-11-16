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
  type TeamCreateInput,
  type TeamDto,
  type TeamUpdateInput,
  teamCreateSchema,
  teamUpdateSchema,
} from '@ninbi/contracts'
import { CurrentUser, RequirePermission } from '../auth/decorators'
import type { SessionUser } from '../auth/session.service'
import { ZodValidationPipe } from '../common/zod.pipe'
import { TeamsService } from './teams.service'

@RequirePermission('users.manage')
@Controller('teams')
export class TeamsController {
  constructor(@Inject(TeamsService) private readonly teams: TeamsService) {}

  @Get()
  list(): Promise<TeamDto[]> {
    return this.teams.list()
  }

  @Post()
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(teamCreateSchema)) body: TeamCreateInput,
  ): Promise<TeamDto> {
    return this.teams.create(body)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(teamUpdateSchema)) body: TeamUpdateInput,
  ): Promise<TeamDto> {
    return this.teams.update(id, body)
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.teams.remove(user.id, id)
  }
}
