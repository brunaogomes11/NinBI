import { MESSAGES } from '@ninbi/contracts'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HomePage } from '@/features/home/HomePage'
import { AppShell } from '@/features/shell/AppShell'
import {
  type SavedSidebar,
  sidebarHandler,
  sidebarSaveHandler,
} from '@/test/fixtures/dashboards'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

const SHELL_ROUTES = [
  {
    element: <AppShell />,
    children: [{ path: '/', element: <HomePage /> }],
  },
]

const nav = () => screen.getByRole('navigation', { name: 'Barra lateral' })
const node = (id: string, name: string) => ({
  type: 'dashboard' as const,
  id,
  name,
})
const GROUP = {
  type: 'group' as const,
  id: 'g-1',
  name: 'Comercial',
  items: [node('d-b', 'Beta')],
}

describe('sidebar com Compartilhados comigo', () => {
  it('ACL-04 sidebar mostra Compartilhados comigo com os dashboards compartilhados', async () => {
    renderApp('/', {
      routes: SHELL_ROUTES,
      handlers: [
        setupStatusHandler(false),
        sessionHandler(makeUser()),
        sidebarHandler([node('d-a', 'Alfa')], [node('d-s', 'Vendas Sul')]),
      ],
    })

    const section = await within(nav()).findByRole('region', {
      name: MESSAGES.sharedWithMe,
    })
    const item = within(section).getByRole('link', { name: 'Vendas Sul' })
    expect(item).toHaveAttribute('href', '/dashboards/d-s')
    expect(item).toHaveAttribute('draggable', 'true')
  })

  it('ACL-10 sem compartilhados a seção Compartilhados comigo não aparece', async () => {
    renderApp('/', {
      routes: SHELL_ROUTES,
      handlers: [
        setupStatusHandler(false),
        sessionHandler(makeUser()),
        sidebarHandler([node('d-a', 'Alfa')], []),
      ],
    })

    await within(nav()).findByRole('link', { name: 'Alfa' })
    expect(within(nav()).queryByText(MESSAGES.sharedWithMe)).toBeNull()
  })

  it('ACL-05 arrastar de Compartilhados comigo para um grupo o mantém no grupo', async () => {
    const saved: SavedSidebar[] = []
    renderApp('/', {
      routes: SHELL_ROUTES,
      handlers: [
        setupStatusHandler(false),
        sessionHandler(makeUser()),
        sidebarHandler([GROUP], [node('d-s', 'Vendas Sul')]),
        sidebarSaveHandler(saved),
      ],
    })
    const shared = await within(nav()).findByRole('link', {
      name: 'Vendas Sul',
    })

    fireEvent.dragStart(shared)
    fireEvent.dragOver(within(nav()).getByRole('button', { name: 'Comercial' }))
    fireEvent.drop(within(nav()).getByRole('button', { name: 'Comercial' }))

    await waitFor(() => expect(saved).toHaveLength(1))
    expect(saved[0]?.items).toEqual([
      {
        type: 'group',
        id: 'g-1',
        name: 'Comercial',
        items: [
          { type: 'dashboard', id: 'd-b' },
          { type: 'dashboard', id: 'd-s' },
        ],
      },
    ])
    await waitFor(() => {
      expect(within(nav()).queryByText(MESSAGES.sharedWithMe)).toBeNull()
    })
    expect(within(nav()).getByRole('link', { name: 'd-s' })).toBeInTheDocument()
  })
})
