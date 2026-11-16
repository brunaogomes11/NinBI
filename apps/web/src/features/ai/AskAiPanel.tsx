import { AI_PROMPT_MAX, MESSAGES } from '@ninbi/contracts'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatNumber } from '@/lib/format'

export interface AskAiPanelProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
  running: boolean
  /** Tentativa em andamento (1 a 4), enquanto `running`. */
  attempt: number
  error: string | null
}

/** Pedido em texto livre ao LLM: envio, andamento e erro (AIQ-12, AIQ-14, AIQ-15). */
export function AskAiPanel({
  value,
  onChange,
  onSubmit,
  onCancel,
  running,
  attempt,
  error,
}: AskAiPanelProps) {
  const tooLong = value.trim().length > AI_PROMPT_MAX
  const canSubmit = value.trim().length > 0 && !tooLong && !running

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        aria-label={MESSAGES.aiPromptPlaceholder}
        placeholder={MESSAGES.aiPromptPlaceholder}
        value={value}
        disabled={running}
        aria-invalid={tooLong}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
      />
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {formatNumber(value.trim().length)}/{formatNumber(AI_PROMPT_MAX)}
        </span>
        {running ? (
          <span role="status">{MESSAGES.aiGenerating(attempt)}</span>
        ) : null}
      </div>
      {tooLong ? (
        <p role="alert" className="text-sm text-destructive">
          {MESSAGES.aiPromptTooLong}
        </p>
      ) : null}
      {error && !running ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
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
