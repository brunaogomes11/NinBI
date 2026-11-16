import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LONG_TEXT, makeSchema } from '@/test/fixtures/schema'
import { SchemaPropertiesTable } from './SchemaPropertiesTable'

const schema = makeSchema()
const [, pedido, produto] = schema.labels
const [contem] = schema.relationshipTypes

function rowOf(name: string): HTMLElement {
  return screen.getByRole('cell', { name }).closest('tr') as HTMLElement
}

describe('SchemaPropertiesTable', () => {
  it('SCH-16 selecionar um label mostra Propriedade, Tipos e Exemplo', () => {
    render(<SchemaPropertiesTable element={pedido} />)

    for (const header of ['Propriedade', 'Tipos', 'Exemplo']) {
      expect(
        screen.getByRole('columnheader', { name: header }),
      ).toBeInTheDocument()
    }
    const row = rowOf('codigo')
    expect(within(row).getByText('String, Long')).toBeInTheDocument()
    expect(within(row).getByText("'P-0001'")).toBeInTheDocument()
  })

  it('SCH-17 tipo de relacionamento mostra (:Origem)-[:TIPO]->(:Destino)', () => {
    render(
      <SchemaPropertiesTable element={contem} patterns={contem.patterns} />,
    )

    expect(screen.getByText('(:Pedido)-[:CONTEM]->(:Produto)')).toBeVisible()
  })

  it('SCH-18 propriedade sem exemplo mostra sem exemplo', () => {
    render(<SchemaPropertiesTable element={pedido} />)

    expect(within(rowOf('obs')).getByText('sem exemplo')).toBeInTheDocument()
  })

  it('SCH-20 contêiner da tabela tem overflow-y-auto e cabeçalho sticky top-0', () => {
    render(<SchemaPropertiesTable element={pedido} />)

    expect(screen.getByTestId('schema-properties-scroll')).toHaveClass(
      'overflow-y-auto',
    )
    const thead = screen.getAllByRole('rowgroup')[0]
    expect(thead.tagName).toBe('THEAD')
    expect(thead).toHaveClass('sticky', 'top-0')
  })

  it('SCH-21 exemplo longo truncado mostra o valor inteiro no title', () => {
    render(<SchemaPropertiesTable element={produto} />)

    expect(LONG_TEXT).toHaveLength(5000)
    const cell = screen.getByTitle(LONG_TEXT)
    expect(cell.tagName).toBe('TD')
    expect(cell).toHaveClass('truncate')
  })

  it('SCH-27 exemplo aparece como literal Cypher', () => {
    render(<SchemaPropertiesTable element={pedido} />)

    expect(screen.getByText("date('2024-02-05')")).toBeInTheDocument()
    expect(
      screen.getByText('point({srid: 4326, x: -46.63, y: -23.55})'),
    ).toBeInTheDocument()
    expect(screen.getByText('[1, 2]')).toBeInTheDocument()
    expect(screen.getByText("{nome: 'Ana'}")).toBeInTheDocument()
  })
})
