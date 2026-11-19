import { MESSAGES, type Role, type SidebarDto } from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { delay, HttpResponse, http, type RequestHandler } from 'msw'
import { describe, expect, it } from 'vitest'
import { HomePage } from '@/features/home/HomePage'
import { AppShell } from '@/features/shell/AppShell'
import { sidebarHandler } from '@/test/fixtures/dashboards'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'
import { COLLAPSED_STORAGE_KEY } from './SidebarDashboards'

// Rotas só com o shell: a página do dashboard ainda não existe nesta task.
const SHELL_ROUTES = [
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/dashboards/:dashboardId', element: <p>Página do dashboard</p> },
    ],
  },
]

const ITEMS: SidebarDto['items'] = [
  { type: 'dashboard', id: 'd-b', name: 'Beta' },
  {
    type: 'group',
    id: 'g-1',
    name: 'Comercial',
    items: [
      { type: 'dashboard', id: 'd-a', name: 'Alfa' },
      { type: 'dashboard', id: 'd-c', name: 'Gama' },
    ],
  },
]

function open(handler: RequestHandler, role: Role = 'ADMIN', path = '/') {
  return renderApp(path, {
    routes: SHELL_ROUTES,
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser({ role })),
      handler,
    ],
  })
}

const nav = () => screen.getByRole('navigation', { name: 'Barra lateral' })

describe('SidebarDashboards', () => {
  it('DASH-01 sidebar mostra os dashboards soltos e os grupos na ordem da API', async () => {
    open(sidebarHandler(ITEMS))

    await within(nav()).findByRole('link', { name: 'Beta' })
    const labels = Array.from(
      nav().querySelectorAll(
        'a[href^="/dashboards/"], button[draggable][aria-expanded]',
      ),
    ).map((element) => element.textContent)
    expect(labels).toEqual(['Beta', 'Comercial', 'Alfa', 'Gama'])
    expect(screen.getByRole('button', { name: 'Comercial' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('DASH-02 sem dashboards a página inicial mostra Nenhum dashboard ainda', async () => {
    const { unmount } = open(sidebarHandler([]))
    expect(
      await screen.findByRole('heading', { name: MESSAGES.dashboardsEmpty }),
    ).toBeInTheDocument()
    unmount()

    open(sidebarHandler(ITEMS))
    expect(
      await within(screen.getByRole('main')).findByRole('link', {
        name: 'Abrir dashboard Beta',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByText(MESSAGES.dashboardsEmpty)).not.toBeInTheDocument()
  })

  it('DASH-03 esqueleto na sidebar enquanto a lista carrega', async () => {
    open(http.get('/api/sidebar', () => delay('infinite')))

    await within(nav()).findByRole('button', { name: 'Novo grupo' })
    expect(
      nav().querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0)
    expect(within(nav()).queryByRole('link', { name: 'Beta' })).toBeNull()
  })

  it('DASH-04 erro na sidebar mostra Não foi possível carregar os dashboards e Tentar novamente recarrega', async () => {
    let failing = true
    const { user } = open(
      http.get('/api/sidebar', () =>
        failing
          ? HttpResponse.json(
              { code: 'INTERNAL_ERROR', message: 'falhou' },
              { status: 500 },
            )
          : HttpResponse.json({ items: ITEMS, shared: [] }),
      ),
    )

    expect(
      await within(nav()).findByText(MESSAGES.dashboardsLoadFailed),
    ).toBeInTheDocument()
    failing = false
    await user.click(
      within(nav()).getByRole('button', { name: 'Tentar novamente' }),
    )

    expect(
      await within(nav()).findByRole('link', { name: 'Beta' }),
    ).toBeInTheDocument()
    expect(within(nav()).queryByText(MESSAGES.dashboardsLoadFailed)).toBeNull()
  })

  it('DASH-08 clicar no dashboard da sidebar marca o item ativo', async () => {
    const { user, router } = open(sidebarHandler(ITEMS))
    const link = await within(nav()).findByRole('link', { name: 'Beta' })
    expect(link).not.toHaveAttribute('aria-current')

    await user.click(link)

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/dashboards/d-b'),
    )
    const active = within(nav()).getByRole('link', { name: 'Beta' })
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(active.className).toContain('var(--gradient-brand)')
    expect(
      within(nav()).getByRole('link', { name: 'Alfa' }),
    ).not.toHaveAttribute('aria-current')
  })

  it.each([
    ['ADMIN', true],
    ['EDITOR', true],
    ['VIEWER', false],
  ] as const)(
    'DASH-09 Novo dashboard aparece só para Admin e Editor (%s)',
    async (role, visible) => {
      open(sidebarHandler(ITEMS), role)

      await within(nav()).findByRole('link', { name: 'Beta' })

      expect(
        within(nav()).queryByRole('button', { name: 'Novo dashboard' }) !==
          null,
      ).toBe(visible)
      expect(
        within(nav()).getByRole('button', { name: 'Novo grupo' }),
      ).toBeInTheDocument()
    },
  )

  it('SIDE-07 clicar no cabeçalho recolhe e expande o grupo', async () => {
    const { user, unmount } = open(sidebarHandler(ITEMS))
    const header = await within(nav()).findByRole('button', {
      name: 'Comercial',
    })
    expect(within(nav()).getByRole('link', { name: 'Alfa' })).toBeVisible()

    await user.click(header)

    expect(within(nav()).queryByRole('link', { name: 'Alfa' })).toBeNull()
    expect(within(nav()).queryByRole('link', { name: 'Gama' })).toBeNull()
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(localStorage.getItem(COLLAPSED_STORAGE_KEY)).toContain('g-1')
    unmount()

    // remontar mantém recolhido
    const second = open(sidebarHandler(ITEMS))
    const again = await within(nav()).findByRole('button', {
      name: 'Comercial',
    })
    expect(again).toHaveAttribute('aria-expanded', 'false')
    expect(within(nav()).queryByRole('link', { name: 'Alfa' })).toBeNull()

    await second.user.click(again)

    expect(
      await within(nav()).findByRole('link', { name: 'Alfa' }),
    ).toBeInTheDocument()
  })

  it('SIDE-14 grupo sem dashboards mostra Grupo vazio', async () => {
    open(
      sidebarHandler([{ type: 'group', id: 'g-9', name: 'Vazio', items: [] }]),
    )

    expect(
      await within(nav()).findByText(MESSAGES.groupEmpty),
    ).toBeInTheDocument()
  })

  it('SIDE-15 nome longo é cortado com reticências e mostra o nome inteiro no title', async () => {
    const longDashboard =
      'Vendas consolidadas por região e por trimestre fiscal'
    const longGroup = 'Grupo comercial das regiões Sul, Sudeste e Centro-Oeste'
    open(
      sidebarHandler([
        { type: 'dashboard', id: 'd-l', name: longDashboard },
        {
          type: 'group',
          id: 'g-l',
          name: longGroup,
          items: [],
        },
      ]),
    )
    await within(nav()).findByRole('link', { name: longDashboard })

    for (const name of [longDashboard, longGroup]) {
      const label = within(nav()).getByTitle(name)
      expect(label).toHaveTextContent(name)
      expect(label).toHaveClass('truncate')
    }
  })

  it('SIDE-16 lista de dashboards e grupos rola na vertical', async () => {
    open(sidebarHandler(ITEMS))

    const link = await within(nav()).findByRole('link', { name: 'Beta' })

    const scroll = link.closest('.overflow-y-auto')
    expect(scroll).not.toBeNull()
    expect(scroll).toContainElement(
      within(nav()).getByRole('button', { name: 'Comercial' }),
    )
    expect(scroll).not.toContainElement(
      within(nav()).getByRole('link', { name: 'Configurações' }),
    )
  })
})
