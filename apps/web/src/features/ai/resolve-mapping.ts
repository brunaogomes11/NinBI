import type { QueryResultDto, WidgetVisualization } from '@ninbi/contracts'
import { columnIndex } from '../widgets/mapping/columns'
import {
  type MappingDraft,
  suggestMapping,
  validateMapping,
} from '../widgets/mapping/suggest'

export interface ResolvedMapping {
  visualization: WidgetVisualization
  config: { mapping?: MappingDraft }
}

function columnNames(mapping: MappingDraft): string[] {
  return Object.values(mapping).flatMap((value) => {
    if (typeof value === 'string') return [value]
    if (Array.isArray(value)) return value
    return []
  })
}

function usable(
  visualization: WidgetVisualization,
  mapping: MappingDraft,
  result: QueryResultDto,
): boolean {
  return (
    validateMapping(visualization, mapping) === null &&
    columnNames(mapping).every((name) => columnIndex(result, name) !== -1)
  )
}

/** Mapeamento da IA que não serve vira a sugestão automática; sem sugestão, Tabela (AIQ-30). */
export function resolveAiMapping(
  visualization: WidgetVisualization,
  mapping: Record<string, unknown> | null,
  result: QueryResultDto,
): ResolvedMapping {
  if (visualization === 'TABLE') return { visualization, config: {} }
  const given = mapping as MappingDraft | null
  if (given && usable(visualization, given, result)) {
    return { visualization, config: { mapping: given } }
  }
  const suggested = suggestMapping(visualization, result)
  if (validateMapping(visualization, suggested) === null) {
    return { visualization, config: { mapping: suggested } }
  }
  return { visualization: 'TABLE', config: {} }
}
