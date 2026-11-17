import { type QueryKey, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

interface AutoRefreshOptions {
  /** Segundos entre as atualizações; `0` desliga. */
  intervalSec: number
  /** Em edição: nenhuma atualização automática (RFR-07). */
  paused: boolean
  /** Muda quando um filtro muda: a contagem recomeça (RFR-12). */
  resetKey: number
  /** Chaves das execuções dos widgets da aba ativa. */
  queryKeys: QueryKey[]
}

/**
 * Executa de novo os widgets da aba ativa a cada intervalo. Aba do navegador
 * oculta não executa; ao voltar, uma execução se o prazo já venceu. Execução em
 * andamento não é repetida (`cancelRefetch: false`).
 */
export function useAutoRefresh({
  intervalSec,
  paused,
  resetKey,
  queryKeys,
}: AutoRefreshOptions): void {
  const queryClient = useQueryClient()
  const keysRef = useRef(queryKeys)
  useEffect(() => {
    keysRef.current = queryKeys
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey só reinicia a contagem
  useEffect(() => {
    if (paused || intervalSec <= 0) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let overdue = false

    const refresh = () => {
      for (const queryKey of keysRef.current) {
        void queryClient.refetchQueries(
          { queryKey, exact: true },
          { cancelRefetch: false },
        )
      }
    }
    const schedule = () => {
      timer = setTimeout(onDue, intervalSec * 1000)
    }
    const onDue = () => {
      if (document.hidden) {
        overdue = true
        return
      }
      refresh()
      schedule()
    }
    const onVisibility = () => {
      if (document.hidden || !overdue) return
      overdue = false
      refresh()
      schedule()
    }

    document.addEventListener('visibilitychange', onVisibility)
    schedule()
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      clearTimeout(timer)
    }
  }, [intervalSec, paused, resetKey, queryClient])
}
