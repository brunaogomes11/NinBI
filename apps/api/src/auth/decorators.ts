import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from '@nestjs/common'
import type { Permission } from '@ninbi/contracts'
import type { Request } from 'express'
import type { SessionUser } from './session.service'

export const IS_PUBLIC_KEY = 'ninbi:isPublic'

/** Rota que dispensa sessão. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)

export const REQUIRED_PERMISSION_KEY = 'ninbi:requiredPermission'
export type RequiredPermission = Permission

/** Rota que exige a permissão da matriz de papéis; o `PermissionGuard` responde 403. */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permission)

export type AuthenticatedRequest = Request & { user?: SessionUser }

/** Usuário da sessão, posto na requisição pelo `SessionGuard`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>()
      .user as SessionUser,
)
