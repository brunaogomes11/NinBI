import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeQueryResult } from '@/test/fixtures/dashboards'
import { KpiView } from './KpiView'
import { buildKpi } from './mapping/simple-data'

function draw(variacao: number | string | null | undefined, saldo = 4999.95) {
  const columns = variacao === undefined ? ['saldo'] : ['saldo', 'variacao']
  const row = variacao === undefined ? [saldo] : [saldo, variacao]
  const built = buildKpi(makeQueryResult({ columns, rows: [row] }), {
    value: 'saldo',
    change: variacao === undefined ? null : 'variacao',
  })
  if (!built.ok) throw new Error('dados inválidos no teste')
  return render(<KpiView data={built.data} />)
}

describe('KpiView', () => {
  it('KPI-02 variação positiva mostra chip com seta para cima e o valor em %', () => {
    const up = draw(20)
    expect(screen.getByText('4.999,95')).toBeInTheDocument()
    expect(screen.getByLabelText('alta')).toBeInTheDocument()
    const chip = screen.getByText('20%')
    expect(chip).toHaveClass('text-accent-text')
    up.unmount()

    draw(0)
    expect(screen.getByLabelText('alta')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('KPI-03 variação negativa mostra chip com seta para baixo', () => {
    draw(-5)
    expect(screen.getByLabelText('queda')).toBeInTheDocument()
    expect(screen.queryByLabelText('alta')).not.toBeInTheDocument()
    expect(screen.getByText('5%')).toHaveClass('text-destructive')
  })

  it('KPI-03 variação que arredonda para zero mostra 0% sem seta', () => {
    draw(-0.001)
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.queryByLabelText('alta')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('queda')).not.toBeInTheDocument()
  })

  it('KPI-04 sem variação ou variação nula não mostra chip', () => {
    const none = draw(undefined)
    expect(screen.getByText('4.999,95')).toBeInTheDocument()
    expect(screen.queryByLabelText('alta')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('queda')).not.toBeInTheDocument()
    expect(none.container.querySelector('[data-slot="badge"]')).toBeNull()
    none.unmount()

    const nulled = draw(null)
    expect(screen.getByText('4.999,95')).toBeInTheDocument()
    expect(nulled.container.querySelector('[data-slot="badge"]')).toBeNull()
  })

  it('KPI-05 valor não numérico aparece como texto', () => {
    const built = buildKpi(
      makeQueryResult({ columns: ['loja'], rows: [['Centro']] }),
      { value: 'loja', change: null },
    )
    if (!built.ok) throw new Error('dados inválidos no teste')
    render(<KpiView data={built.data} />)
    expect(screen.getByText('Centro')).toBeInTheDocument()
  })
})
