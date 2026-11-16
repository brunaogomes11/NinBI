import { type DashboardDto, MESSAGES } from '@ninbi/contracts'
import { useCallback, useEffect, useState } from 'react'
import { useBlocker, useSearchParams } from 'react-router'
import { ApiError } from '@/lib/api'
import { useSaveDashboard } from './api'
import { type DashboardDraft, fromDto, isDirty, toSavePayload } from './draft'

const EDIT_PARAM = 'editar'

function saveErrorMessage(error: Error): string {
  return error instanceof ApiError && error.status === 409
    ? error.message
    : MESSAGES.dashboardSaveFailed
}

/**
 * Alterna o dashboard entre visualização e edição. Em edição há um rascunho
 * local; "Salvar" envia o rascunho inteiro e "Descartar" volta ao salvo.
 */
export function useDashboardEditor(
  dashboard: DashboardDto,
  onNotFound: () => void,
) {
  const [params, setParams] = useSearchParams()
  const [draft, setDraft] = useState<DashboardDraft | null>(() =>
    dashboard.permissions.edit && params.get(EDIT_PARAM) === '1'
      ? fromDto(dashboard)
      : null,
  )
  const [discardOpen, setDiscardOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const save = useSaveDashboard(dashboard.id)
  const dirty = draft !== null && isDirty(draft, dashboard)

  const exit = useCallback(() => {
    setDraft(null)
    setSaveError(null)
    setDiscardOpen(false)
    if (params.has(EDIT_PARAM)) {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          next.delete(EDIT_PARAM)
          return next
        },
        { replace: true },
      )
    }
  }, [params, setParams])

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  return {
    draft,
    dirty,
    start: () => setDraft(fromDto(dashboard)),
    change: (apply: (current: DashboardDraft) => DashboardDraft) =>
      setDraft((current) => (current ? apply(current) : current)),
    saving: save.isPending,
    saveError,
    save: () => {
      if (!draft) return
      setSaveError(null)
      save.mutate(toSavePayload(draft), {
        onSuccess: exit,
        onError: (error) => {
          if (
            error instanceof ApiError &&
            error.code === 'DASHBOARD_NOT_FOUND'
          ) {
            onNotFound()
            return
          }
          setSaveError(saveErrorMessage(error))
        },
      })
    },
    discardOpen,
    setDiscardOpen,
    requestDiscard: () => (dirty ? setDiscardOpen(true) : exit()),
    confirmDiscard: exit,
    blocker,
  }
}
