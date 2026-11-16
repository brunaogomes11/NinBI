import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { makeSchema } from '@/test/fixtures/schema'
import { SchemaElementList, type SchemaSelection } from './SchemaElementList'

function Harness({
  onSelect,
}: {
  onSelect: (selection: SchemaSelection) => void
}) {
  const schema = makeSchema()
  const [selected, setSelected] = useState<SchemaSelection | null>(null)
  return (
    <SchemaElementList
      labels={schema.labels}
      relationshipTypes={schema.relationshipTypes}
      selected={selected}
      onSelect={(selection) => {
        setSelected(selection)
        onSelect(selection)
      }}
    />
  )
}

describe('SchemaElementList', () => {
  it('SCH-15 os dois grupos mostram os nomes na ordem do DTO', () => {
    render(<Harness onSelect={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Labels' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Tipos de relacionamento' }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('button').map((button) => button.textContent),
    ).toEqual(['Cliente', 'Pedido', 'Produto', 'CONTEM', 'FEZ'])
  })

  it('SCH-15 clicar num label chama onSelect e marca o item', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('button', { name: 'Pedido' }))

    expect(onSelect).toHaveBeenCalledWith({ kind: 'LABEL', name: 'Pedido' })
    expect(screen.getByRole('button', { name: 'Pedido' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Cliente' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('SCH-20 contêiner da lista tem overflow-y-auto', () => {
    render(<Harness onSelect={() => {}} />)

    expect(screen.getByTestId('schema-element-list')).toHaveClass(
      'overflow-y-auto',
    )
  })
})
