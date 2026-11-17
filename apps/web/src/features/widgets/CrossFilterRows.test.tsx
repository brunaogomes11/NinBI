import type { DashboardDto, QueryResultDto } from '@ninbi/contracts'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockElementSize } from '@/test/element-size'
import { connectionsHandler } from '@/test/fixtures/connections'
import {
  makeDashboard,
  makeQueryResult,
  makeWidget,
} from '@/test/fixtures/dashboards'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

const FILTER_ID = '6b0c2f3e-6a52-4a63-9a40-9d1d6f5d1a11'

let restoreSize: () => void
beforeEach(() => {
  restoreSize = mockElementSize(400, 300)
})
afterEach(() => restoreSize())

function dashboardWith(
  visualization: string,
  config: Record<string, unknown>,
  column: string,
): DashboardDto {
  return makeDashboard({
    filters: [
      {
        id: FILTER_ID,
        label: 'Categoria',
        parameter: 'categoria',
        type: 'SINGLE_SELECT',
        options: { source: 'STATIC', values: ['Livros', 'Jogos'] },
        defaultValue: null,
      },
    ],
    tabs: [
      {
        id: 't-1',
        name: 'Aba 1',
        widgets: [
          makeWidget({
            id: 'w-1',
            title: 'Itens',
            visualization,
            config: { ...config, crossFilter: { filterId: FILTER_ID, column } },
            layout: { x: 0, y: 0, w: 8, h: 6 },
          }),
        ],
      },
    ],
  })
}

function open(dashboard: DashboardDto, result: QueryResultDto) {
  return renderApp('/dashboards/d-1', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      connectionsHandler(),
      http.get('/api/dashboards/d-1', () => HttpResponse.json(dashboard)),
      http.post('/api/dashboards/:id/widgets/:widgetId/run', () =>
        HttpResponse.json(result),
      ),
    ],
  })
}

type App = ReturnType<typeof open>

const rowAt = (app: App, index: number) =>
  app.container.querySelector<HTMLElement>(`[data-row-index="${index}"]`)

const categoria = () => screen.findByRole('combobox', { name: 'Categoria' })

const LIST = {
  mapping: {
    primary: 'categoria',
    secondary: null,
    values: ['total'],
  },
}

const CATEGORIES = makeQueryResult({
  columns: ['categoria', 'total'],
  rows: [
    ['Livros', 10],
    ['Jogos', 20],
    ['Eletrônicos', 30],
  ],
})

describe('Ao clicar em listas, tabelas e marcadores', () => {
  it('XFL-02 clicar em linha de lista, linha de tabela e marcador define o filtro', async () => {
    // lista: a linha "Livros"
    const list = open(dashboardWith('LIST', LIST, 'categoria'), CATEGORIES)
    await waitFor(() => expect(rowAt(list, 0)).not.toBeNull())
    await list.user.click(rowAt(list, 0) as HTMLElement)
    await waitFor(async () =>
      expect(await categoria()).toHaveTextContent('Livros'),
    )
    list.unmount()

    // tabela ordenada por "total" decrescente, na página 2: vale a linha clicada, não a posição
    const many = makeQueryResult({
      columns: ['categoria', 'total'],
      rows: Array.from({ length: 60 }, (_, i) => [
        `Item ${String(i + 1).padStart(2, '0')}`,
        i + 1,
      ]),
    })
    const table = open(dashboardWith('TABLE', {}, 'categoria'), many)
    const sortButton = await screen.findByRole('button', { name: /total/ })
    await table.user.click(sortButton)
    await table.user.click(sortButton)
    await table.user.click(
      await screen.findByRole('button', { name: 'Próxima página' }),
    )
    // página 2 em ordem decrescente: o primeiro é o 10º menor valor, "Item 10"
    const firstOnPage = table.container.querySelector<HTMLElement>(
      'tbody tr[data-row-index]',
    ) as HTMLElement
    expect(firstOnPage).toHaveTextContent('Item 10')
    await table.user.click(firstOnPage)
    await waitFor(async () =>
      expect(await categoria()).toHaveTextContent('Item 10'),
    )
    table.unmount()

    // mapa: o marcador "Centro"
    const geo = makeQueryResult({
      columns: ['loja', 'lat', 'lon'],
      rows: [
        ['Centro', -23.55, -46.63],
        ['Norte', -23.5, -46.6],
      ],
    })
    const map = open(
      dashboardWith(
        'MAP',
        { mapping: { lat: 'lat', lon: 'lon', label: 'loja' } },
        'loja',
      ),
      geo,
    )
    await waitFor(() =>
      expect(
        map.container.querySelectorAll('.leaflet-marker-icon'),
      ).toHaveLength(2),
    )
    const marker = Array.from(
      map.container.querySelectorAll<HTMLElement>('.leaflet-marker-icon'),
    ).find((icon) => icon.textContent === 'Centro') as HTMLElement
    fireEvent.click(marker)
    await waitFor(async () =>
      expect(await categoria()).toHaveTextContent('Centro'),
    )
  })

  it('XFL-04 linha e marcador selecionados ficam destacados', async () => {
    const list = open(dashboardWith('LIST', LIST, 'categoria'), CATEGORIES)
    await waitFor(() => expect(rowAt(list, 1)).not.toBeNull())
    await list.user.click(rowAt(list, 1) as HTMLElement)
    await waitFor(() =>
      expect(rowAt(list, 1)).toHaveAttribute('data-selected', 'true'),
    )
    expect(rowAt(list, 0)).toHaveAttribute('data-dimmed', 'true')
    expect(rowAt(list, 2)).toHaveAttribute('data-dimmed', 'true')
    list.unmount()

    const geo = makeQueryResult({
      columns: ['loja', 'lat', 'lon'],
      rows: [
        ['Centro', -23.55, -46.63],
        ['Norte', -23.5, -46.6],
      ],
    })
    const map = open(
      dashboardWith(
        'MAP',
        { mapping: { lat: 'lat', lon: 'lon', label: 'loja' } },
        'loja',
      ),
      geo,
    )
    await waitFor(() =>
      expect(
        map.container.querySelectorAll('.leaflet-marker-icon'),
      ).toHaveLength(2),
    )
    const centro = () =>
      Array.from(
        map.container.querySelectorAll<HTMLElement>('.leaflet-marker-icon'),
      ).find((icon) => icon.textContent === 'Centro') as HTMLElement
    fireEvent.click(centro())
    await waitFor(() =>
      expect(centro().querySelector('[data-selected="true"]')).not.toBeNull(),
    )
    const norte = Array.from(
      map.container.querySelectorAll<HTMLElement>('.leaflet-marker-icon'),
    ).find((icon) => icon.textContent === 'Norte') as HTMLElement
    expect(norte.querySelector('[data-dimmed="true"]')).not.toBeNull()
  })
})
