import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockElementSize } from '@/test/element-size'
import { makeQueryResult } from '@/test/fixtures/dashboards'
import { buildCategories } from '../mapping/chart-data'
import { NinbiTooltip } from './chart-theme'
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

const arcs = (d: string | null) => (d ?? '').match(/A/g)?.length ?? 0

describe('PieChartView', () => {
  it('CHART-09 pizza desenha uma fatia por linha', () => {
    const { container } = draw(rowsOf(5))
    expect(container.querySelectorAll('.recharts-sector')).toHaveLength(5)
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

  it('CHART-14 dica da pizza mostra categoria e valor', () => {
    const { container } = draw(rowsOf(3))
    expect(container.querySelectorAll('.recharts-sector')).toHaveLength(3)
    expect(
      container.querySelector('.recharts-tooltip-wrapper'),
    ).toBeInTheDocument()

    render(
      <NinbiTooltip
        active
        payload={[{ name: 'Centro', value: 1234.56, color: 'var(--chart-1)' }]}
      />,
    )
    expect(screen.getByText('Centro')).toBeInTheDocument()
    expect(screen.getByText('1.234,56')).toBeInTheDocument()
  })
})
