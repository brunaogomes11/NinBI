import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { makeQueryResult } from '@/test/fixtures/dashboards'
import { ResultTable } from './ResultTable'

function bodyColumn(index: number): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[index]?.textContent ?? '')
}

const manyRows = (count: number) =>
  Array.from({ length: count }, (_, i) => [`linha ${i + 1}`, i + 1])

describe('ResultTable', () => {
  it('TBL-01 tabela tem uma coluna por chave na ordem do RETURN', () => {
    render(
      <ResultTable
        result={makeQueryResult({
          columns: ['loja', 'total', 'uf'],
          rows: [['Centro', 1, 'SP']],
        })}
      />,
    )
    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent),
    ).toEqual(['loja', 'total', 'uf'])
    expect(bodyColumn(0)).toEqual(['Centro'])
    expect(bodyColumn(2)).toEqual(['SP'])
  })

  it('TBL-02 clicar no cabeçalho alterna crescente, decrescente e original', async () => {
    const user = userEvent.setup()
    render(
      <ResultTable
        result={makeQueryResult({
          rows: [
            ['Centro', 120],
            ['Norte', 80],
            ['Sul', 200],
          ],
        })}
      />,
    )
    const header = screen.getByRole('button', { name: 'total' })
    const th = screen.getByRole('columnheader', { name: 'total' })
    expect(bodyColumn(1)).toEqual(['120', '80', '200'])
    expect(th).toHaveAttribute('aria-sort', 'none')

    await user.click(header)
    expect(bodyColumn(1)).toEqual(['80', '120', '200'])
    expect(th).toHaveAttribute('aria-sort', 'ascending')

    await user.click(header)
    expect(bodyColumn(1)).toEqual(['200', '120', '80'])
    expect(th).toHaveAttribute('aria-sort', 'descending')

    await user.click(header)
    expect(bodyColumn(1)).toEqual(['120', '80', '200'])
    expect(th).toHaveAttribute('aria-sort', 'none')
  })

  it('TBL-02 a ordenação vale para todas as linhas e não só para a página', async () => {
    const user = userEvent.setup()
    render(<ResultTable result={makeQueryResult({ rows: manyRows(120) })} />)
    await user.click(screen.getByRole('button', { name: 'total' }))
    await user.click(screen.getByRole('button', { name: 'total' }))
    expect(bodyColumn(1)[0]).toBe('120')
    expect(bodyColumn(0)[0]).toBe('linha 120')
  })

  it('TBL-04 mais de 50 linhas mostra Página X de Y e navega', async () => {
    const user = userEvent.setup()
    render(<ResultTable result={makeQueryResult({ rows: manyRows(120) })} />)
    expect(bodyColumn(0)).toHaveLength(50)
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Página anterior' }),
    ).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    expect(bodyColumn(0)[0]).toBe('linha 51')
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    expect(bodyColumn(0)).toHaveLength(20)
    expect(
      screen.getByRole('button', { name: 'Próxima página' }),
    ).toBeDisabled()
  })

  it('TBL-04 com 50 linhas não há paginação', () => {
    render(<ResultTable result={makeQueryResult({ rows: manyRows(50) })} />)
    expect(bodyColumn(0)).toHaveLength(50)
    expect(screen.queryByText(/Página \d+ de/)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Próxima página' }),
    ).not.toBeInTheDocument()
  })

  it('TBL-05 linhas rolam dentro do card com cabeçalho fixo', () => {
    render(<ResultTable result={makeQueryResult()} />)
    expect(screen.getByRole('table').parentElement).toHaveClass('overflow-auto')
    const thead = screen.getAllByRole('rowgroup')[0]
    expect(thead?.tagName).toBe('THEAD')
    expect(thead).toHaveClass('sticky', 'top-0')
  })

  it('TBL-06 valor JSON aparece como texto na célula', () => {
    render(
      <ResultTable
        result={makeQueryResult({
          columns: ['no'],
          rows: [
            [
              {
                kind: 'json',
                value: '{"labels":["Loja"],"properties":{"nome":"Centro"}}',
              },
            ],
          ],
        })}
      />,
    )
    expect(
      screen.getByText('{"labels":["Loja"],"properties":{"nome":"Centro"}}'),
    ).toBeInTheDocument()
  })

  it('TBL-07 valor nulo mostra travessão', () => {
    render(
      <ResultTable
        result={makeQueryResult({ columns: ['a'], rows: [[null]] })}
      />,
    )
    expect(screen.getByRole('cell')).toHaveTextContent('—')
  })

  it('TBL-08 inteiro grande aparece com todos os dígitos', () => {
    render(
      <ResultTable
        result={makeQueryResult({
          columns: ['id'],
          rows: [[{ kind: 'bigint', value: '9007199254740993' }]],
        })}
      />,
    )
    expect(screen.getByText('9007199254740993')).toBeInTheDocument()
  })

  it('TBL-16 colunas com o mesmo nome aparecem as duas', () => {
    render(
      <ResultTable
        result={makeQueryResult({
          columns: ['v', 'v'],
          rows: [['primeira', 'segunda']],
        })}
      />,
    )
    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent),
    ).toEqual(['v', 'v'])
    expect(bodyColumn(0)).toEqual(['primeira'])
    expect(bodyColumn(1)).toEqual(['segunda'])
  })

  it('QRY-08 resultado cortado mostra Mostrando as primeiras 5.000 linhas', () => {
    render(
      <ResultTable
        result={makeQueryResult({ truncated: true, rowLimit: 5000 })}
      />,
    )
    expect(
      screen.getByText('Mostrando as primeiras 5.000 linhas'),
    ).toBeInTheDocument()
  })
})
