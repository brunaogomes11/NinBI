import type { SidebarDto } from '@ninbi/contracts'
import { describe, expect, it } from 'vitest'
import { moveItem, removeGroup } from './layout'

const dash = (id: string) => ({ type: 'dashboard' as const, id, name: id })
const group = (id: string, ...ids: string[]) => ({
  type: 'group' as const,
  id,
  name: id,
  items: ids.map(dash),
})

/** Ids na ordem da tela, com os filhos de um grupo entre colchetes. */
function shape(layout: SidebarDto): string[] {
  return layout.items.map((item) =>
    item.type === 'group'
      ? `${item.id}[${item.items.map((c) => c.id).join(',')}]`
      : item.id,
  )
}

describe('layout da sidebar', () => {
  it('SIDE-03 moveItem põe o item antes do alvo', () => {
    const layout: SidebarDto = {
      items: [dash('A'), dash('B'), dash('C')],
      shared: [],
    }

    const moved = moveItem(layout, 'C', { before: 'A' })

    expect(shape(moved)).toEqual(['C', 'A', 'B'])
  })

  it('SIDE-03 moveItem sem alvo conhecido devolve o mesmo layout', () => {
    const layout: SidebarDto = { items: [dash('A'), dash('B')], shared: [] }

    expect(moveItem(layout, 'A', { before: 'nada' })).toBe(layout)
    expect(moveItem(layout, 'A', { before: 'A' })).toBe(layout)
  })

  it('SIDE-09 removeGroup solta os dashboards na posição do grupo', () => {
    const layout: SidebarDto = {
      items: [dash('A'), group('G', 'B', 'C'), dash('D')],
      shared: [],
    }

    const removed = removeGroup(layout, 'G')

    expect(shape(removed)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('SIDE-04 moveItem põe o dashboard antes do alvo dentro do grupo e no fim do grupo', () => {
    const layout: SidebarDto = {
      items: [dash('X'), dash('Y'), group('G', 'A', 'B')],
      shared: [],
    }

    const before = moveItem(layout, 'X', { before: 'B' })
    const end = moveItem(layout, 'Y', { intoGroup: 'G' })

    expect(shape(before)).toEqual(['Y', 'G[A,X,B]'])
    expect(shape(end)).toEqual(['X', 'G[A,B,Y]'])
  })

  it('SIDE-05 moveItem solta o dashboard do grupo antes de um item solto', () => {
    const layout: SidebarDto = {
      items: [group('G', 'A', 'B'), dash('C')],
      shared: [],
    }

    expect(shape(moveItem(layout, 'A', { before: 'C' }))).toEqual([
      'G[B]',
      'A',
      'C',
    ])
    expect(shape(moveItem(layout, 'A', { rootEnd: true }))).toEqual([
      'G[B]',
      'C',
      'A',
    ])
  })

  it('SIDE-06 grupo movido para dentro de grupo fica antes do grupo alvo', () => {
    const layout: SidebarDto = {
      items: [group('G1', 'A'), group('G2', 'B'), group('G3', 'C')],
      shared: [],
    }

    const intoGroup = moveItem(layout, 'G3', { intoGroup: 'G1' })
    const onChild = moveItem(layout, 'G3', { before: 'B' })

    expect(shape(intoGroup)).toEqual(['G3[C]', 'G1[A]', 'G2[B]'])
    expect(shape(onChild)).toEqual(['G1[A]', 'G3[C]', 'G2[B]'])
  })
})
