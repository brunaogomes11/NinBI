import { createBrowserRouter, type RouteObject } from 'react-router'
import {
  RedirectIfAuthenticated,
  RequireAuth,
  RequirePasswordChanged,
  RequirePermission,
  RequireSetupDone,
  RequireSetupPending,
} from '@/features/auth/guards'

// Marcadores até a página real de cada rota chegar nas tasks seguintes.
function Placeholder({ name }: { name: string }) {
  return <div>{name}</div>
}

export const appRoutes: RouteObject[] = [
  {
    path: '/primeiro-acesso',
    element: <RequireSetupPending />,
    children: [
      { index: true, element: <Placeholder name="Criar administrador" /> },
    ],
  },
  {
    element: <RequireSetupDone />,
    children: [
      {
        path: '/entrar',
        element: <RedirectIfAuthenticated />,
        children: [{ index: true, element: <Placeholder name="Entrar" /> }],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: '/definir-senha',
            element: <Placeholder name="Definir nova senha" />,
          },
          {
            element: <RequirePasswordChanged />,
            children: [
              { path: '/', element: <Placeholder name="Página inicial" /> },
              {
                element: <RequirePermission permission="users.manage" />,
                children: [
                  {
                    path: '/configuracoes/usuarios',
                    element: <Placeholder name="Usuários" />,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(appRoutes)
}
