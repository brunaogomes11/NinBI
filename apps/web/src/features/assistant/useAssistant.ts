import {
  type AssistantAction,
  type AssistantEvent,
  type AssistantMessageDto,
  type AssistantRequest,
  extractParameterNames,
  filterParameterNames,
  MESSAGES,
  type QueryLanguage,
  type QueryResultDto,
} from '@ninbi/contracts'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { DashboardDraft } from '@/features/dashboards/draft'
import { ApiError } from '@/lib/api'
import { assistantQueryKey, streamAssistant } from './api'
import { applyAssistantActions } from './apply-actions'

/** Onde o pedido está: `index` 0 é "Pensando...", depois "Gerando widget N de M" (GEN-08). */
export interface AssistantProgress {
  index: number
  total: number
  attempt: number
}

/** Falha do último pedido, com o que falta para "Tentar novamente" (CHAT-21). */
export interface AssistantFailure {
  /** Mensagem do usuário que o servidor guardou; `null` se o pedido nem chegou a ser aceito. */
  userMessageId: string | null
  text: string
  message: string
}

export interface UseAssistantOptions {
  dashboardId: string
  /** `null` fora do modo de edição. */
  draft: DashboardDraft | null
  setDraft: (change: (draft: DashboardDraft) => DashboardDraft) => void
  /** Entra no modo de edição se ainda não está (CHAT-04). */
  ensureEditing: () => void
  editing: boolean
  /** Linguagem da conexão do rascunho; sem ela, Cypher. */
  language?: QueryLanguage
}

interface UndoPoint {
  messageId: string
  before: DashboardDraft
  after: DashboardDraft
}

/** Só a estrutura que o servidor pode ver: nada de resultados nem valores de filtro (CHAT-05, CHAT-06). */
function toRequestDraft(draft: DashboardDraft): AssistantRequest['draft'] {
  return {
    name: draft.name,
    connectionId: draft.connectionId,
    tabs: draft.tabs.map((tab) => ({
      id: tab.id,
      name: tab.name,
      widgets: tab.widgets.map((widget) => ({
        id: widget.id,
        title: widget.title,
        cypher: widget.cypher,
        visualization: widget.visualization,
        mapping:
          (widget.config.mapping as Record<string, unknown> | undefined) ??
          null,
        layout: widget.layout,
      })),
    })),
    filters: draft.filters.map((filter) => ({
      id: filter.id,
      label: filter.label,
      parameter: filter.parameter,
      type: filter.type,
    })),
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function appendOnce(
  messages: AssistantMessageDto[] | undefined,
  message: AssistantMessageDto,
): AssistantMessageDto[] | undefined {
  // conversa ainda não carregada: o carregamento já traz a mensagem
  if (!messages) return messages
  return messages.some((m) => m.id === message.id)
    ? messages
    : [...messages, message]
}

/** Um pedido por vez ao assistente; as ações só entram no rascunho no evento `done` (AD-121). */
export function useAssistant(options: UseAssistantOptions) {
  const queryClient = useQueryClient()
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<AssistantProgress | null>(null)
  const [failure, setFailure] = useState<AssistantFailure | null>(null)
  const [undoPoint, setUndoPoint] = useState<UndoPoint | null>(null)
  const controller = useRef<AbortController | null>(null)
  const queued = useRef<{ text: string; retryOf: string | null } | null>(null)
  const latest = useRef(options)
  latest.current = options

  const seedPreviews = useCallback(
    (
      dashboardId: string,
      after: DashboardDraft,
      actions: AssistantAction[],
      language: QueryLanguage,
    ) => {
      const filterNames = new Set(after.filters.flatMap(filterParameterNames))
      const results = new Map<string, QueryResultDto>()
      for (const action of actions) {
        if (
          (action.type === 'create_widget' ||
            action.type === 'update_widget') &&
          action.result
        ) {
          results.set(action.widgetId, action.result)
        }
      }
      for (const tab of after.tabs) {
        for (const widget of tab.widgets) {
          const result = results.get(widget.id)
          const cypher = widget.cypher ?? ''
          if (!result || cypher.trim() === '') continue
          // Com parâmetro de filtro o resultado do assistente não vale para os valores atuais (FLT-20).
          if (
            extractParameterNames(cypher, language).some((n) =>
              filterNames.has(n),
            )
          ) {
            continue
          }
          queryClient.setQueryData<QueryResultDto>(
            ['query', dashboardId, after.connectionId, cypher],
            result,
          )
        }
      }
    },
    [queryClient],
  )

  const handleDone = useCallback(
    (event: Extract<AssistantEvent, { type: 'done' }>) => {
      const {
        dashboardId,
        draft,
        setDraft,
        language = 'CYPHER',
      } = latest.current
      queryClient.setQueryData<AssistantMessageDto[] | undefined>(
        assistantQueryKey(dashboardId),
        (messages) => appendOnce(messages, event.reply),
      )
      if (!draft || event.actions.length === 0) return
      const before = draft
      const after = applyAssistantActions(before, event.actions, language)
      setDraft(() => after)
      seedPreviews(dashboardId, after, event.actions, language)
      setUndoPoint({ messageId: event.reply.id, before, after })
    },
    [queryClient, seedPreviews],
  )

  const start = useCallback(
    async (text: string, retryOf: string | null) => {
      const { dashboardId, draft } = latest.current
      if (!draft || controller.current) return
      const abort = new AbortController()
      controller.current = abort
      setRunning(true)
      setProgress(null)
      setFailure(null)
      let userMessageId = retryOf
      const fail = (message: string) =>
        setFailure({ userMessageId, text, message })
      try {
        const last = await streamAssistant(
          dashboardId,
          {
            message: text,
            ...(retryOf ? { retryOf } : {}),
            draft: toRequestDraft(draft),
          },
          abort.signal,
          (event) => {
            if (abort.signal.aborted) return
            if (event.type === 'accepted') {
              userMessageId = event.userMessage.id
              queryClient.setQueryData<AssistantMessageDto[] | undefined>(
                assistantQueryKey(dashboardId),
                (messages) => appendOnce(messages, event.userMessage),
              )
            } else if (event.type === 'planned') {
              setProgress({ index: 0, total: event.widgetsTotal, attempt: 0 })
            } else if (event.type === 'widget') {
              setProgress({
                index: event.index,
                total: event.total,
                attempt: event.attempt,
              })
            }
          },
        )
        if (abort.signal.aborted) return
        if (last.type === 'done') handleDone(last)
        else if (last.type === 'provider_error' || last.type === 'error') {
          fail(last.message)
        } else fail(MESSAGES.internalError)
      } catch (error) {
        if (abort.signal.aborted || isAbort(error)) return
        fail(error instanceof ApiError ? error.message : MESSAGES.internalError)
      } finally {
        if (controller.current === abort) {
          controller.current = null
          setRunning(false)
          setProgress(null)
        }
      }
    },
    [handleDone, queryClient],
  )

  const send = useCallback(
    (text: string) => {
      if (controller.current || queued.current) return
      latest.current.ensureEditing()
      if (latest.current.draft) void start(text, null)
      else queued.current = { text, retryOf: null } // o rascunho nasce no próximo render
    },
    [start],
  )

  const retry = useCallback(() => {
    if (!failure || controller.current || queued.current) return
    latest.current.ensureEditing()
    if (latest.current.draft) void start(failure.text, failure.userMessageId)
    else queued.current = { text: failure.text, retryOf: failure.userMessageId }
  }, [failure, start])

  const cancel = useCallback(() => {
    queued.current = null
    controller.current?.abort()
    controller.current = null
    setRunning(false)
    setProgress(null)
  }, [])

  const undo = useCallback(() => {
    if (!undoPoint) return
    latest.current.setDraft(() => undoPoint.before)
    setUndoPoint(null)
  }, [undoPoint])

  // O pedido que esperava o modo de edição sai assim que o rascunho existe (CHAT-04).
  const hasDraft = options.draft !== null
  useEffect(() => {
    if (!hasDraft || !queued.current) return
    const { text, retryOf } = queued.current
    queued.current = null
    void start(text, retryOf)
  }, [hasDraft, start])

  // Sair do modo de edição para o pedido (CHAT-28).
  useEffect(() => {
    if (options.editing) return
    queued.current = null
    controller.current?.abort()
    controller.current = null
    setRunning(false)
    setProgress(null)
  }, [options.editing])

  // Desmontar a página também (CHAT-28).
  useEffect(
    () => () => {
      controller.current?.abort()
      controller.current = null
    },
    [],
  )

  return {
    send,
    retry,
    cancel,
    undo,
    running,
    progress,
    failure,
    /** Só a resposta mais recente que mexeu no rascunho, enquanto o rascunho é o que ela produziu (CHAT-10, AD-126). */
    undoMessageId:
      undoPoint && options.draft === undoPoint.after
        ? undoPoint.messageId
        : null,
  }
}
