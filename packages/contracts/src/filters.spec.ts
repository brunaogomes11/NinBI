import { describe, expect, it } from 'vitest'
import { dashboardSaveSchema } from './dashboards'
import {
  dashboardFilterSchema,
  dashboardFiltersSchema,
  FILTER_TYPE_LABELS,
  FILTER_TYPES,
  filtersForPrompt,
  queryParamsSchema,
  REFRESH_INTERVAL_LABELS,
  REFRESH_INTERVALS,
} from './filters'
import { MESSAGES } from './messages'

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const filter = (n: number, over: Record<string, unknown> = {}) => ({
  id: id(n),
  label: 'Categoria',
  parameter: 'categoria',
  type: 'TEXT',
  options: null,
  defaultValue: null,
  ...over,
})

const messagesOf = (result: {
  success: boolean
  error?: { issues: { message: string; path: PropertyKey[] }[] }
}) => result.error?.issues.map((i) => i.message) ?? []

const widget = (visualization: string, config: Record<string, unknown>) => ({
  id: id(50),
  title: 'W',
  cypher: 'RETURN 1',
  visualization,
  config,
  layout: { x: 0, y: 0, w: 4, h: 4 },
})

const save = (filters: unknown[], w: unknown) => ({
  version: 1,
  name: 'Vendas',
  connectionId: id(1),
  tabs: [{ id: id(2), name: 'Geral', widgets: [w] }],
  filters,
})

describe('filter contracts', () => {
  it('FLT-02 tipos de filtro na ordem da spec', () => {
    expect(FILTER_TYPES.map((t) => FILTER_TYPE_LABELS[t])).toEqual([
      'Seleção única',
      'Seleção múltipla',
      'Texto',
      'Número',
      'Data',
      'Intervalo de datas',
    ])
  })

  it('FLT-03 parâmetro inválido, longo ou repetido é recusado com a mensagem', () => {
    for (const parameter of ['1ano', 'ano-mes', 'ano mes']) {
      const r = dashboardFilterSchema.safeParse(filter(1, { parameter }))
      expect(messagesOf(r)).toEqual([MESSAGES.filterParameterInvalid])
    }
    expect(MESSAGES.filterParameterInvalid).toBe(
      'O parâmetro começa com uma letra e usa só letras, dígitos e _',
    )
    const long = dashboardFilterSchema.safeParse(
      filter(1, { parameter: 'a'.repeat(41) }),
    )
    expect(messagesOf(long)).toEqual(['O parâmetro pode ter até 40 caracteres'])
    expect(
      dashboardFilterSchema.safeParse(filter(1, { parameter: 'a'.repeat(40) }))
        .success,
    ).toBe(true)

    const dup = dashboardFiltersSchema.safeParse([filter(1), filter(2)])
    expect(dup.success).toBe(false)
    expect(dup.error?.issues[0]?.message).toBe(
      'Este parâmetro já é usado por outro filtro',
    )
    expect(dup.error?.issues[0]?.path).toEqual([1, 'parameter'])

    const range = dashboardFiltersSchema.safeParse([
      filter(1, {
        parameter: 'periodo',
        type: 'DATE_RANGE',
        defaultValue: { start: null, end: null },
      }),
      filter(2, { parameter: 'periodo_inicio' }),
    ])
    expect(range.error?.issues[0]?.message).toBe(MESSAGES.filterParameterTaken)

    const inSave = dashboardSaveSchema.safeParse(
      save([filter(1), filter(2)], widget('TABLE', {})),
    )
    expect(inSave.error?.issues[0]?.path).toEqual(['filters', 1, 'parameter'])
  })

  it('FLT-04 rótulo vazio ou com mais de 40 caracteres é recusado', () => {
    expect(
      messagesOf(dashboardFilterSchema.safeParse(filter(1, { label: '   ' }))),
    ).toEqual(['Informe o rótulo'])
    expect(
      messagesOf(
        dashboardFilterSchema.safeParse(filter(1, { label: 'a'.repeat(41) })),
      ),
    ).toEqual(['O rótulo pode ter até 40 caracteres'])
    expect(
      dashboardFilterSchema.safeParse(filter(1, { label: 'a'.repeat(40) }))
        .success,
    ).toBe(true)
  })

  it('FLT-05 filtro de seleção exige a origem das opções', () => {
    for (const type of ['SINGLE_SELECT', 'MULTI_SELECT']) {
      expect(
        dashboardFilterSchema.safeParse(
          filter(1, { type, options: null, defaultValue: null }),
        ).success,
      ).toBe(false)
    }
    const stat = (values: string[]) =>
      dashboardFilterSchema.safeParse(
        filter(1, {
          type: 'SINGLE_SELECT',
          options: { source: 'STATIC', values },
        }),
      )
    expect(messagesOf(stat([]))).toEqual(['Informe ao menos uma opção'])
    expect(stat(['A']).success).toBe(true)
    expect(
      messagesOf(stat(Array.from({ length: 1001 }, (_, i) => `v${i}`))),
    ).toEqual(['A lista pode ter até 1.000 opções'])
    expect(stat(Array.from({ length: 1000 }, (_, i) => `v${i}`)).success).toBe(
      true,
    )
    const query = dashboardFilterSchema.safeParse(
      filter(1, {
        type: 'SINGLE_SELECT',
        options: { source: 'QUERY', cypher: '' },
      }),
    )
    expect(messagesOf(query)).toEqual(['Informe a consulta das opções'])
    expect(
      dashboardFilterSchema.safeParse(
        filter(1, {
          type: 'SINGLE_SELECT',
          options: { source: 'QUERY', cypher: 'MATCH (c) RETURN c.nome' },
        }),
      ).success,
    ).toBe(true)
    expect(
      dashboardFilterSchema.safeParse(
        filter(1, { type: 'TEXT', options: null }),
      ).success,
    ).toBe(true)
  })

  it('FLT-05 valor padrão é validado por tipo', () => {
    const num = dashboardFilterSchema.safeParse(
      filter(1, { type: 'NUMBER', defaultValue: 'abc' }),
    )
    expect(messagesOf(num)).toEqual(['Valor padrão inválido'])
    const date = dashboardFilterSchema.safeParse(
      filter(1, { type: 'DATE', defaultValue: '2024-13-01' }),
    )
    expect(messagesOf(date)).toEqual(['Valor padrão inválido'])
    const inverted = dashboardFilterSchema.safeParse(
      filter(1, {
        type: 'DATE_RANGE',
        defaultValue: { start: '2025-03-01', end: '2025-01-01' },
      }),
    )
    expect(messagesOf(inverted)).toEqual(['A data inicial é maior que a final'])
    expect(
      dashboardFilterSchema.safeParse(
        filter(1, {
          type: 'DATE_RANGE',
          defaultValue: { start: '2025-01-01', end: '2025-01-01' },
        }),
      ).success,
    ).toBe(true)
  })

  it('RFR-01 intervalos de atualização na ordem da spec', () => {
    expect(REFRESH_INTERVALS.map((s) => REFRESH_INTERVAL_LABELS[s])).toEqual([
      'Desligada',
      '10 s',
      '30 s',
      '1 min',
      '5 min',
      '15 min',
      '1 h',
    ])
    const w = widget('TABLE', {})
    expect(
      dashboardSaveSchema.safeParse({ ...save([], w), refreshIntervalSec: 20 })
        .success,
    ).toBe(false)
    const ok = dashboardSaveSchema.parse({
      ...save([], w),
      refreshIntervalSec: 60,
    })
    expect(ok.refreshIntervalSec).toBe(60)
    const defaults = dashboardSaveSchema.parse({
      version: 1,
      name: 'V',
      connectionId: id(1),
      tabs: [{ id: id(2), name: 'G', widgets: [] }],
    })
    expect(defaults.filters).toEqual([])
    expect(defaults.refreshIntervalSec).toBe(0)
  })

  it('XFL-01 crossFilter aceita só filtros de seleção única, texto, número ou data e recusa KPI', () => {
    const filters = [
      filter(11, {
        parameter: 'a',
        type: 'SINGLE_SELECT',
        options: { source: 'STATIC', values: ['x'] },
      }),
      filter(12, { parameter: 'b', type: 'TEXT' }),
      filter(13, { parameter: 'c', type: 'NUMBER' }),
      filter(14, { parameter: 'd', type: 'DATE' }),
      filter(15, {
        parameter: 'e',
        type: 'MULTI_SELECT',
        options: { source: 'STATIC', values: ['x'] },
        defaultValue: [],
      }),
      filter(16, {
        parameter: 'f',
        type: 'DATE_RANGE',
        defaultValue: { start: null, end: null },
      }),
    ]
    const bar = (n: number) =>
      widget('BAR', {
        mapping: { x: 'a', series: ['b'], stacked: false, horizontal: false },
        crossFilter: { filterId: id(n), column: 'a' },
      })
    for (const n of [11, 12, 13, 14]) {
      expect(dashboardSaveSchema.safeParse(save(filters, bar(n))).success).toBe(
        true,
      )
    }
    for (const n of [15, 16]) {
      const r = dashboardSaveSchema.safeParse(save(filters, bar(n)))
      expect(messagesOf(r)).toEqual(['Filtro do clique inválido'])
    }
    const kpi = widget('KPI', {
      mapping: { value: 'a', change: null },
      crossFilter: { filterId: id(11), column: 'a' },
    })
    expect(
      messagesOf(dashboardSaveSchema.safeParse(save(filters, kpi))),
    ).toEqual(['Filtro do clique inválido'])
  })

  it('XFL-09 crossFilter para filtro inexistente é recusado', () => {
    const w = widget('TABLE', {
      crossFilter: { filterId: id(99), column: 'a' },
    })
    const r = dashboardSaveSchema.safeParse(save([filter(1)], w))
    expect(messagesOf(r)).toEqual(['Filtro do clique inválido'])
  })

  it('FLT-11 queryParamsSchema aceita escalares, datas, listas e null e recusa objeto qualquer', () => {
    expect(
      queryParamsSchema.safeParse({
        a: 'x',
        b: 1,
        c: true,
        d: { kind: 'date', value: '2024-01-31' },
        e: ['a', 'b'],
        f: null,
      }).success,
    ).toBe(true)
    expect(queryParamsSchema.safeParse({ a: { qualquer: 1 } }).success).toBe(
      false,
    )
  })

  it('FLT-20 filtersForPrompt devolve só rótulo, parâmetro e tipo', () => {
    const [info] = filtersForPrompt([
      dashboardFilterSchema.parse(filter(1, { defaultValue: 'segredo' })),
    ])
    expect(info).toEqual({
      label: 'Categoria',
      parameter: 'categoria',
      type: 'TEXT',
    })
  })
})
