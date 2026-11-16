import { Body, Controller, Get, HttpCode, Inject, Post } from '@nestjs/common'
import {
  type NewUserInput,
  newUserSchema,
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
}
