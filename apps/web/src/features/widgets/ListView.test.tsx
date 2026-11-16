import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeQueryResult } from '@/test/fixtures/dashboards'
import { ListView } from './ListView'
import { buildList } from './mapping/simple-data'

const LONG = 'Loja de departamentos do Centro Histórico de Porto Alegre'

function draw(rows = defaultRows) {
  const built = buildList(
    makeQueryResult({
      columns: ['nome', 'categoria', 'total', 'variacao'],
      rows,
    }),
    {
      primary: 'nome',
      secondary: 'categoria',
      values: ['total', 'variacao'],
    },
  )
  if (!built.ok) throw new Error('dados inválidos no teste')
  return render(
    <div>
      <h3>Lojas</h3>
      <ListView data={built.data} />
    </div>,
  )
}

const defaultRows = [
  ['Centro', 'Varejo', 1234.56, 12],
  ['Norte', 'Atacado', 800, 3],
  ['Sul', 'Varejo', 50, -1],
]

describe('ListView', () => {
  it('LIST-01 lista mostra texto principal e até dois valores na ordem', () => {
    draw()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items.map((li) => li.querySelector('p')?.textContent)).toEqual([
      'Centro',
      'Norte',
      'Sul',
    ])
    const first = within(items[0] as HTMLElement)
    expect(first.getByText('1.234,56')).toBeInTheDocument()
    expect(first.getByText('12')).toBeInTheDocument()
    expect(first.getByText('1.234,56')).toHaveClass('tabular-nums')
  })

  it('LIST-02 texto secundário aparece abaixo do principal em tom apagado', () => {
    draw()
    const first = screen.getAllByRole('listitem')[0] as HTMLElement
    const texts = [...first.querySelectorAll('p')]
    expect(texts.map((p) => p.textContent)).toEqual(['Centro', 'Varejo'])
    expect(texts[1]).toHaveClass('text-muted-foreground')
    expect(texts[0]).not.toHaveClass('text-muted-foreground')
  })

  it('LIST-03 linhas rolam dentro do card com o título fixo', () => {
    draw()
    const list = screen.getByRole('list')
    expect(list).toHaveClass('overflow-y-auto', 'min-h-0')
    expect(list.contains(screen.getByRole('heading', { name: 'Lojas' }))).toBe(
      false,
    )
  })

  it('LIST-04 texto longo é cortado com reticências', () => {
    draw([[LONG, LONG, 1, 2]])
    const [primary, secondary] = screen
      .getAllByText(LONG)
      .map((el) => el as HTMLElement)
    for (const text of [primary, secondary]) {
      expect(text).toHaveClass('truncate')
      expect(text).toHaveAttribute('title', LONG)
    }
  })
})
