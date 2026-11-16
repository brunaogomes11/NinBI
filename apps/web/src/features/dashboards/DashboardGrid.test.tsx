import type { DashboardDto, WidgetLayout } from '@ninbi/contracts'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http, type RequestHandler } from 'msw'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { connectionsHandler, makeConnection } from '@/test/fixtures/connections'
import {
  makeDashboard,
  makeQueryResult,
  makeWidget,
  sidebarHandler,
} from '@/test/fixtures/dashboards'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

// Largura fixa de 1.200 px (jsdom): colunas de 85,33 px com margem de 16 px, passo de 101,33 px.
const COLUMN_STEP = (1200 - 16 * 11) / 12 + 16

const widgetA = makeWidget({
  id: 'w-a',
  title: 'Alfa',
  layout: { x: 0, y: 0, w: 4, h: 3 },
})
const widgetB = makeWidget({
  id: 'w-b',
  title: 'Beta',
  layout: { x: 4, y: 0, w: 4, h: 3 },
})

const dashboardWith = (...widgets: ReturnType<typeof makeWidget>[]) =>
  makeDashboard({ tabs: [{ id: 't-1', name: 'Aba 1', widgets }] })

function open(path: string, dashboard: DashboardDto, puts: unknown[] = []) {
  const handlers: RequestHandler[] = [
    setupStatusHandler(false),
    sessionHandler(makeUser()),
    sidebarHandler(),
    connectionsHandler([makeConnection({ id: 'c-1', name: 'Vendas' })]),
    http.get(`/api/dashboards/${dashboard.id}`, () =>
      HttpResponse.json(dashboard),
    ),
    http.post('/api/dashboards/:id/query', () =>
      HttpResponse.json(makeQueryResult()),
    ),
    http.post('/api/dashboards/:id/widgets/:widgetId/run', () =>
      HttpResponse.json(makeQueryResult()),
    ),
    http.put('/api/dashboards/:id', async ({ request }) => {
      puts.push(await request.json())
      return HttpResponse.json(dashboard)
    }),
  ]
  return renderApp(path, { handlers })
}

const cardOf = (title: string) =>
  screen.getByText(title).closest('.react-grid-item') as HTMLElement

/** Salva e devolve o layout de cada widget da primeira aba, pelo id. */
async function savedLayouts(
  user: ReturnType<typeof open>['user'],
  puts: unknown[],
) {
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(puts).toHaveLength(1))
  const body = puts[0] as {
    tabs: { widgets: { id: string; layout: WidgetLayout }[] }[]
  }
  return Object.fromEntries(
    body.tabs[0].widgets.map((widget) => [widget.id, widget.layout]),
  )
}

function dragBy(handle: Element, dx: number, dy: number) {
  fireEvent.mouseDown(handle, { clientX: 100, clientY: 100, button: 0 })
  fireEvent.mouseMove(document, {
    clientX: 100 + dx / 2,
    clientY: 100 + dy / 2,
  })
  fireEvent.mouseMove(document, { clientX: 100 + dx, clientY: 100 + dy })
  fireEvent.mouseUp(document, { clientX: 100 + dx, clientY: 100 + dy })
}

const overlaps = (a: WidgetLayout, b: WidgetLayout) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

describe('DashboardGrid', () => {
  // O jsdom não calcula `offsetParent`, de que o arraste do react-grid-layout depende.
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      configurable: true,
      get(this: HTMLElement) {
        return this.parentElement
      },
    })
  })
  afterAll(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'offsetParent')
  })

  it('GRID-01 grade tem 12 colunas', async () => {
    open(
      '/dashboards/d-1',
      dashboardWith(
        makeWidget({
          id: 'w-meio',
          title: 'Meio',
          layout: { x: 0, y: 0, w: 6, h: 3 },
        }),
      ),
    )
    await screen.findByText('Meio')

    // metade das 12 colunas: (1200 - 16) / 2 = 592 px
    expect(cardOf('Meio').style.width).toBe('592px')
  })

  it('GRID-02 arrastar um widget o põe na célula solta sem sobreposição', async () => {
    const puts: unknown[] = []
    const { user } = open(
      '/dashboards/d-1?editar=1',
      dashboardWith(widgetA, widgetB),
      puts,
    )
    await screen.findByText('Alfa')

    dragBy(screen.getByText('Alfa'), 4 * COLUMN_STEP, 0)
    const layouts = await savedLayouts(user, puts)

    expect(layouts['w-a']).toMatchObject({ x: 4, y: 0 })
    expect(layouts['w-b'].y).toBeGreaterThanOrEqual(3)
    expect(overlaps(layouts['w-a'], layouts['w-b'])).toBe(false)
  })

  it('GRID-03 redimensionar respeita 2 por 2 no mínimo e 12 colunas no máximo', async () => {
    const puts: unknown[] = []
    const { user } = open(
      '/dashboards/d-1?editar=1',
      dashboardWith(widgetA),
      puts,
    )
    await screen.findByText('Alfa')
    const handle = () =>
      cardOf('Alfa').querySelector('.react-resizable-handle-se') as Element

    dragBy(handle(), -2000, -2000)
    await waitFor(() => expect(cardOf('Alfa').style.width).toBe('187px'))
    expect(cardOf('Alfa').style.height).toBe('176px')

    dragBy(handle(), 5000, 0)
    await waitFor(() => expect(cardOf('Alfa').style.width).toBe('1200px'))

    const layouts = await savedLayouts(user, puts)
    expect(layouts['w-a']).toMatchObject({ x: 0, w: 12, h: 2 })
  })

  it('GRID-04 fora da edição não há alça de arrasto nem de redimensionamento', async () => {
    const { container } = open('/dashboards/d-1', dashboardWith(widgetA))
    await screen.findByText('Alfa')

    expect(container.querySelectorAll('.react-resizable-handle').length).toBe(0)
    expect(container.querySelectorAll('.react-draggable').length).toBe(0)
  })

  it('GRID-05 Novo widget adiciona um widget 4 por 4 no fim da aba e abre o editor', async () => {
    const puts: unknown[] = []
    const { user } = open(
      '/dashboards/d-1?editar=1',
      dashboardWith(widgetA, widgetB),
      puts,
    )
    await screen.findByText('Alfa')

    await user.click(screen.getByRole('button', { name: 'Novo widget' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(
      await screen.findByRole('heading', { name: 'Novo widget' }),
    ).toBeInTheDocument()
    const layouts = await savedLayouts(user, puts)
    const created = Object.entries(layouts).find(
      ([id]) => id !== 'w-a' && id !== 'w-b',
    )
    expect(created?.[1]).toEqual({ x: 0, y: 3, w: 4, h: 4 })
  })

  it('GRID-06 posição e tamanho arrastados vão no Salvar', async () => {
    const puts: unknown[] = []
    const { user } = open(
      '/dashboards/d-1?editar=1',
      dashboardWith(widgetA),
      puts,
    )
    await screen.findByText('Alfa')

    dragBy(screen.getByText('Alfa'), 2 * COLUMN_STEP, 0)
    const layouts = await savedLayouts(user, puts)

    expect(layouts['w-a']).toMatchObject({ x: 2, y: 0, w: 4, h: 3 })
  })
})
