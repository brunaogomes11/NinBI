import { describe, expect, it } from 'vitest'
import { dashboardSaveSchema } from './dashboards'
import { MESSAGES } from './messages'
import { VISUALIZATION_LABELS, WIDGET_VISUALIZATIONS } from './widget-config'

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const widget = (visualization: string, config: Record<string, unknown>) => ({
  id: id(10),
  title: 'Widget',
  cypher: 'RETURN 1',
  visualization,
  config,
  layout: { x: 0, y: 0, w: 4, h: 4 },
})

const save = (w: unknown) => ({
  version: 1,
  name: 'Vendas',
  connectionId: id(1),
  tabs: [{ id: id(2), name: 'Geral', widgets: [w] }],
})

const VALID: Record<string, Record<string, unknown>> = {
  TABLE: {},
  LIST: { mapping: { primary: 'nome', secondary: null, values: ['total'] } },
  AREA: { mapping: { x: 'mes', series: ['vendas'], stacked: false } },
  BAR: {
    mapping: {
      x: 'mes',
      series: ['vendas', 'custo'],
      stacked: true,
      horizontal: false,
    },
  },
  LINE: { mapping: { x: 'mes', series: ['vendas'] } },
  PIE: { mapping: { category: 'mes', value: 'vendas', donut: false } },
  RADAR: { mapping: { axis: 'mes', series: ['vendas', 'custo'] } },
  RADIAL: { mapping: { category: 'mes', value: 'vendas' } },
  KPI: { mapping: { value: 'saldo', change: null } },
  MAP: { mapping: { lat: 'lat', lon: 'lon', label: 'nome' } },
}

function messageOf(value: unknown): string | null {
  const result = dashboardSaveSchema.safeParse(value)
  if (result.success) return null
  return result.error.issues[0]?.message ?? null
}

describe('widget-config', () => {
  it('VIZ-01 rótulos das visualizações na ordem da spec', () => {
    expect(WIDGET_VISUALIZATIONS.map((v) => VISUALIZATION_LABELS[v])).toEqual([
      'Tabela',
      'Lista',
      'Área',
      'Barras',
      'Linha',
      'Pizza',
      'Radar',
      'Radial',
      'KPI',
      'Mapa',
    ])
  })

  it('VIZ-15 contrato aceita o mapeamento de cada visualização e recusa o que não combina', () => {
    for (const v of WIDGET_VISUALIZATIONS) {
      const result = dashboardSaveSchema.safeParse(save(widget(v, VALID[v])))
      expect(result.success, v).toBe(true)
    }
    const invalid = MESSAGES.invalidWidgetConfig
    expect(invalid).toBe('Configuração da visualização inválida')

    const noX = {
      mapping: { series: ['vendas'], stacked: false, horizontal: false },
    }
    expect(messageOf(save(widget('BAR', noX)))).toBe(invalid)

    const emptySeries = {
      mapping: { x: 'mes', series: [], stacked: false, horizontal: false },
    }
    expect(messageOf(save(widget('BAR', emptySeries)))).toBe(invalid)

    const threeValues = {
      mapping: {
        primary: 'nome',
        secondary: null,
        values: ['a', 'b', 'c'],
      },
    }
    expect(messageOf(save(widget('LIST', threeValues)))).toBe(invalid)

    const noLon = { mapping: { lat: 'lat', label: null } }
    expect(messageOf(save(widget('MAP', noLon)))).toBe(invalid)

    expect(messageOf(save(widget('PIE', {})))).toBe(invalid)

    expect(
      dashboardSaveSchema.safeParse(save(widget('PIZZA', {}))).success,
    ).toBe(false)
  })

  it('VIZ-15 mensagens novas têm o texto exato', () => {
    expect(MESSAGES.chooseField('Eixo X')).toBe('Escolha Eixo X')
    expect(MESSAGES.mappingColumnMissing('vendas')).toBe(
      'A visualização não combina com o resultado: a coluna vendas não existe',
    )
    expect(MESSAGES.columnWithoutNumbers('vendas')).toBe(
      'A coluna vendas não tem números',
    )
    expect(MESSAGES.categoriesCut(12, 30)).toBe('Mostrando 12 de 30 categorias')
    expect(MESSAGES.invalidCoordinates(3)).toBe(
      '3 linhas sem coordenadas válidas',
    )
    expect(MESSAGES.invalidCoordinates(1)).toBe(
      '1 linha sem coordenadas válidas',
    )
    expect(MESSAGES.runQueryToMap).toBe(
      'Execute a consulta para escolher as colunas',
    )
    expect(MESSAGES.noValidCoordinates).toBe(
      'Nenhuma linha com coordenadas válidas',
    )
    expect(MESSAGES.mapTilesFailed).toBe(
      'Não foi possível carregar o mapa de fundo',
    )
  })
})
