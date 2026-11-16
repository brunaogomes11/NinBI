import { type DashboardFilter, dashboardSaveSchema } from '@ninbi/contracts'
import { describe, expect, it } from 'vitest'
import { makeDashboard, makeWidget } from '@/test/fixtures/dashboards'
import {
  addFilter,
  addTab,
  addWidget,
  fromDto,
  isDirty,
  removeFilter,
  removeWidget,
  setConnection,
  setLayout,
  setName,
  setRefreshInterval,
  toSavePayload,
  updateFilter,
  updateWidget,
} from './draft'

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const saved = () =>
  makeDashboard({
    id: uuid(100),
    connectionId: uuid(101),
    version: 3,
    tabs: [
      {
        id: uuid(1),
        name: 'Aba 1',
        widgets: [
          makeWidget({ id: uuid(11), layout: { x: 0, y: 0, w: 4, h: 3 } }),
          makeWidget({ id: uuid(12), layout: { x: 4, y: 3, w: 4, h: 4 } }),
        ],
      },
      { id: uuid(2), name: 'Aba 2', widgets: [] },
    ],
  })

describe('draft', () => {
  it('TAB-03 addTab nomeia a aba com o número de abas', () => {
    const draft = addTab(fromDto(saved()), uuid(3))
    expect(draft.tabs.map((tab) => tab.name)).toEqual([
      'Aba 1',
      'Aba 2',
      'Aba 3',
    ])
    expect(draft.tabs[2]).toEqual({ id: uuid(3), name: 'Aba 3', widgets: [] })

    // depois de excluir uma e adicionar, o nome segue o número de abas
    const afterRemoval = {
      ...draft,
      tabs: draft.tabs.filter((tab) => tab.id !== uuid(1)),
    }
    expect(addTab(afterRemoval, uuid(4)).tabs.at(-1)?.name).toBe('Aba 3')
  })

  it('GRID-05 addWidget põe o widget 4 por 4 abaixo do último', () => {
    const draft = fromDto(saved())
    const withWidget = addWidget(draft, uuid(1), uuid(13))
    expect(withWidget.tabs[0]?.widgets.at(-1)).toMatchObject({
      id: uuid(13),
      title: 'Novo widget',
      cypher: null,
      layout: { x: 0, y: 7, w: 4, h: 4 },
    })
    const inEmptyTab = addWidget(draft, uuid(2), uuid(14))
    expect(inEmptyTab.tabs[1]?.widgets[0]?.layout).toEqual({
      x: 0,
      y: 0,
      w: 4,
      h: 4,
    })
  })

  it('EDIT-08 setName e setConnection alteram o rascunho', () => {
    const dto = saved()
    const draft = fromDto(dto)
    expect(isDirty(draft, dto)).toBe(false)

    const renamed = setName(draft, 'Outro nome')
    expect(renamed.name).toBe('Outro nome')
    expect(isDirty(renamed, dto)).toBe(true)
    expect(isDirty(setName(renamed, dto.name), dto)).toBe(false)

    const moved = setConnection(draft, uuid(102))
    expect(moved.connectionId).toBe(uuid(102))
    expect(isDirty(moved, dto)).toBe(true)
    expect(isDirty(setConnection(moved, dto.connectionId), dto)).toBe(false)
  })

  it('WDG-05 updateWidget troca título e Cypher', () => {
    const draft = updateWidget(fromDto(saved()), uuid(1), uuid(11), {
      title: 'Novo título',
      cypher: 'MATCH (n) RETURN n',
    })
    expect(draft.tabs[0]?.widgets[0]).toMatchObject({
      title: 'Novo título',
      cypher: 'MATCH (n) RETURN n',
      hasQuery: true,
    })
    expect(draft.tabs[0]?.widgets[1]?.title).toBe('Vendas por loja')
  })

  it('VIZ-16 widget novo nasce como Tabela', () => {
    const draft = addWidget(fromDto(saved()), uuid(1), uuid(13))
    expect(draft.tabs[0]?.widgets[2]).toMatchObject({
      id: uuid(13),
      visualization: 'TABLE',
      config: {},
    })
  })

  it('VIZ-15 updateWidget com BAR e o mapeamento leva os dois ao toSavePayload', () => {
    const mapping = {
      x: 'mes',
      series: ['vendas', 'custo'],
      stacked: true,
      horizontal: false,
    }
    const draft = updateWidget(fromDto(saved()), uuid(1), uuid(11), {
      visualization: 'BAR',
      config: { mapping },
    })
    expect(draft.tabs[0]?.widgets[0]).toMatchObject({
      visualization: 'BAR',
      config: { mapping },
    })
    const payload = toSavePayload(draft)
    expect(payload.tabs[0]?.widgets[0]).toMatchObject({
      visualization: 'BAR',
      config: { mapping },
    })
    expect(payload.tabs[0]?.widgets[1]).toMatchObject({
      visualization: 'TABLE',
      config: {},
    })
    expect(dashboardSaveSchema.safeParse(payload).success).toBe(true)
  })

  it('WDG-09 removeWidget tira o widget da aba', () => {
    const draft = removeWidget(fromDto(saved()), uuid(1), uuid(11))
    expect(draft.tabs[0]?.widgets.map((widget) => widget.id)).toEqual([
      uuid(12),
    ])
  })

  it('GRID-06 setLayout grava posição e tamanho pelo id do widget', () => {
    const draft = setLayout(fromDto(saved()), uuid(1), {
      [uuid(12)]: { x: 2, y: 0, w: 6, h: 2 },
    })
    expect(draft.tabs[0]?.widgets[1]?.layout).toEqual({
      x: 2,
      y: 0,
      w: 6,
      h: 2,
    })
    expect(draft.tabs[0]?.widgets[0]?.layout).toEqual({
      x: 0,
      y: 0,
      w: 4,
      h: 3,
    })
  })

  it('EDIT-02 toSavePayload passa em dashboardSaveSchema e leva a version do DTO', () => {
    const payload = toSavePayload(fromDto(saved()))
    expect(payload.version).toBe(3)
    expect(dashboardSaveSchema.safeParse(payload).success).toBe(true)
  })

  it('FLT-17 rascunho leva os filtros ao salvar', () => {
    const category: DashboardFilter = {
      id: uuid(50),
      label: 'Categoria',
      parameter: 'categoria',
      type: 'SINGLE_SELECT',
      options: { source: 'STATIC', values: ['Livros', 'Jogos'] },
      defaultValue: null,
    }
    const original = saved()
    const added = addFilter(fromDto(original), category)
    expect(isDirty(added, original)).toBe(true)
    expect(toSavePayload(added).filters).toEqual([category])

    const renamed = updateFilter(added, uuid(50), {
      ...category,
      label: 'Tipo',
      defaultValue: 'Livros',
    })
    const payload = toSavePayload(renamed)
    expect(payload.filters).toEqual([
      { ...category, label: 'Tipo', defaultValue: 'Livros' },
    ])
    expect(dashboardSaveSchema.safeParse(payload).success).toBe(true)
  })

  it('RFR-03 intervalo padrão vai no payload', () => {
    const original = saved()
    const draft = setRefreshInterval(fromDto(original), 300)
    expect(toSavePayload(draft).refreshIntervalSec).toBe(300)
    expect(isDirty(draft, original)).toBe(true)
  })

  it('XFL-09 removeFilter tira o Ao clicar dos widgets', () => {
    const mapping = { category: 'categoria', value: 'total' }
    const filter = (id: string, parameter: string): DashboardFilter => ({
      id,
      label: parameter,
      parameter,
      type: 'TEXT',
      options: null,
      defaultValue: null,
    })
    const dto = makeDashboard({
      filters: [filter(uuid(50), 'categoria'), filter(uuid(51), 'busca')],
      tabs: [
        {
          id: uuid(1),
          name: 'Aba 1',
          widgets: [
            makeWidget({
              id: uuid(11),
              visualization: 'RADIAL',
              config: {
                mapping,
                crossFilter: { filterId: uuid(50), column: 'categoria' },
              },
            }),
            makeWidget({
              id: uuid(12),
              visualization: 'RADIAL',
              config: {
                mapping,
                crossFilter: { filterId: uuid(51), column: 'categoria' },
              },
            }),
          ],
        },
        {
          id: uuid(2),
          name: 'Aba 2',
          widgets: [
            makeWidget({
              id: uuid(13),
              visualization: 'RADIAL',
              config: {
                mapping,
                crossFilter: { filterId: uuid(50), column: 'categoria' },
              },
            }),
          ],
        },
      ],
    })
    const draft = removeFilter(fromDto(dto), uuid(50))
    expect(draft.filters.map((f) => f.id)).toEqual([uuid(51)])
    expect(draft.tabs[0]?.widgets[0]?.config).toEqual({ mapping })
    expect(draft.tabs[1]?.widgets[0]?.config).toEqual({ mapping })
    expect(draft.tabs[0]?.widgets[1]?.config).toEqual({
      mapping,
      crossFilter: { filterId: uuid(51), column: 'categoria' },
    })
  })
})
