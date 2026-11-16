import { createBrowserRouter, type RouteObject } from 'react-router'
import {
  RedirectIfAuthenticated,
  RequireAuth,
  RequirePasswordChanged,
  RequirePermission,
  RequireSetupDone,
  RequireSetupPending,
} from '@/features/auth/guards'
import { InitialPasswordPage } from '@/features/auth/InitialPasswordPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { SetupPage } from '@/features/auth/SetupPage'
import { HomePage } from '@/features/home/HomePage'
import { AppShell } from '@/features/shell/AppShell'

// Marcadores até a página real de cada rota chegar nas tasks seguintes.
function Placeholder({ name }: { name: string }) {
  return <div>{name}</div>
}

export const appRoutes: RouteObject[] = [
  {
    path: '/primeiro-acesso',
    element: <RequireSetupPending />,
    children: [{ index: true, element: <SetupPage /> }],
  },
  {
    element: <RequireSetupDone />,
    children: [
      {
        path: '/entrar',
        element: <RedirectIfAuthenticated />,
        children: [{ index: true, element: <LoginPage /> }],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: '/definir-senha',
            element: <InitialPasswordPage />,
          },
          {
            element: <RequirePasswordChanged />,
            children: [
              {
                element: <AppShell />,
                children: [
                  { path: '/', element: <HomePage /> },
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
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(appRoutes)
}
