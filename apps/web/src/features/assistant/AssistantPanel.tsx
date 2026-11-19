import { MESSAGES } from '@ninbi/contracts'
import { Sparkles, Trash2, X } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useAiStatus } from '@/features/ai/api'
import { AssistantComposer } from './AssistantComposer'
import { AssistantMessageList } from './AssistantMessageList'
import { useAssistantMessages, useClearAssistant } from './api'
import type { useAssistant } from './useAssistant'

export interface AssistantPanelProps {
  dashboardId: string
  /** Estado e ações de `useAssistant`, que vive na página (o pedido sobrevive a trocar de aba). */
  assistant: ReturnType<typeof useAssistant>
  saveFeedback?: ReactNode
  saving?: boolean
  onClose: () => void
}

/** Janela flutuante do assistente: conversa, campo de mensagem e limpeza (CHAT-19, HIST-04, HIST-05). */
export function AssistantPanel({
  dashboardId,
  assistant,
  onClose,
  saveFeedback,
  saving = false,
}: AssistantPanelProps) {
  const messages = useAssistantMessages(dashboardId)
  const aiStatus = useAiStatus()
  const clear = useClearAssistant(dashboardId)
  const [draftText, setDraftText] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const count = messages.data?.length ?? 0
  const failed = assistant.failure !== null

  // Rola até o último item a cada mensagem nova (CHAT-19).
  // biome-ignore lint/correctness/useExhaustiveDependencies: o efeito reage ao número de mensagens e à falha
  useEffect(() => {
    scroller.current
      ?.querySelector('li:last-child')
      ?.scrollIntoView({ block: 'end' })
  }, [count, failed])

  function submit() {
    const text = draftText.trim()
    if (!text) return
    setDraftText('')
    assistant.send(text)
  }

  return createPortal(
    <aside
      aria-label={MESSAGES.assistantToggle}
      className="assistant-window fixed z-40 flex flex-col overflow-hidden rounded-card border bg-card text-card-foreground"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-card-elevated px-3 py-2">
        <h2 className="flex items-center gap-2 font-semibold text-base">
          <Sparkles aria-hidden="true" className="size-4 text-accent-text" />
          {MESSAGES.assistantToggle}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={assistant.running}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 aria-hidden="true" />
            {MESSAGES.assistantClear}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Fechar assistente"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <AssistantMessageList
          status={messages.status}
          messages={messages.data ?? []}
          onReload={() => void messages.refetch()}
          undoMessageId={
            saving || assistant.running ? null : assistant.undoMessageId
          }
          onUndo={assistant.undo}
          failure={assistant.failure}
          onRetry={assistant.retry}
        />
      </div>
      {saveFeedback}
      <AssistantComposer
        value={draftText}
        onChange={setDraftText}
        onSubmit={submit}
        onCancel={assistant.cancel}
        running={assistant.running && !saving}
        progress={assistant.progress}
        disabledReason={
          saving
            ? 'Salvando dashboard…'
            : aiStatus.data?.configured === false
              ? MESSAGES.llmNotConfigured
              : null
        }
      />
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {MESSAGES.assistantClearConfirm}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => clear.mutate()}>
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>,
    document.body,
  )
}
