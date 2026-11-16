import {
  MESSAGES,
  SHARE_PERMISSION_LABELS,
  type SharePermission,
  type ShareRecipientInput,
  shareOptionsFor,
} from '@ninbi/contracts'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAddShare, useShareCandidates } from './api'

function ResultRow({
  name,
  email,
  options,
  disabled,
  onAdd,
}: {
  name: string
  email?: string
  options: SharePermission[]
  disabled: boolean
  onAdd: (permission: SharePermission) => void
}) {
  const [permission, setPermission] = useState<SharePermission>('view')
  return (
    <li className="flex items-center gap-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium text-sm" title={name}>
          {name}
        </span>
        {email && (
          <span className="truncate text-muted-foreground text-xs">
            {email}
          </span>
        )}
      </div>
      <Select
        value={permission}
        onValueChange={(value) => setPermission(value as SharePermission)}
      >
        <SelectTrigger className="w-36" aria-label={`Permissão para ${name}`}>
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
        variant="outline"
        disabled={disabled}
        aria-label={`${MESSAGES.shareAdd} ${name}`}
        onClick={() => onAdd(permission)}
      >
        {MESSAGES.shareAdd}
      </Button>
    </li>
  )
}

/** Busca de destinatários no topo da tela de compartilhamento (SHARE-04 a SHARE-06, SHARE-09, SHARE-10). */
export function ShareSearch({
  dashboardId,
  onResult,
}: {
  dashboardId: string
  /** Avisa se a última tentativa de adicionar deu certo. */
  onResult: (ok: boolean) => void
}) {
  const [q, setQ] = useState('')
  const candidates = useShareCandidates(dashboardId, q)
  const add = useAddShare(dashboardId)
  const searching = q.trim() !== ''
  const data = candidates.data

  function addRecipient(
    recipient: ShareRecipientInput,
    permission: SharePermission,
  ) {
    add.mutate(
      { recipient, permission },
      {
        onSuccess: () => {
          setQ('')
          onResult(true)
        },
        onError: () => onResult(false),
      },
    )
  }

  const everyoneMatches = MESSAGES.shareEveryone
    .toLocaleLowerCase('pt-BR')
    .includes(q.trim().toLocaleLowerCase('pt-BR'))
  const noOthers = data ? data.teams.length + data.users.length === 0 : false

  return (
    <div className="flex flex-col gap-2">
      <Input
        type="search"
        autoComplete="off"
        aria-label={MESSAGES.shareSearchLabel}
        placeholder={MESSAGES.shareSearchLabel}
        value={q}
        onChange={(event) => setQ(event.target.value)}
      />
      {searching && data && (
        <div className="max-h-56 overflow-y-auto rounded-control border px-3">
          {noOthers && !everyoneMatches ? (
            <p className="py-3 text-muted-foreground text-sm">
              {MESSAGES.shareSearchEmpty}
            </p>
          ) : (
            <ul aria-label="Resultados da busca" className="divide-y">
              <ResultRow
                name={MESSAGES.shareEveryone}
                options={shareOptionsFor({ type: 'EVERYONE' })}
                disabled={add.isPending}
                onAdd={(permission) =>
                  addRecipient({ type: 'EVERYONE' }, permission)
                }
              />
              {data.teams.map((team) => (
                <ResultRow
                  key={`team-${team.id}`}
                  name={team.name}
                  options={shareOptionsFor({ type: 'TEAM' })}
                  disabled={add.isPending}
                  onAdd={(permission) =>
                    addRecipient({ type: 'TEAM', teamId: team.id }, permission)
                  }
                />
              ))}
              {data.users.map((user) => (
                <ResultRow
                  key={`user-${user.id}`}
                  name={user.name}
                  email={user.email}
                  options={shareOptionsFor({ type: 'USER', role: user.role })}
                  disabled={add.isPending}
                  onAdd={(permission) =>
                    addRecipient({ type: 'USER', userId: user.id }, permission)
                  }
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
