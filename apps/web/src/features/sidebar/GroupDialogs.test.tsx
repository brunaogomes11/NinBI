import { MESSAGES, type SidebarDto } from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { http, type RequestHandler } from 'msw'
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

const dash = (id: string) => ({ type: 'dashboard' as const, id, name: id })
const group = (id: string, ...ids: string[]) => ({
  type: 'group' as const,
  id,
  name: id,
  items: ids.map(dash),
})

function open(items: SidebarDto['items'], ...extra: RequestHandler[]) {
  return renderApp('/', {
    routes: SHELL_ROUTES,
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      sidebarHandler(items),
      ...extra,
    ],
  })
}

const nav = () => screen.getByRole('navigation', { name: 'Barra lateral' })

function order(): string[] {
  return Array.from(
    nav().querySelectorAll(
      'a[href^="/dashboards/"], button[draggable][aria-expanded]',
    ),
  ).map((element) => element.textContent ?? '')
}

describe('grupos da sidebar', () => {
  it('SIDE-01 Novo grupo cria um grupo no fim da sidebar', async () => {
    const saved: SavedSidebar[] = []
    const { user } = open([dash('A')], sidebarSaveHandler(saved))
    await within(nav()).findByRole('link', { name: 'A' })

    await user.click(within(nav()).getByRole('button', { name: 'Novo grupo' }))
    await user.type(await screen.findByLabelText('Nome'), 'Comercial')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(order()).toEqual(['A', 'Comercial']))
    expect(within(nav()).getByText(MESSAGES.groupEmpty)).toBeInTheDocument()
    await waitFor(() => expect(saved).toHaveLength(1))
    const last = saved[0].items[saved[0].items.length - 1]
    expect(last).toMatchObject({ type: 'group', name: 'Comercial', items: [] })
  })

  it('SIDE-02 nome de grupo inválido mostra a mensagem no campo', async () => {
    let puts = 0
    const { user } = open(
      [dash('A')],
      http.put('/api/sidebar', () => {
        puts += 1
        return new Response(null, { status: 500 })
      }),
    )
    await within(nav()).findByRole('link', { name: 'A' })
    await user.click(within(nav()).getByRole('button', { name: 'Novo grupo' }))
    const field = await screen.findByLabelText('Nome')

    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText(MESSAGES.nameRequired)).toBeInTheDocument()

    await user.type(field, 'x'.repeat(41))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(
      await screen.findByText(MESSAGES.shortNameTooLong),
    ).toBeInTheDocument()
    expect(screen.queryByText(MESSAGES.nameRequired)).toBeNull()
    expect(puts).toBe(0)
  })

  it('SIDE-08 renomear o grupo mostra o novo nome', async () => {
    const saved: SavedSidebar[] = []
    const { user } = open([group('Comercial', 'A')], sidebarSaveHandler(saved))
    await within(nav()).findByRole('button', { name: 'Comercial' })

    await user.click(
      within(nav()).getByRole('button', { name: 'Ações do grupo Comercial' }),
    )
    await user.click(
      await screen.findByRole('menuitem', { name: 'Renomear grupo' }),
    )
    const field = await screen.findByLabelText('Nome')
    expect(field).toHaveValue('Comercial')
    await user.clear(field)
    await user.type(field, 'Vendas')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await within(nav()).findByRole('button', { name: 'Vendas' }),
    ).toBeInTheDocument()
    expect(
      within(nav()).queryByRole('button', { name: 'Comercial' }),
    ).toBeNull()
    await waitFor(() => expect(saved).toHaveLength(1))
    expect(saved[0].items[0]).toMatchObject({ type: 'group', name: 'Vendas' })
  })

  it('SIDE-09 Excluir grupo solta os dashboards na posição do grupo', async () => {
    const saved: SavedSidebar[] = []
    let deletes = 0
    const { user } = open(
      [dash('X'), group('G', 'A', 'B'), dash('Y')],
      sidebarSaveHandler(saved),
      http.delete('/api/dashboards/:id', () => {
        deletes += 1
        return new Response(null, { status: 204 })
      }),
    )
    await within(nav()).findByRole('button', { name: 'G' })

    await user.click(
      within(nav()).getByRole('button', { name: 'Ações do grupo G' }),
    )
    await user.click(
      await screen.findByRole('menuitem', { name: 'Excluir grupo' }),
    )

    await waitFor(() => expect(order()).toEqual(['X', 'A', 'B', 'Y']))
    await waitFor(() => expect(saved).toHaveLength(1))
    expect(saved[0].items.map((item) => item.id)).toEqual(['X', 'A', 'B', 'Y'])
    expect(deletes).toBe(0)
  })
})
