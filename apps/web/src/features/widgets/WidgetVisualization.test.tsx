import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  MESSAGES,
  type QueryResultDto,
  type WidgetDto,
  type WidgetMapping,
} from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { delay, HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockElementSize } from '@/test/element-size'
import { makeQueryResult, makeWidget } from '@/test/fixtures/dashboards'
import { renderApp } from '@/test/renderApp'
import { WidgetCard } from './WidgetCard'

const RUN_URL = '/api/dashboards/d-1/widgets/:id/run'

let restore: () => void
beforeEach(() => {
  restore = mockElementSize(600, 300)
})
afterEach(() => {
  restore()
  document.documentElement.classList.remove('dark')
})

const MONTHLY: QueryResultDto = makeQueryResult({
  columns: ['mes', 'vendas', 'custo'],
  rows: [
    ['jan', 1234.56, 800],
    ['fev', 2000, 900],
    ['mar', 1500, 1000],
  ],
})

type Mapping<V extends keyof WidgetMapping> = WidgetMapping[V]

function vizWidget<V extends keyof WidgetMapping>(
  id: string,
  title: string,
  visualization: V,
  mapping: Mapping<V>,
): WidgetDto {
  return makeWidget({
    id,
    title,
    visualization,
    config: { mapping },
    layout: { x: 0, y: 0, w: 4, h: 4 },
  })
}

function openCards(
  widgets: WidgetDto[],
  results: Record<string, QueryResultDto>,
  extra: ReturnType<typeof http.post>[] = [],
) {
  return renderApp('/', {
    routes: [
      {
        path: '/',
        element: (
          <div>
            {widgets.map((widget) => (
              <WidgetCard
                key={widget.id}
                dashboardId="d-1"
                version={1}
                widget={widget}
              />
            ))}
          </div>
        ),
      },
    ],
    handlers: [
      ...extra,
      http.post(RUN_URL, ({ params }) =>
        HttpResponse.json(results[String(params.id)] ?? MONTHLY),
      ),
    ],
  })
}

const cardOf = (title: string) =>
  screen.getByRole('heading', { name: title }).parentElement as HTMLElement

describe('WidgetVisualization', () => {
  it('VIZ-12 card mostra A visualização não combina com o resultado', async () => {
    openCards(
      [
        vizWidget('w-1', 'Vendas', 'BAR', {
          x: 'mes',
          series: ['vendas'],
          stacked: false,
          horizontal: false,
        }),
      ],
      {
        'w-1': makeQueryResult({
          columns: ['mes', 'total'],
          rows: [['jan', 10]],
        }),
      },
    )
    expect(
      await screen.findByText(
        'A visualização não combina com o resultado: a coluna vendas não existe',
      ),
    ).toBeInTheDocument()
  })

  it('VIZ-13 card mostra A coluna não tem números', async () => {
    openCards(
      [
        vizWidget('w-1', 'Vendas', 'BAR', {
          x: 'mes',
          series: ['vendas'],
          stacked: false,
          horizontal: false,
        }),
      ],
      {
        'w-1': makeQueryResult({
          columns: ['mes', 'vendas'],
          rows: [
            ['jan', 'n/d'],
            ['fev', null],
          ],
        }),
      },
    )
    expect(
      await screen.findByText('A coluna vendas não tem números'),
    ).toBeInTheDocument()
  })

  it('VIZ-18 gráficos usam os estados de carregando, sem dados e erro', async () => {
    const widget = vizWidget('w-1', 'Vendas', 'BAR', {
      x: 'mes',
      series: ['vendas'],
      stacked: false,
      horizontal: false,
    })

    const pending = openCards([widget], {}, [
      http.post(RUN_URL, async () => {
        await delay('infinite')
        return HttpResponse.json(MONTHLY)
      }),
    ])
    await waitFor(() =>
      expect(
        pending.container.querySelectorAll('[data-slot="skeleton"]').length,
      ).toBeGreaterThan(0),
    )
    pending.unmount()

    const empty = openCards([widget], {
      'w-1': makeQueryResult({ columns: ['mes', 'vendas'], rows: [] }),
    })
    expect(await screen.findByText(MESSAGES.queryNoData)).toBeInTheDocument()
    empty.unmount()

    let failing = true
    const failed = openCards([widget], {}, [
      http.post(RUN_URL, () =>
        failing
          ? HttpResponse.json(
              { code: 'QUERY_FAILED', message: 'Variable `l` not defined' },
              { status: 422 },
            )
          : HttpResponse.json(MONTHLY),
      ),
    ])
    expect(
      await screen.findByText('Variable `l` not defined'),
    ).toBeInTheDocument()
    failing = false
    await failed.user.click(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    )
    await waitFor(() =>
      expect(
        failed.container.querySelector('.recharts-bar-rectangle'),
      ).toBeInTheDocument(),
    )
  })

  it('KPI-01 card de KPI mostra o título e o valor', async () => {
    openCards(
      [vizWidget('w-1', 'Saldo', 'KPI', { value: 'saldo', change: null })],
      {
        'w-1': makeQueryResult({ columns: ['saldo'], rows: [[4999.95]] }),
      },
    )
    expect(await screen.findByText('4.999,95')).toBeInTheDocument()
    const title = screen.getByRole('heading', { name: 'Saldo' })
    expect(title.parentElement?.firstElementChild).toBe(title)
  })

  it('MAP-04 mapa sem coordenadas válidas mostra Nenhuma linha com coordenadas válidas', async () => {
    openCards(
      [
        vizWidget('w-1', 'Lojas', 'MAP', {
          lat: 'lat',
          lon: 'lon',
          label: 'loja',
        }),
      ],
      {
        'w-1': makeQueryResult({
          columns: ['loja', 'lat', 'lon'],
          rows: [
            ['Centro', 200, -46],
            ['Norte', null, 'abc'],
          ],
        }),
      },
    )
    expect(
      await screen.findByText('Nenhuma linha com coordenadas válidas'),
    ).toBeInTheDocument()
  })

  it('CHART-18 pizza só com zeros mostra A consulta não retornou dados', async () => {
    openCards(
      [
        vizWidget('w-1', 'Participação', 'PIE', {
          category: 'mes',
          value: 'vendas',
          donut: false,
        }),
      ],
      {
        'w-1': makeQueryResult({
          columns: ['mes', 'vendas'],
          rows: [
            ['jan', 0],
            ['fev', 0],
          ],
        }),
      },
    )
    expect(await screen.findByText(MESSAGES.queryNoData)).toBeInTheDocument()
  })

  it('LOOK-01 dashboard com área, listas, KPI e mapa usa os cards do tema e o gradiente da logo', async () => {
    document.documentElement.classList.add('dark')
    const { container } = openCards(
      [
        vizWidget('area', 'Receita', 'AREA', {
          x: 'mes',
          series: ['vendas'],
          stacked: false,
        }),
        vizWidget('lista', 'Lojas', 'LIST', {
          primary: 'nome',
          secondary: null,
          values: ['total'],
        }),
        vizWidget('kpi', 'Saldo', 'KPI', {
          value: 'saldo',
          change: 'variacao',
        }),
        vizWidget('mapa', 'Mapa', 'MAP', {
          lat: 'lat',
          lon: 'lon',
          label: 'loja',
        }),
      ],
      {
        lista: makeQueryResult({
          columns: ['nome', 'total'],
          rows: [['Centro', 10]],
        }),
        kpi: makeQueryResult({
          columns: ['saldo', 'variacao'],
          rows: [[4999.95, 20]],
        }),
        mapa: makeQueryResult({
          columns: ['loja', 'lat', 'lon'],
          rows: [['Centro', -23.55, -46.63]],
        }),
      },
    )
    expect(await screen.findByText('4.999,95')).toBeInTheDocument()
    await waitFor(() =>
      expect(
        container.querySelector('.recharts-area-curve'),
      ).toBeInTheDocument(),
    )
    await waitFor(() =>
      expect(
        container.querySelector('.leaflet-marker-icon'),
      ).toBeInTheDocument(),
    )
    expect(screen.getByText('Centro', { selector: 'p' })).toBeInTheDocument()

    expect(document.documentElement).toHaveClass('dark')
    for (const title of ['Receita', 'Lojas', 'Saldo', 'Mapa']) {
      expect(cardOf(title)).toHaveClass('bg-card', 'rounded-card')
    }
    const gradient = container.getElementsByTagName('linearGradient')[0]
    const stops = [...(gradient?.getElementsByTagName('stop') ?? [])].map(
      (stop) => stop.getAttribute('stop-color'),
    )
    expect(stops).toEqual(['var(--brand-teal)', 'var(--brand-cyan)'])
    expect(screen.getByText('20%')).toHaveClass('text-accent-text')
  })

  it('LOOK-02 barras, linha, pizza, radar e radial usam a grade, as cores e a dica do tema', async () => {
    const { container } = openCards(
      [
        vizWidget('bar', 'Barras', 'BAR', {
          x: 'mes',
          series: ['vendas'],
          stacked: false,
          horizontal: false,
        }),
        vizWidget('line', 'Linha', 'LINE', { x: 'mes', series: ['vendas'] }),
        vizWidget('pie', 'Pizza', 'PIE', {
          category: 'mes',
          value: 'vendas',
          donut: false,
        }),
        vizWidget('radar', 'Radar', 'RADAR', {
          axis: 'mes',
          series: ['vendas', 'custo'],
        }),
        vizWidget('radial', 'Radial', 'RADIAL', {
          category: 'mes',
          value: 'vendas',
        }),
      ],
      {},
    )
    await waitFor(() => {
      expect(
        container.querySelector('.recharts-bar-rectangle'),
      ).toBeInTheDocument()
      expect(
        container.querySelector('.recharts-line-curve'),
      ).toBeInTheDocument()
      expect(
        container.querySelector('.recharts-pie-sector, .recharts-sector'),
      ).toBeInTheDocument()
      expect(
        container.querySelector('.recharts-radar-polygon'),
      ).toBeInTheDocument()
      expect(
        container.querySelector('.recharts-radial-bar-sector'),
      ).toBeInTheDocument()
    })

    for (const title of ['Barras', 'Linha']) {
      const lines = cardOf(title).querySelectorAll(
        '.recharts-cartesian-grid-horizontal line',
      )
      expect(lines.length).toBeGreaterThan(0)
      for (const line of lines) {
        expect(line.getAttribute('stroke')).toBe('var(--border)')
        expect(line.getAttribute('stroke-dasharray')).toBe('3 3')
      }
    }
    const polarGrid = cardOf('Radar').querySelectorAll(
      '.recharts-polar-grid [stroke]',
    )
    expect(polarGrid.length).toBeGreaterThan(0)
    for (const element of polarGrid) {
      expect(element.getAttribute('stroke')).toBe('var(--border)')
    }

    expect(
      cardOf('Barras')
        .querySelector('.recharts-bar-rectangle path')
        ?.getAttribute('fill'),
    ).toBe('var(--color-s0)')
    expect(
      cardOf('Linha')
        .querySelector('.recharts-line-curve')
        ?.getAttribute('stroke'),
    ).toBe('var(--color-s0)')
    expect(
      cardOf('Pizza').querySelector('.recharts-sector')?.getAttribute('fill'),
    ).toBe('var(--color-c0)')
    expect(
      cardOf('Radar')
        .querySelector('.recharts-radar [stroke]')
        ?.getAttribute('stroke'),
    ).toBe('var(--color-s0)')
    expect(
      cardOf('Radial')
        .querySelector('.recharts-radial-bar-sector')
        ?.getAttribute('fill'),
    ).toBe('var(--color-c0)')

    for (const title of ['Barras', 'Linha', 'Pizza', 'Radar', 'Radial']) {
      expect(
        cardOf(title).querySelector('.recharts-tooltip-wrapper'),
      ).toBeInTheDocument()
    }
  })

  it('LOOK-03 widgets não escrevem cor literal e o tema claro define as cores dos gráficos', () => {
    const root = join(process.cwd(), 'src/features/widgets')
    const files = (readdirSync(root, { recursive: true }) as string[]).filter(
      (file) => file.endsWith('.tsx') && !file.endsWith('.test.tsx'),
    )
    expect(files.length).toBeGreaterThan(8)
    const literal = /#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|oklch\(/
    for (const file of files) {
      const text = readFileSync(join(root, file), 'utf-8')
      expect(text, file).not.toMatch(literal)
    }

    const css = readFileSync(
      join(process.cwd(), 'src/styles/theme.css'),
      'utf-8',
    )
    const block = (selector: RegExp) => css.match(selector)?.[0] ?? ''
    const light = block(/:root\s*\{[^}]*\}/)
    const dark = block(/\.dark\s*\{[^}]*\}/)
    for (const n of [1, 2, 3, 4, 5]) {
      expect(light).toMatch(new RegExp(`--chart-${n}:`))
      expect(dark).toMatch(new RegExp(`--chart-${n}:`))
    }
  })

  it('LOOK-04 menu do card de gráfico em edição tem Editar widget e Remover widget', async () => {
    const widget = vizWidget('w-1', 'Vendas', 'BAR', {
      x: 'mes',
      series: ['vendas'],
      stacked: false,
      horizontal: false,
    })
    const { user, container } = renderApp('/', {
      routes: [
        {
          path: '/',
          element: (
            <WidgetCard
              dashboardId="d-1"
              version={1}
              widget={widget}
              edit={{
                connectionId: 'c-1',
                onEdit: () => {},
                onRemove: () => {},
              }}
            />
          ),
        },
      ],
      handlers: [
        http.post('/api/dashboards/d-1/query', () =>
          HttpResponse.json(MONTHLY),
        ),
      ],
    })
    await waitFor(() =>
      expect(
        container.querySelector('.recharts-bar-rectangle'),
      ).toBeInTheDocument(),
    )
    await user.click(
      screen.getByRole('button', { name: 'Ações do widget Vendas' }),
    )
    const menu = await screen.findByRole('menu')
    expect(
      within(menu).getByRole('menuitem', { name: 'Editar widget' }),
    ).toBeInTheDocument()
    expect(
      within(menu).getByRole('menuitem', { name: 'Remover widget' }),
    ).toBeInTheDocument()
  })
})
