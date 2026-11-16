import type { Role } from '@ninbi/contracts'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppProviders, createQueryClient } from '@/app/providers'
import { SESSION_QUERY_KEY } from '@/features/auth/useSession'
import { makeUser, sessionHandler } from '@/test/renderApp'
import { server } from '@/test/server'
import { Sidebar } from './Sidebar'

async function renderSidebar(role: Role = 'ADMIN') {
  server.use(sessionHandler(makeUser({ role })))
  const router = createMemoryRouter([{ path: '*', element: <Sidebar /> }], {
    initialEntries: ['/'],
  })
  const user = userEvent.setup()
  const queryClient = createQueryClient()
  render(
    <AppProviders client={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  await waitFor(() =>
    expect(queryClient.getQueryData(SESSION_QUERY_KEY)).toBeTruthy(),
  )
  return { router, user }
}

const html = () => document.documentElement

describe('Sidebar', () => {
  it('SHELL-02 escolher Claro aplica o tema claro', async () => {
    const { user } = await renderSidebar()
    expect(html()).toHaveClass('dark')

    await user.click(await screen.findByRole('button', { name: 'Claro' }))

    expect(html()).not.toHaveClass('dark')
  })

  it('SHELL-03 escolher Escuro na sidebar volta ao tema escuro', async () => {
    const { user } = await renderSidebar()
    await user.click(await screen.findByRole('button', { name: 'Claro' }))
    expect(html()).not.toHaveClass('dark')

    await user.click(screen.getByRole('button', { name: 'Escuro' }))

    expect(html()).toHaveClass('dark')
  })

  it('SHELL-05 clicar em um item abre a página e marca o item como ativo', async () => {
    const { router, user } = await renderSidebar()
    const link = await screen.findByRole('link', { name: 'Configurações' })
    expect(link).not.toHaveAttribute('aria-current')

    await user.click(link)

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/configuracoes'),
    )
    const active = screen.getByRole('link', { name: 'Configurações' })
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(active.className).toContain('var(--gradient-brand)')
  })

  it.each([
    ['ADMIN', true],
    ['EDITOR', false],
    ['VIEWER', false],
  ] as const)(
    'ROLE-04 só Admin vê Configurações na sidebar (%s)',
    async (role, visible) => {
      await renderSidebar(role)
      await screen.findByRole('button', { name: 'Claro' })

      expect(
        screen.queryByRole('link', { name: 'Configurações' }) !== null,
      ).toBe(visible)
    },
  )

  it('CFG-04 Configurações é o último item da sidebar fora da área que rola', async () => {
    await renderSidebar()
    const nav = await screen.findByRole('navigation')
    const links = within(nav).getAllByRole('link')
    const last = links[links.length - 1]

    expect(last).toHaveTextContent('Configurações')
    expect(last.closest('.overflow-y-auto')).toBeNull()
    expect(nav.querySelector('.overflow-y-auto')).not.toBeNull()
    expect(nav.querySelector('.overflow-y-auto')?.contains(last)).toBe(false)
  })
})
