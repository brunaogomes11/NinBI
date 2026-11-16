import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { RouteObject } from 'react-router'
import { describe, expect, it } from 'vitest'
import {
  RedirectIfAuthenticated,
  RequireAuth,
  RequireSetupDone,
} from '@/features/auth/guards'
import { LoginPage } from '@/features/auth/LoginPage'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'
import { TopBar, TopBarActionProvider } from './TopBar'

const routes: RouteObject[] = [
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
            path: '/',
            element: (
              <TopBarActionProvider>
                <TopBar />
              </TopBarActionProvider>
            ),
          },
        ],
      },
    ],
  },
]

describe('TopBar e menu do usuário', () => {
  it('SHELL-06 bloco do usuário abre menu com Alterar senha e Sair', async () => {
    const { user } = renderApp('/', {
      routes,
      handlers: [setupStatusHandler(false), sessionHandler(makeUser())],
    })

    const block = await screen.findByRole('button', { name: /Ana Souza/ })
    expect(block).toHaveTextContent('Admin')
    expect(block).toHaveTextContent('AS')
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()

    await user.click(block)

    expect(
      await screen.findByRole('menuitem', { name: 'Alterar senha' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Sair' })).toBeInTheDocument()
  })

  it('AUTH-06 Sair no menu do usuário mostra a tela de login', async () => {
    let logoutCalls = 0
    const { user, router } = renderApp('/', {
      routes,
      handlers: [
        setupStatusHandler(false),
        sessionHandler(makeUser()),
        http.post('/api/auth/logout', () => {
          logoutCalls += 1
          return new HttpResponse(null, { status: 204 })
        }),
      ],
    })

    await user.click(await screen.findByRole('button', { name: /Ana Souza/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Sair' }))

    expect(
      await screen.findByRole('heading', { name: 'Entrar' }),
    ).toBeInTheDocument()
    expect(logoutCalls).toBe(1)
    await waitFor(() => expect(router.state.location.pathname).toBe('/entrar'))
  })
})
