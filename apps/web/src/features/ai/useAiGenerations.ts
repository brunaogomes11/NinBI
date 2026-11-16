import {
  type AiWidgetEvent,
  MESSAGES,
  type QueryResultDto,
  type WidgetDto,
} from '@ninbi/contracts'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type DashboardDraft, updateWidget } from '@/features/dashboards/draft'
import { ApiError } from '@/lib/api'
import { streamAiWidget } from './api'
import { resolveAiMapping } from './resolve-mapping'

/** Estado de um widget com pedido à IA: gerando, ou o último erro com o texto pedido. */
export interface AiGenerationState {
  running?: { attempt: number }
  error?: { message: string; prompt: string }
}

export interface AiFailure {
  cypher: string | null
  message: string
}

export interface UseAiGenerationsOptions {
  dashboardId: string
  draft: DashboardDraft
  setDraft: (change: (draft: DashboardDraft) => DashboardDraft) => void
  editing: boolean
  /** A 4ª tentativa falhou: o editor abre com o último Cypher e a mensagem (FIX-06). */
  onFailed: (widgetId: string, failure: AiFailure) => void
}

function findWidget(
  draft: DashboardDraft,
  widgetId: string,
): { tabId: string; widget: WidgetDto } | null {
  for (const tab of draft.tabs) {
    const widget = tab.widgets.find((candidate) => candidate.id === widgetId)
    if (widget) return { tabId: tab.id, widget }
  }
  return null
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

/** Um pedido à IA por widget; só `done` mexe no rascunho (AIQ-09, FIX-07). */
export function useAiGenerations(options: UseAiGenerationsOptions) {
  const queryClient = useQueryClient()
  const [states, setStates] = useState<Record<string, AiGenerationState>>({})
  const controllers = useRef(new Map<string, AbortController>())
  const latest = useRef(options)
  latest.current = options

  const setState = useCallback(
    (widgetId: string, state: AiGenerationState | null) => {
      setStates((current) => {
        const next = { ...current }
        if (state) next[widgetId] = state
        else delete next[widgetId]
        return next
      })
    },
    [],
  )

  const applyDone = useCallback(
    (widgetId: string, event: Extract<AiWidgetEvent, { type: 'done' }>) => {
      const { dashboardId, draft, setDraft } = latest.current
      const found = findWidget(draft, widgetId)
      if (!found) return // widget removido durante a geração (AIQ-29)
      const resolved = resolveAiMapping(
        event.visualization,
        event.mapping,
        event.result,
      )
      setDraft((current) =>
        updateWidget(current, found.tabId, widgetId, {
          title: event.title,
          cypher: event.cypher,
          visualization: resolved.visualization,
          config: resolved.config,
        }),
      )
      queryClient.setQueryData<QueryResultDto>(
        ['query', dashboardId, draft.connectionId, event.cypher],
        event.result,
      )
    },
    [queryClient],
  )

  const start = useCallback(
    async (widgetId: string, prompt: string) => {
      const { dashboardId, draft } = latest.current
      const found = findWidget(draft, widgetId)
      if (!found || controllers.current.has(widgetId)) return
      const controller = new AbortController()
      controllers.current.set(widgetId, controller)
      setState(widgetId, { running: { attempt: 1 } })
      const { widget } = found
      try {
        const last = await streamAiWidget(
          dashboardId,
          {
            prompt,
            widgetId,
            connectionId: draft.connectionId,
            widget: {
              title: widget.title,
              cypher: widget.cypher,
              visualization: widget.visualization,
              config: widget.config,
            },
          },
          controller.signal,
          (event) => {
            if (event.type === 'attempt') {
              setState(widgetId, { running: { attempt: event.attempt } })
            }
          },
        )
        if (controller.signal.aborted) return
        if (last.type === 'done') {
          applyDone(widgetId, last)
          setState(widgetId, null)
        } else if (last.type === 'failed') {
          setState(widgetId, null)
          latest.current.onFailed(widgetId, {
            cypher: last.cypher,
            message: last.message,
          })
        } else if (last.type === 'provider_error' || last.type === 'stopped') {
          setState(widgetId, { error: { message: last.message, prompt } })
        } else {
          setState(widgetId, {
            error: { message: MESSAGES.internalError, prompt },
          })
        }
      } catch (error) {
        if (controller.signal.aborted || isAbort(error)) return
        const message =
          error instanceof ApiError ? error.message : MESSAGES.internalError
        setState(widgetId, { error: { message, prompt } })
      } finally {
        if (controllers.current.get(widgetId) === controller) {
          controllers.current.delete(widgetId)
        }
      }
    },
    [applyDone, setState],
  )

  const cancel = useCallback(
    (widgetId: string) => {
      controllers.current.get(widgetId)?.abort()
      controllers.current.delete(widgetId)
      setState(widgetId, null)
    },
    [setState],
  )

  const dismissError = useCallback(
    (widgetId: string) => setState(widgetId, null),
    [setState],
  )

  // Sair do modo de edição para todas as gerações (AIQ-28).
  useEffect(() => {
    if (options.editing) return
    for (const controller of controllers.current.values()) controller.abort()
    controllers.current.clear()
    setStates({})
  }, [options.editing])

  // Desmontar a página também (AIQ-28).
  useEffect(() => {
    const active = controllers.current
    return () => {
      for (const controller of active.values()) controller.abort()
      active.clear()
    }
  }, [])

  return {
    states,
    stateOf: (widgetId: string): AiGenerationState => states[widgetId] ?? {},
    start,
    cancel,
    dismissError,
  }
}

export type AiGenerations = ReturnType<typeof useAiGenerations>
