import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockElementSize } from '@/test/element-size'
import { makeQueryResult } from '@/test/fixtures/dashboards'
import { buildCategories, buildRadar } from '../mapping/chart-data'
import { NinbiTooltip } from './chart-theme'
import { RadarChartView, RadialChartView } from './PolarChartViews'

let restore: () => void
beforeEach(() => {
  restore = mockElementSize(600, 300)
})
afterEach(() => restore())

function rowsOf(n: number): [string, number, number][] {
  return Array.from({ length: n }, (_, i) => [
    `Loja ${i + 1}`,
    (i + 1) * 10,
    (i + 1) * 5,
  ])
}

function drawRadar(n: number) {
  const mapping = { axis: 'loja', series: ['vendas', 'custo'] }
  const built = buildRadar(
    makeQueryResult({ columns: ['loja', 'vendas', 'custo'], rows: rowsOf(n) }),
    mapping,
  )
  if (!built.ok) throw new Error('dados inválidos no teste')
  return render(
    <RadarChartView
      data={built.data}
      series={mapping.series}
      notice={built.notice}
    />,
  )
}

function drawRadial(n: number) {
  const built = buildCategories(
    makeQueryResult({ columns: ['loja', 'total'], rows: rowsOf(n) }),
    { category: 'loja', value: 'total' },
    'RADIAL',
  )
  if (!built.ok) throw new Error('dados inválidos no teste')
  return render(<RadialChartView data={built.data} notice={built.notice} />)
}

/** Ângulo (rad) do arco externo de um setor, da corda e do raio do primeiro `A` do caminho. */
function sweep(d: string | null): number {
  const numbers = (d ?? '').match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g)?.map(Number)
  if (!numbers || numbers.length < 9) return 0
  const [x1 = 0, y1 = 0, r = 1, , , large = 0, , x2 = 0, y2 = 0] = numbers
  const chord = Math.hypot(x2 - x1, y2 - y1)
  const angle = 2 * Math.asin(Math.min(1, chord / (2 * r)))
  return large === 1 ? 2 * Math.PI - angle : angle
}

describe('PolarChartViews', () => {
  it('CHART-11 radar desenha um eixo por linha e um polígono por série', () => {
    const { container } = drawRadar(5)
    expect(container.querySelectorAll('.recharts-radar-polygon')).toHaveLength(
      2,
    )
    expect(
      container.querySelectorAll('.recharts-polar-angle-axis-tick'),
    ).toHaveLength(5)
  })

  it('CHART-12 radial desenha uma barra por linha', () => {
    const { container } = drawRadial(5)
    const sectors = [
      ...container.querySelectorAll('.recharts-radial-bar-sector'),
    ]
    expect(sectors).toHaveLength(5)
    const lengths = sectors.map((sector) => sweep(sector.getAttribute('d')))
    // os valores crescem com a linha: a última barra é a mais longa
    expect(lengths.indexOf(Math.max(...lengths))).toBe(4)
    expect(lengths[0]).toBeLessThan(lengths[4] ?? 0)
  })

  it('CHART-14 dica do radar e do radial mostra categoria e valor', () => {
    const radar = drawRadar(3)
    expect(
      radar.container.querySelector('.recharts-tooltip-wrapper'),
    ).toBeInTheDocument()
    radar.unmount()
    const radial = drawRadial(3)
    expect(
      radial.container.querySelector('.recharts-tooltip-wrapper'),
    ).toBeInTheDocument()
    radial.unmount()

    const first = render(
      <NinbiTooltip
        active
        payload={[
          {
            name: 'vendas',
            value: 1234.56,
            color: 'var(--chart-1)',
            payload: { axis: 'Centro' },
          },
        ]}
      />,
    )
    expect(screen.getByText('Centro')).toBeInTheDocument()
    expect(screen.getByText('1.234,56')).toBeInTheDocument()
    first.unmount()

    render(
      <NinbiTooltip
        active
        payload={[
          {
            name: 'value',
            value: 80,
            color: 'var(--chart-2)',
            payload: { label: 'Norte' },
          },
        ]}
      />,
    )
    expect(screen.getByText('Norte')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()
  })

  it('CHART-13 radar com 30 linhas mostra Mostrando 12 de 30 categorias', () => {
    const { container } = drawRadar(30)
    expect(
      container.querySelectorAll('.recharts-polar-angle-axis-tick'),
    ).toHaveLength(12)
    expect(
      screen.getByText('Mostrando 12 de 30 categorias'),
    ).toBeInTheDocument()
  })
})
