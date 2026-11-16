import { can, type Permission } from '@ninbi/contracts'
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router'
import { ForbiddenPage } from './ForbiddenPage'
import { loginPathFor, safeRedirectTarget } from './redirect'
import { useSession } from './useSession'
import { useSetupStatus } from './useSetupStatus'

function QueryFailure({ message }: { message: string }) {
  return (
    <p role="alert" className="p-6 text-destructive">
      {message}
    </p>
  )
}

/** Sem nenhum usuário, tudo leva ao primeiro acesso. */
export function RequireSetupDone() {
  const { needsSetup, isLoading, error } = useSetupStatus()
  if (isLoading) return null
  if (error) return <QueryFailure message={error.message} />
  if (needsSetup) return <Navigate to="/primeiro-acesso" replace />
  return <Outlet />
}

/** O primeiro acesso só existe enquanto não há usuário. */
export function RequireSetupPending() {
  const { needsSetup, isLoading, error } = useSetupStatus()
  if (isLoading) return null
  if (error) return <QueryFailure message={error.message} />
  if (!needsSetup) return <Navigate to="/entrar" replace />
  return <Outlet />
}

/** Quem já tem sessão não vê o login: segue para `voltar` ou para a página inicial. */
export function RedirectIfAuthenticated() {
  const { user, isLoading, error } = useSession()
  const [params] = useSearchParams()
  if (isLoading) return null
  if (error) return <QueryFailure message={error.message} />
  if (user) {
    return <Navigate to={safeRedirectTarget(params.get('voltar'))} replace />
  }
  return <Outlet />
}

export function RequireAuth() {
  const { user, isLoading, error } = useSession()
  const location = useLocation()
  if (isLoading) return null
  if (error) return <QueryFailure message={error.message} />
  if (!user) {
    return (
      <Navigate
        to={loginPathFor(`${location.pathname}${location.search}`)}
        replace
      />
    )
  }
  return <Outlet />
}

/** Com senha provisória, só a tela de definir a nova senha está aberta. */
export function RequirePasswordChanged() {
  const { user } = useSession()
  if (user?.mustChangePassword) return <Navigate to="/definir-senha" replace />
  return <Outlet />
}

export function RequirePermission({ permission }: { permission: Permission }) {
  const { user } = useSession()
  if (!user || !can(user.role, permission)) return <ForbiddenPage />
  return <Outlet />
}
