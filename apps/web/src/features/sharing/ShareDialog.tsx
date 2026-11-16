import {
  MESSAGES,
  SHARE_PERMISSION_LABELS,
  type ShareDto,
  type SharePermission,
  shareOptionsFor,
} from '@ninbi/contracts'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useChangeShare, useRemoveShare, useShares } from './api'

const SKELETON_ROWS = 3

function recipientName(share: ShareDto): string {
  const { recipient } = share
  return recipient.type === 'EVERYONE' ? MESSAGES.shareEveryone : recipient.name
}

function ShareRow({
  share,
  disabled,
  onChange,
  onRemove,
}: {
  share: ShareDto
  disabled: boolean
  onChange: (permission: SharePermission) => void
  onRemove: () => void
}) {
  const { recipient } = share
  const name = recipientName(share)
  const options = shareOptionsFor(
    recipient.type === 'USER'
      ? { type: 'USER', role: recipient.role }
      : { type: recipient.type },
  )
  return (
    <li className="flex items-center gap-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium text-sm" title={name}>
            {name}
          </span>
          {recipient.type === 'USER' && recipient.disabled && (
            <Badge variant="outline" className="text-muted-foreground">
              {MESSAGES.shareDisabled}
            </Badge>
          )}
        </span>
        {recipient.type === 'USER' && (
          <span className="truncate text-muted-foreground text-xs">
            {recipient.email}
          </span>
        )}
      </div>
      <Select
        value={share.permission}
        disabled={disabled}
        onValueChange={(value) => onChange(value as SharePermission)}
      >
        <SelectTrigger className="w-36" aria-label={`Permissão de ${name}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {SHARE_PERMISSION_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        disabled={disabled}
        aria-label={`${MESSAGES.shareRemove} ${name}`}
        onClick={onRemove}
      >
        {MESSAGES.shareRemove}
      </Button>
    </li>
  )
}

export function ShareDialog({
  dashboardId,
  onClose,
}: {
  dashboardId: string
  onClose: () => void
}) {
  const shares = useShares(dashboardId)
  const change = useChangeShare(dashboardId)
  const remove = useRemoveShare(dashboardId)
  const [failed, setFailed] = useState(false)
  const busy = change.isPending || remove.isPending
  const showError = failed || shares.isError
  const settle = {
    onSuccess: () => setFailed(false),
    onError: () => setFailed(true),
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{MESSAGES.shareTitle}</DialogTitle>
        </DialogHeader>
        {shares.data && (
          <p className="text-muted-foreground text-sm">
            {MESSAGES.shareOwner(shares.data.ownerName)}
          </p>
        )}
        <div data-testid="share-search" />
        {showError && (
          <div className="flex items-center gap-3">
            <p role="alert" className="text-destructive text-sm">
              {MESSAGES.shareUpdateFailed}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFailed(false)
                void shares.refetch()
              }}
            >
              Tentar novamente
            </Button>
          </div>
        )}
        <div
          data-testid="share-list"
          className="max-h-80 overflow-y-auto"
          aria-busy={shares.isPending}
        >
          {shares.isPending ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: linhas de esqueleto são todas iguais
                <Skeleton key={index} className="h-9 w-full" />
              ))}
            </div>
          ) : shares.data && shares.data.shares.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {MESSAGES.shareEmpty}
            </p>
          ) : (
            <ul className="divide-y">
              {shares.data?.shares.map((share) => (
                <ShareRow
                  key={share.id}
                  share={share}
                  disabled={busy}
                  onChange={(permission) =>
                    change.mutate({ shareId: share.id, permission }, settle)
                  }
                  onRemove={() => remove.mutate(share.id, settle)}
                />
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
