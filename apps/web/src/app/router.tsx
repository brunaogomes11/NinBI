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
import { SchemaPage } from '@/features/connections/SchemaPage'
import { HomePage } from '@/features/home/HomePage'
import {
  SettingsIndexRedirect,
  SettingsPage,
} from '@/features/settings/SettingsPage'
import { AppShell } from '@/features/shell/AppShell'

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
                    path: '/configuracoes',
                    element: <SettingsIndexRedirect />,
                  },
                  { path: '/configuracoes/:aba', element: <SettingsPage /> },
                  {
                    element: (
                      <RequirePermission permission="connections.read" />
                    ),
                    children: [
                      {
                        path: '/configuracoes/conexoes/:connectionId',
                        element: <SchemaPage />,
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
