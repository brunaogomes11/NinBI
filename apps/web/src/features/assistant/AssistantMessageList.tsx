import { type AssistantMessageDto, MESSAGES } from '@ninbi/contracts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { AssistantFailure } from './useAssistant'

export interface AssistantMessageListProps {
  status: 'pending' | 'error' | 'success'
  messages: AssistantMessageDto[]
  onReload: () => void
  /** Só esta resposta mostra "Desfazer" (CHAT-10, HIST-09). */
  undoMessageId: string | null
  onUndo: () => void
  failure: AssistantFailure | null
  onRetry: () => void
}

function FailureNote({
  failure,
  onRetry,
}: {
  failure: AssistantFailure
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <p role="alert" className="text-destructive text-sm">
        {failure.message}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  )
}

function ReplyDetails({ message }: { message: AssistantMessageDto }) {
  const details = message.details
  if (!details) return null
  const lines = [
    ...details.changes,
    ...details.notApplied,
    ...(details.createdWidgets > 0
      ? [MESSAGES.assistantWidgetsCreated(details.createdWidgets)]
      : []),
    ...(details.failedWidgets.length > 0
      ? [MESSAGES.assistantWidgetsFailed(details.failedWidgets)]
      : []),
    ...(details.discardedWidgets > 0
      ? [MESSAGES.assistantWidgetsDiscarded(details.discardedWidgets)]
      : []),
  ]
  if (lines.length === 0) return null
  return (
    <ul className="mt-2 flex list-disc flex-col gap-0.5 pl-4 text-muted-foreground text-sm">
      {lines.map((line, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: linhas de resumo podem repetir
        <li key={index}>{line}</li>
      ))}
    </ul>
  )
}

/** A conversa do usuário com o assistente neste dashboard (HIST-07 a HIST-09, CHAT-09, CHAT-20, CHAT-21). */
export function AssistantMessageList({
  status,
  messages,
  onReload,
  undoMessageId,
  onUndo,
  failure,
  onRetry,
}: AssistantMessageListProps) {
  if (status === 'pending') {
    return (
      <div className="flex flex-col gap-3 p-3" aria-busy="true">
        <Skeleton className="h-10 w-3/4 self-end" />
        <Skeleton className="h-16 w-4/5" />
        <Skeleton className="h-10 w-2/3 self-end" />
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="flex flex-col items-start gap-2 p-3">
        <p role="alert" className="text-destructive text-sm">
          {MESSAGES.assistantLoadFailed}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onReload}>
          Tentar novamente
        </Button>
      </div>
    )
  }
  const failureAttached =
    failure?.userMessageId != null &&
    messages.some((message) => message.id === failure.userMessageId)
  if (messages.length === 0 && !failure) {
    return (
      <p className="p-4 text-center text-muted-foreground text-sm">
        {MESSAGES.assistantEmpty}
      </p>
    )
  }
  return (
    <ol className="flex flex-col gap-3 p-3">
      {messages.map((message) => {
        const mine = message.role === 'USER'
        return (
          <li
            key={message.id}
            className={cn(
              'flex flex-col gap-2',
              mine ? 'items-end' : 'items-start',
            )}
          >
            <div
              className={cn(
                'max-w-full rounded-card px-3 py-2 text-sm',
                mine
                  ? 'bg-[image:var(--gradient-brand)] text-primary-foreground'
                  : 'bg-card-elevated',
              )}
            >
              <p className="whitespace-pre-wrap break-words">{message.text}</p>
              {!mine && <ReplyDetails message={message} />}
            </div>
            {!mine && undoMessageId === message.id && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onUndo}
              >
                {MESSAGES.assistantUndo}
              </Button>
            )}
            {failure &&
              failureAttached &&
              failure.userMessageId === message.id && (
                <FailureNote failure={failure} onRetry={onRetry} />
              )}
          </li>
        )
      })}
      {failure && !failureAttached && (
        <li>
          <FailureNote failure={failure} onRetry={onRetry} />
        </li>
      )}
    </ol>
  )
}
