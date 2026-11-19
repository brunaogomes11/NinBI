import { MESSAGES, type SidebarDto } from '@ninbi/contracts'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http, type RequestHandler } from 'msw'
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

/** O que a sidebar mostra, de cima para baixo. */
function order(): string[] {
  return Array.from(
    nav().querySelectorAll(
      'a[href^="/dashboards/"], button[draggable][aria-expanded]',
    ),
  ).map((element) => element.textContent ?? '')
}

const link = (name: string) => within(nav()).getByRole('link', { name })
const header = (name: string) => within(nav()).getByRole('button', { name })

/** Ids na ordem do corpo enviado, com os filhos de um grupo entre colchetes. */
function ids(body: SavedSidebar): string[] {
  return body.items.map((item) =>
    item.type === 'group'
      ? `${item.id}[${(item.items ?? []).map((c) => c.id).join(',')}]`
      : item.id,
  )
}

describe('arrastar na sidebar', () => {
  it('SIDE-03 arrastar um dashboard o mantém na posição em que foi solto', async () => {
    const saved: SavedSidebar[] = []
    open([dash('A'), dash('B'), dash('C')], sidebarSaveHandler(saved))
    await within(nav()).findByRole('link', { name: 'C' })

    fireEvent.dragStart(link('C'))
    fireEvent.dragOver(link('A'))
    fireEvent.drop(link('A'))

    await waitFor(() => expect(order()).toEqual(['C', 'A', 'B']))
    await waitFor(() => expect(saved).toHaveLength(1))
    expect(ids(saved[0])).toEqual(['C', 'A', 'B'])
    expect(order()).toEqual(['C', 'A', 'B'])
  })

  it('SIDE-04 arrastar um dashboard para dentro de um grupo', async () => {
    const saved: SavedSidebar[] = []
    open([dash('X'), dash('Y'), group('G', 'A')], sidebarSaveHandler(saved))
    await within(nav()).findByRole('link', { name: 'X' })

    fireEvent.dragStart(link('X'))
    fireEvent.drop(link('A'))

    await waitFor(() => expect(saved).toHaveLength(1))
    expect(ids(saved[0])).toEqual(['Y', 'G[X,A]'])
    expect(order()).toEqual(['Y', 'G', 'X', 'A'])

    fireEvent.dragStart(link('Y'))
    fireEvent.drop(header('G'))

    await waitFor(() => expect(saved).toHaveLength(2))
    expect(ids(saved[1])).toEqual(['G[X,A,Y]'])
    expect(order()).toEqual(['G', 'X', 'A', 'Y'])
  })

  it('SIDE-05 arrastar um dashboard para fora de um grupo', async () => {
    const saved: SavedSidebar[] = []
    open([group('G', 'A', 'B'), dash('C')], sidebarSaveHandler(saved))
    await within(nav()).findByRole('link', { name: 'A' })

    fireEvent.dragStart(link('A'))
    fireEvent.drop(link('C'))

    await waitFor(() => expect(saved).toHaveLength(1))
    expect(ids(saved[0])).toEqual(['G[B]', 'A', 'C'])
    expect(order()).toEqual(['G', 'B', 'A', 'C'])

    fireEvent.dragStart(link('B'))
    fireEvent.drop(screen.getByTestId('sidebar-end'))

    await waitFor(() => expect(saved).toHaveLength(2))
    expect(ids(saved[1])).toEqual(['G[]', 'A', 'C', 'B'])
  })

  it('SIDE-06 arrastar um grupo move o grupo com os dashboards', async () => {
    const saved: SavedSidebar[] = []
    open(
      [dash('A'), group('G', 'B', 'C'), dash('D')],
      sidebarSaveHandler(saved),
    )
    await within(nav()).findByRole('link', { name: 'A' })

    fireEvent.dragStart(header('G'))
    fireEvent.drop(link('A'))

    await waitFor(() => expect(saved).toHaveLength(1))
    expect(ids(saved[0])).toEqual(['G[B,C]', 'A', 'D'])
    expect(order()).toEqual(['G', 'B', 'C', 'A', 'D'])
  })

  it('SIDE-12 falha ao gravar volta o item e mostra Não foi possível salvar a organização', async () => {
    open(
      [dash('A'), dash('B'), dash('C')],
      http.put('/api/sidebar', () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'falhou' },
          { status: 500 },
        ),
      ),
    )
    await within(nav()).findByRole('link', { name: 'C' })

    fireEvent.dragStart(link('C'))
    fireEvent.drop(link('A'))

    expect(
      await screen.findByText(MESSAGES.sidebarSaveFailed),
    ).toBeInTheDocument()
    await waitFor(() => expect(order()).toEqual(['A', 'B', 'C']))
  })
})
