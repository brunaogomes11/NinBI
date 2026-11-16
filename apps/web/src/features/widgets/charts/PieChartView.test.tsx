import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockElementSize } from '@/test/element-size'
import { makeQueryResult } from '@/test/fixtures/dashboards'
import { buildCategories } from '../mapping/chart-data'
import { PieChartView } from './PieChartView'

let restore: () => void
beforeEach(() => {
  restore = mockElementSize(600, 300)
})
afterEach(() => restore())

function rowsOf(n: number): [string, number][] {
  return Array.from({ length: n }, (_, i) => [`Loja ${i + 1}`, (i + 1) * 10])
}

function draw(rows: [string, number][], donut = false) {
  const built = buildCategories(
    makeQueryResult({ columns: ['loja', 'total'], rows }),
    { category: 'loja', value: 'total' },
    'PIE',
  )
  if (!built.ok) throw new Error('dados inválidos no teste')
  return render(
    <PieChartView data={built.data} donut={donut} notice={built.notice} />,
  )
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

const arcs = (d: string | null) => (d ?? '').match(/A/g)?.length ?? 0

describe('PieChartView', () => {
  it('CHART-09 pizza desenha uma fatia por linha', () => {
    const { container } = draw(rowsOf(5))
    expect(container.querySelectorAll('.recharts-sector')).toHaveLength(5)
  })

  it('CHART-09 pizza dá a cada fatia o ângulo proporcional ao valor', () => {
    const { container } = draw([
      ['A', 10],
      ['B', 20],
      ['C', 30],
      ['D', 40],
    ])
    const sectors = [...container.querySelectorAll('.recharts-sector')]
    expect(sectors).toHaveLength(4)
    const angles = sectors.map((sector) => sweep(sector.getAttribute('d')))
    const total = angles.reduce((sum, angle) => sum + angle, 0)
    angles.forEach((angle, i) => {
      expect(angle / total).toBeCloseTo(((i + 1) * 10) / 100, 2)
    })
  })

  it('CHART-10 Donut desenha o centro vazado', () => {
    const flat = draw(rowsOf(5))
    const flatSectors = flat.container.querySelectorAll('.recharts-sector')
    expect(flatSectors).toHaveLength(5)
    for (const sector of flatSectors) {
      expect(arcs(sector.getAttribute('d'))).toBe(1)
    }
    flat.unmount()

    const donut = draw(rowsOf(5), true)
    const sectors = donut.container.querySelectorAll('.recharts-sector')
    expect(sectors).toHaveLength(5)
    for (const sector of sectors) {
      expect(arcs(sector.getAttribute('d'))).toBe(2)
    }
  })

  it('CHART-13 pizza com 30 linhas mostra Mostrando 12 de 30 categorias', () => {
    const { container } = draw(rowsOf(30))
    expect(container.querySelectorAll('.recharts-sector')).toHaveLength(12)
    expect(
      screen.getByText('Mostrando 12 de 30 categorias'),
    ).toBeInTheDocument()
  })

  it('CHART-14 dica da pizza mostra categoria e valor', async () => {
    const { container } = draw([
      ['Matriz', 1234.56],
      ['Filial', 80],
    ])
    const sectors = container.querySelectorAll('.recharts-sector')
    expect(sectors).toHaveLength(2)
    const wrapper = container.querySelector('.recharts-tooltip-wrapper')
    expect(wrapper?.textContent).toBe('')

    fireEvent.mouseEnter(sectors[0] as Element)
    await waitFor(() => {
      expect(wrapper).toHaveTextContent('Matriz')
      expect(wrapper).toHaveTextContent('1.234,56')
    })
    expect(wrapper).not.toHaveTextContent('Filial')
  })
})
