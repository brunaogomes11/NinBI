import { ASSISTANT_MESSAGE_MAX, MESSAGES } from '@ninbi/contracts'
import type { KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatNumber } from '@/lib/format'
import type { AssistantProgress } from './useAssistant'

export interface AssistantComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
  running: boolean
  /** `null` enquanto o assistente ainda "pensa" (GEN-08). */
  progress: Pick<AssistantProgress, 'index' | 'total'> | null
  /** Sem provedor de IA: o campo fica desabilitado e a mensagem aparece. */
  disabledReason?: string | null
}

/** Campo de mensagem do assistente: envio, andamento e cancelamento (CHAT-13, CHAT-15, CHAT-16, GEN-08). */
export function AssistantComposer({
  value,
  onChange,
  onSubmit,
  onCancel,
  running,
  progress,
  disabledReason = null,
}: AssistantComposerProps) {
  const length = value.trim().length
  const tooLong = length > ASSISTANT_MESSAGE_MAX
  const canSubmit = length > 0 && !tooLong && !running && !disabledReason

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    )
      return
    event.preventDefault()
    if (canSubmit) onSubmit()
  }

  return (
    <div className="flex flex-col gap-2 border-t p-3">
      <Textarea
        aria-label="Mensagem"
        placeholder={MESSAGES.assistantPlaceholder}
        value={value}
        disabled={running || Boolean(disabledReason)}
        aria-invalid={tooLong}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        rows={3}
      />
      <div className="flex items-center justify-between gap-2 text-muted-foreground text-xs">
        <span>
          {formatNumber(length)}/{formatNumber(ASSISTANT_MESSAGE_MAX)}
        </span>
        {running ? (
          <span role="status">
            {progress && progress.index > 0
              ? MESSAGES.assistantGeneratingWidget(
                  progress.index,
                  progress.total,
                )
              : MESSAGES.assistantThinking}
          </span>
        ) : null}
      </div>
      {disabledReason ? (
        <p className="text-muted-foreground text-sm">{disabledReason}</p>
      ) : null}
      {tooLong ? (
        <p role="alert" className="text-destructive text-sm">
          {MESSAGES.assistantMessageTooLong}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        {running ? (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            Enviar
          </Button>
        )}
      </div>
    </div>
  )
}
