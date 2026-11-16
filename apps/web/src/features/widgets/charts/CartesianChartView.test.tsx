import type { QueryResultDto } from '@ninbi/contracts'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockElementSize, resizeTo } from '@/test/element-size'
import { makeQueryResult } from '@/test/fixtures/dashboards'
import { buildCartesian } from '../mapping/chart-data'
import { CartesianChartView } from './CartesianChartView'
import { NinbiTooltip } from './chart-theme'

let restore: () => void
beforeEach(() => {
  restore = mockElementSize(600, 300)
})
afterEach(() => restore())

const monthly = (): QueryResultDto =>
  makeQueryResult({
    columns: ['mes', 'vendas', 'custo'],
    rows: [
      ['jan', 1234.56, 800],
      ['fev', 2000, 900],
      ['mar', 1500, 1000],
    ],
  })

function draw(
  visualization: 'AREA' | 'BAR' | 'LINE',
  result: QueryResultDto,
  options: {
    series?: string[]
    stacked?: boolean
    horizontal?: boolean
  } = {},
) {
  const mapping = {
    x: 'mes',
    series: options.series ?? ['vendas', 'custo'],
    stacked: options.stacked,
    horizontal: options.horizontal,
  }
  const built = buildCartesian(result, mapping)
  if (!built.ok) throw new Error('dados inválidos no teste')
  return render(
    <CartesianChartView
      visualization={visualization}
      data={built.data}
      mapping={mapping}
    />,
  )
}

const commands = (d: string | null) => (d ?? '').match(/[MLC][^MLC]*/g) ?? []

describe('CartesianChartView', () => {
  it('CHART-01 área, barras e linha desenham um ponto por linha', () => {
    const area = draw('AREA', monthly(), { series: ['vendas'] })
    const areaPath = area.container.querySelector('.recharts-area-curve')
    expect(areaPath).toBeInTheDocument()
    expect(commands(areaPath?.getAttribute('d') ?? '')).toHaveLength(3)
    area.unmount()

    const line = draw('LINE', monthly(), { series: ['vendas'] })
    const linePath = line.container.querySelector('.recharts-line-curve')
    expect(linePath).toBeInTheDocument()
    expect(commands(linePath?.getAttribute('d') ?? '')).toHaveLength(3)
    line.unmount()

    const bar = draw('BAR', monthly(), { series: ['vendas'] })
    expect(
      bar.container.querySelectorAll('.recharts-bar-rectangle'),
    ).toHaveLength(3)
  })

  it('CHART-02 legenda mostra o nome de cada série quando há mais de uma', () => {
    const many = draw('LINE', monthly())
    expect(
      many.container.querySelector('.recharts-line-curve'),
    ).toBeInTheDocument()
    const legend = many.container.querySelector('.recharts-legend-wrapper')
    expect(legend).toBeInTheDocument()
    expect(
      within(legend as HTMLElement).getByText('vendas'),
    ).toBeInTheDocument()
    expect(within(legend as HTMLElement).getByText('custo')).toBeInTheDocument()
    many.unmount()

    const one = draw('LINE', monthly(), { series: ['vendas'] })
    expect(
      one.container.querySelector('.recharts-line-curve'),
    ).toBeInTheDocument()
    expect(one.container.querySelector('.recharts-legend-wrapper')).toBeNull()
  })

  it('CHART-03 dica mostra o valor do eixo X e de cada série', async () => {
    const chart = draw('BAR', monthly())
    expect(
      chart.container.querySelector('.recharts-bar-rectangle'),
    ).toBeInTheDocument()
    const wrapper = chart.container.querySelector('.recharts-tooltip-wrapper')
    expect(wrapper?.textContent).toBe('')
    // o Recharts acha o ponto pela posição do mouse sobre o gráfico
    const surface = chart.container.querySelector(
      '.recharts-wrapper',
    ) as HTMLElement
    fireEvent.mouseMove(surface, { clientX: 100, clientY: 100 })
    await waitFor(() => {
      expect(wrapper).toHaveTextContent('jan')
      expect(wrapper).toHaveTextContent('vendas')
      expect(wrapper).toHaveTextContent('1.234,56')
      expect(wrapper).toHaveTextContent('custo')
      expect(wrapper).toHaveTextContent('800')
    })
    chart.unmount()

    render(
      <NinbiTooltip
        active
        payload={[
          {
            name: 'vendas',
            value: 1234.56,
            color: 'var(--chart-1)',
            payload: { xLabel: 'jan' },
          },
          {
            name: 'custo',
            value: 800,
            color: 'var(--chart-2)',
            payload: { xLabel: 'jan' },
          },
        ]}
      />,
    )
    expect(screen.getByText('jan')).toBeInTheDocument()
    expect(screen.getByText('vendas')).toBeInTheDocument()
    expect(screen.getByText('1.234,56')).toBeInTheDocument()
    expect(screen.getByText('custo')).toBeInTheDocument()
    expect(screen.getByText('800')).toBeInTheDocument()
  })

  it('CHART-04 Horizontal desenha as barras na horizontal', () => {
    const { container } = draw('BAR', monthly(), {
      series: ['vendas'],
      horizontal: true,
    })
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(
      3,
    )
    const vertical = container.querySelector(
      '.recharts-yAxis-tick-labels',
    ) as HTMLElement
    const horizontal = container.querySelector(
      '.recharts-xAxis-tick-labels',
    ) as HTMLElement
    for (const category of ['jan', 'fev', 'mar']) {
      expect(within(vertical).getByText(category)).toBeInTheDocument()
    }
    expect(within(horizontal).getByText('1.000')).toBeInTheDocument()
    expect(within(horizontal).queryByText('jan')).toBeNull()
  })

  it('CHART-05 Empilhado empilha as séries', () => {
    const bars = draw('BAR', monthly(), { stacked: true })
    const rects = (series: number) =>
      [
        ...bars.container.querySelectorAll(
          `.recharts-bar:nth-of-type(${series}) .recharts-bar-rectangle path`,
        ),
      ].map((el) => ({
        x: Number(el.getAttribute('x')),
        y: Number(el.getAttribute('y')),
        height: Number(el.getAttribute('height')),
      }))
    const first = rects(1)
    const second = rects(2)
    expect(first).toHaveLength(3)
    expect(second).toHaveLength(3)
    first.forEach((rect, i) => {
      expect(second[i]?.x).toBeCloseTo(rect.x)
      // a segunda série termina onde a primeira começa (por cima dela)
      expect((second[i]?.y ?? 0) + (second[i]?.height ?? 0)).toBeCloseTo(rect.y)
    })
    bars.unmount()

    const top = (container: HTMLElement, n: number) => {
      const d = container
        .querySelectorAll('.recharts-area-curve')
        [n]?.getAttribute('d')
      return Number((d ?? '').match(/M[\d.]+,([\d.]+)/)?.[1])
    }
    const stacked = draw('AREA', monthly(), { stacked: true })
    expect(top(stacked.container, 1)).toBeLessThan(top(stacked.container, 0))
    stacked.unmount()
    const plain = draw('AREA', monthly(), { stacked: false })
    expect(top(plain.container, 1)).toBeGreaterThan(top(plain.container, 0))
  })

  it('CHART-06 eixo X mostra só parte dos rótulos quando não cabem', () => {
    restore()
    restore = mockElementSize(300, 300)
    const rows = Array.from(
      { length: 30 },
      (_, i): [string, number, number] => [
        `d${String(i + 1).padStart(2, '0')}`,
        i,
        i,
      ],
    )
    const { container } = draw(
      'LINE',
      makeQueryResult({ columns: ['mes', 'vendas', 'custo'], rows }),
      { series: ['vendas'] },
    )
    expect(container.querySelector('.recharts-line-curve')).toBeInTheDocument()
    const ticks = container.querySelectorAll(
      '.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-label',
    )
    expect(ticks).toHaveLength(8)
  })

  it('CHART-08 redimensionar o card redesenha o gráfico no novo tamanho', () => {
    const { container } = draw('LINE', monthly(), { series: ['vendas'] })
    const svg = () => container.querySelector('svg.recharts-surface')
    expect(svg()).toBeInTheDocument()
    expect(svg()?.getAttribute('width')).toBe('600')
    resizeTo(800, 400)
    expect(svg()?.getAttribute('width')).toBe('800')
    expect(svg()?.getAttribute('height')).toBe('400')
  })

  it('CHART-16 uma linha só desenha um ponto visível', () => {
    const one = makeQueryResult({
      columns: ['mes', 'vendas'],
      rows: [['jan', 10]],
    })
    const area = draw('AREA', one, { series: ['vendas'] })
    expect(area.container.querySelector('.recharts-area')).toBeInTheDocument()
    expect(area.container.querySelectorAll('circle')).toHaveLength(1)
    area.unmount()
    const line = draw('LINE', one, { series: ['vendas'] })
    expect(line.container.querySelector('.recharts-line')).toBeInTheDocument()
    expect(line.container.querySelectorAll('circle')).toHaveLength(1)
  })

  it('VIZ-17 eixos e dica formatam números e datas', () => {
    const { container } = draw(
      'LINE',
      makeQueryResult({
        columns: ['mes', 'vendas'],
        rows: [
          ['2024-02-05', 1000],
          ['2024-02-06', 2000],
        ],
      }),
      { series: ['vendas'] },
    )
    expect(container.querySelector('.recharts-line-curve')).toBeInTheDocument()
    const y = container.querySelector(
      '.recharts-yAxis-tick-labels',
    ) as HTMLElement
    expect(within(y).getByText('1.000')).toBeInTheDocument()
    const x = container.querySelector(
      '.recharts-xAxis-tick-labels',
    ) as HTMLElement
    expect(within(x).getByText('05/02/2024')).toBeInTheDocument()
  })
})
