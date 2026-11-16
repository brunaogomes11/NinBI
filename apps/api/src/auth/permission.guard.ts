import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { can, MESSAGES } from '@ninbi/contracts'
import { AppError } from '../common/app-error'
import {
  type AuthenticatedRequest,
  REQUIRED_PERMISSION_KEY,
  type RequiredPermission,
} from './decorators'

/** Roda depois do `SessionGuard`: sem `@RequirePermission`, basta estar logado. */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<
      RequiredPermission | undefined
    >(REQUIRED_PERMISSION_KEY, [context.getHandler(), context.getClass()])
    if (!permission) return true

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user
    if (!user || !can(user.role, permission)) {
      throw new AppError(403, 'FORBIDDEN', MESSAGES.forbiddenRoute)
    }
    return true
  }
}
