import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import {
  type ChangeRoleInput,
  changeRoleSchema,
  type NewUserInput,
  newUserSchema,
  type ResetPasswordInput,
  resetPasswordSchema,
  type UserDto,
} from '@ninbi/contracts'
import { RequirePermission } from '../auth/decorators'
import { ZodValidationPipe } from '../common/zod.pipe'
import { UsersService } from './users.service'

@RequirePermission('users.manage')
@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Get()
  list(): Promise<UserDto[]> {
    return this.users.list()
  }

  @Post()
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(newUserSchema)) body: NewUserInput,
  ): Promise<UserDto> {
    return this.users.create(body)
  }

  @Patch(':id/role')
  changeRole(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(changeRoleSchema)) body: ChangeRoleInput,
  ): Promise<UserDto> {
    return this.users.changeRole(id, body.role)
  }

  @Post(':id/reset-password')
  @HttpCode(204)
  resetPassword(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(resetPasswordSchema))
    body: ResetPasswordInput,
  ): Promise<void> {
    return this.users.resetPassword(id, body.temporaryPassword)
  }

  @Post(':id/deactivate')
  @HttpCode(200)
  deactivate(@Param('id') id: string): Promise<UserDto> {
    return this.users.deactivate(id)
  }

  @Post(':id/approve-registration')
  @HttpCode(200)
  approveRegistration(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput,
  ): Promise<UserDto> {
    return this.users.approveRegistration(id, body.temporaryPassword)
  }

  @Post(':id/reactivate')
  @HttpCode(200)
  reactivate(@Param('id') id: string): Promise<UserDto> {
    return this.users.reactivate(id)
  }
}
