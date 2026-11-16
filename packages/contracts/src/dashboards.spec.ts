import { describe, expect, it } from 'vitest'
import type { ZodType } from 'zod'
import {
  dashboardCreateSchema,
  dashboardSaveSchema,
  queryRunSchema,
  sidebarLayoutSchema,
  widgetLayoutSchema,
} from './dashboards'
import { MESSAGES } from './messages'

function errorsOf(
  schema: ZodType,
  value: unknown,
): Record<string, string> | null {
  const result = schema.safeParse(value)
  if (result.success) return null
  const byField: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const field = issue.path.join('.')
    if (!(field in byField)) byField[field] = issue.message
  }
  return byField
}

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const widget = (overrides: Record<string, unknown> = {}) => ({
  id: id(10),
  title: 'Lojas',
  cypher: 'MATCH (l:Loja) RETURN l.nome',
  visualization: 'TABLE',
  config: {},
  layout: { x: 0, y: 0, w: 4, h: 4 },
  ...overrides,
})

const save = (overrides: Record<string, unknown> = {}) => ({
  version: 1,
  name: 'Vendas',
  connectionId: id(1),
  tabs: [{ id: id(2), name: 'Aba 1', widgets: [widget()] }],
  ...overrides,
})

describe('dashboard contracts', () => {
  it('DASH-06 nome do dashboard vazio ou com mais de 80 caracteres', () => {
    const create = (name: string) => ({ name, connectionId: id(1) })
    expect(errorsOf(dashboardCreateSchema, create(''))).toEqual({
      name: 'Informe o nome do dashboard',
    })
    expect(errorsOf(dashboardCreateSchema, create('   '))).toEqual({
      name: 'Informe o nome do dashboard',
    })
    expect(errorsOf(dashboardCreateSchema, create('a'.repeat(81)))).toEqual({
      name: 'O nome pode ter até 80 caracteres',
    })
    expect(errorsOf(dashboardCreateSchema, create('a'.repeat(80)))).toBeNull()
  })

  it('SIDE-02 nome do grupo vazio ou com mais de 40 caracteres', () => {
    const group = (name: string) => ({
      items: [{ type: 'group', id: id(3), name, items: [] }],
    })
    expect(errorsOf(sidebarLayoutSchema, group(''))).toEqual({
      'items.0.name': 'Informe o nome',
    })
    expect(errorsOf(sidebarLayoutSchema, group('a'.repeat(41)))).toEqual({
      'items.0.name': 'O nome pode ter até 40 caracteres',
    })
    expect(errorsOf(sidebarLayoutSchema, group('a'.repeat(40)))).toBeNull()
  })

  it('TAB-04 nome da aba vazio ou com mais de 40 caracteres', () => {
    const tab = (name: string) =>
      save({ tabs: [{ id: id(2), name, widgets: [] }] })
    expect(errorsOf(dashboardSaveSchema, tab(''))).toEqual({
      'tabs.0.name': 'Informe o nome',
    })
    expect(errorsOf(dashboardSaveSchema, tab('a'.repeat(41)))).toEqual({
      'tabs.0.name': 'O nome pode ter até 40 caracteres',
    })
    expect(errorsOf(dashboardSaveSchema, tab('a'.repeat(40)))).toBeNull()
  })

  it('WDG-07 título do widget vazio ou com mais de 80 caracteres', () => {
    const titled = (title: string) =>
      save({
        tabs: [{ id: id(2), name: 'Aba 1', widgets: [widget({ title })] }],
      })
    expect(errorsOf(dashboardSaveSchema, titled(''))).toEqual({
      'tabs.0.widgets.0.title': 'Informe o título',
    })
    expect(errorsOf(dashboardSaveSchema, titled('a'.repeat(81)))).toEqual({
      'tabs.0.widgets.0.title': 'O título pode ter até 80 caracteres',
    })
    expect(errorsOf(dashboardSaveSchema, titled('a'.repeat(80)))).toBeNull()
  })

  it('GRID-03 layout do widget fora dos limites da grade é recusado', () => {
    for (const layout of [
      { x: 0, y: 0, w: 1, h: 2 },
      { x: 0, y: 0, w: 2, h: 1 },
      { x: 0, y: 0, w: 13, h: 2 },
      { x: 10, y: 0, w: 4, h: 2 },
      { x: -1, y: 0, w: 4, h: 2 },
      { x: 0, y: 0, w: 2.5, h: 2 },
    ]) {
      expect(widgetLayoutSchema.safeParse(layout).success).toBe(false)
    }
    expect(
      widgetLayoutSchema.safeParse({ x: 0, y: 0, w: 2, h: 2 }).success,
    ).toBe(true)
    expect(
      widgetLayoutSchema.safeParse({ x: 0, y: 5, w: 12, h: 3 }).success,
    ).toBe(true)
  })

  it('QRY-09 Cypher com mais de 20000 caracteres no contrato', () => {
    const tooLong = MESSAGES.cypherTooLong
    expect(tooLong).toBe('A consulta passa de 20.000 caracteres')
    expect(errorsOf(queryRunSchema, { cypher: 'a'.repeat(20_001) })).toEqual({
      cypher: tooLong,
    })
    expect(errorsOf(queryRunSchema, { cypher: 'a'.repeat(20_000) })).toBeNull()
    const inWidget = (cypher: string) =>
      save({
        tabs: [{ id: id(2), name: 'Aba 1', widgets: [widget({ cypher })] }],
      })
    expect(errorsOf(dashboardSaveSchema, inWidget('a'.repeat(20_001)))).toEqual(
      { 'tabs.0.widgets.0.cypher': tooLong },
    )
    expect(
      errorsOf(dashboardSaveSchema, inWidget('a'.repeat(20_000))),
    ).toBeNull()
  })

  it('dashboardSaveSchema sem abas é recusado e com abas e widgets é aceito', () => {
    expect(dashboardSaveSchema.safeParse(save({ tabs: [] })).success).toBe(
      false,
    )
    expect(dashboardSaveSchema.safeParse(save()).success).toBe(true)
    expect(
      dashboardSaveSchema.safeParse(
        save({ tabs: [{ id: 'nao-e-uuid', name: 'A', widgets: [] }] }),
      ).success,
    ).toBe(false)
  })

  it('sidebarLayoutSchema com um dashboard repetido é recusado', () => {
    const dash = (n: number) => ({ type: 'dashboard', id: id(n) })
    expect(
      sidebarLayoutSchema.safeParse({ items: [dash(5), dash(5)] }).success,
    ).toBe(false)
    expect(
      sidebarLayoutSchema.safeParse({
        items: [
          dash(5),
          { type: 'group', id: id(6), name: 'G', items: [dash(5)] },
        ],
      }).success,
    ).toBe(false)
    expect(
      sidebarLayoutSchema.safeParse({
        items: [
          dash(5),
          { type: 'group', id: id(6), name: 'G', items: [dash(7)] },
        ],
      }).success,
    ).toBe(true)
  })

  it('MESSAGES formata o prazo e o corte de linhas', () => {
    expect(MESSAGES.queryTimeout(30)).toBe(
      'A consulta excedeu o tempo limite de 30 s',
    )
    expect(MESSAGES.rowsTruncated(5000)).toBe(
      'Mostrando as primeiras 5.000 linhas',
    )
  })
})
