import {
  WIDGET_VISUALIZATIONS,
  type WidgetVisualization,
  widgetMappingSchemas,
} from '@ninbi/contracts'

const TITLE_MAX = 80

export interface RawWidgetReply {
  cypher: string
  visualization?: unknown
  mapping?: unknown
  title?: unknown
}

export interface NormalizedReply {
  cypher: string
  visualization: WidgetVisualization
  mapping: Record<string, unknown> | null
  title: string
}

/** Fim do objeto JSON que começa em `start`, respeitando textos entre aspas; -1 se não fecha. */
export function balancedEnd(text: string, start: number): number {
  let depth = 0
  let inString = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (ch === '\\') i++
      else if (ch === '"') inString = false
    } else if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}' && --depth === 0) return i
  }
  return -1
}

function firstJsonObject(text: string): Record<string, unknown> | null {
  for (let start = text.indexOf('{'); start >= 0; ) {
    const end = balancedEnd(text, start)
    if (end >= 0) {
      try {
        const parsed: unknown = JSON.parse(text.slice(start, end + 1))
        // Só vale o objeto que traz `cypher`; prosa com outro JSON antes não o esconde (FIX-05).
        if (
          parsed &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed) &&
          typeof (parsed as { cypher?: unknown }).cypher === 'string'
        ) {
          return parsed as Record<string, unknown>
        }
      } catch {
        // este trecho não é JSON: tenta o próximo `{`
      }
    }
    start = text.indexOf('{', start + 1)
  }
  return null
}

/** Lê a resposta do modelo: objeto JSON (com ou sem cercas) ou, no lugar dele, um bloco `cypher` (FIX-05). */
export function parseWidgetReply(
  text: string,
): { ok: true; reply: RawWidgetReply } | { ok: false } {
  const object = firstJsonObject(text)
  const fenced = /```cypher\s*\n?([\s\S]*?)```/i.exec(text)?.[1]
  const raw: Record<string, unknown> | null =
    object ?? (fenced === undefined ? null : { cypher: fenced })
  if (!raw || typeof raw.cypher !== 'string' || raw.cypher.trim() === '') {
    return { ok: false }
  }
  return { ok: true, reply: { ...raw, cypher: raw.cypher.trim() } }
}

/** Garante visualização conhecida, mapeamento no formato e título válido (AIQ-20). */
export function normalizeWidgetReply(
  raw: RawWidgetReply,
  current: { title: string },
): NormalizedReply {
  const requested =
    typeof raw.visualization === 'string'
      ? raw.visualization.trim().toUpperCase()
      : ''
  const visualization =
    WIDGET_VISUALIZATIONS.find((code) => code === requested) ?? 'TABLE'
  const parsed =
    visualization === 'TABLE'
      ? null
      : widgetMappingSchemas[visualization].safeParse(raw.mapping)
  const title =
    typeof raw.title === 'string' ? raw.title.trim().slice(0, TITLE_MAX) : ''
  return {
    cypher: raw.cypher,
    visualization,
    mapping: parsed?.success ? (parsed.data as Record<string, unknown>) : null,
    title: title || current.title,
  }
}
