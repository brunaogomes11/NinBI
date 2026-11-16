import { ROLE_LABELS } from '@ninbi/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, KeyRound, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SESSION_QUERY_KEY, useSession } from '@/features/auth/useSession'
import { apiFetch } from '@/lib/api'

/** "Ana Souza" vira "AS"; nome de uma palavra só usa as duas primeiras letras. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

export function UserMenu() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const logout = useMutation({
    mutationFn: () =>
      apiFetch('/api/auth/logout', {
        method: 'POST',
        notifyUnauthorized: false,
      }),
    onSuccess: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, null)
      navigate('/entrar', { replace: true })
    },
    onError: (error) => toast.error(error.message),
  })

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-3 rounded-control px-2 py-1.5 text-left outline-none transition-colors hover:bg-card-elevated focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar>
            <AvatarFallback className="bg-[image:var(--gradient-brand)] font-semibold text-primary-foreground">
              {initialsOf(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="flex flex-col leading-tight">
            <span className="font-semibold text-foreground text-sm">
              {user.name}
            </span>
            <span className="text-muted-foreground text-xs">
              {ROLE_LABELS[user.role]}
            </span>
          </span>
          <ChevronDown
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuItem>
          <KeyRound aria-hidden="true" />
          Alterar senha
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => logout.mutate()}>
          <LogOut aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
