import { zodResolver } from '@hookform/resolvers/zod'
import {
  type ResetPasswordInput,
  ROLE_LABELS,
  ROLES,
  type Role,
  resetPasswordSchema,
  type UserDto,
} from '@ninbi/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiFetch } from '@/lib/api'
import { USERS_QUERY_KEY } from './queryKeys'

type Action = 'role' | 'reset' | 'deactivate'

const GRADIENT_BUTTON =
  'bg-[image:var(--gradient-brand)] text-primary-foreground'

/** Executa uma chamada sobre o usuário e, se der certo, recarrega a lista e fecha o diálogo. */
function useUserMutation<TVariables = void>(
  call: (variables: TVariables) => Promise<unknown>,
  onDone: () => void,
  successMessage?: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: call,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY })
      if (successMessage) toast.success(successMessage)
      onDone()
    },
  })
}

function ErrorLine({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  )
}

function ChangeRoleDialog({
  user,
  onClose,
}: {
  user: UserDto
  onClose: () => void
}) {
  const [role, setRole] = useState<Role>(user.role)
  const change = useUserMutation(
    (next: Role) =>
      apiFetch(`/api/users/${user.id}/role`, {
        method: 'PATCH',
        body: { role: next },
      }),
    onClose,
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar papel de {user.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`role-${user.id}`}>Papel</Label>
          <Select
            value={role}
            onValueChange={(value) => setRole(value as Role)}
          >
            <SelectTrigger id={`role-${user.id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((item) => (
                <SelectItem key={item} value={item}>
                  {ROLE_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ErrorLine message={change.error?.message} />
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={change.isPending}
            className={GRADIENT_BUTTON}
            onClick={() => change.mutate(role)}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ResetPasswordDialog({
  user,
  onClose,
}: {
  user: UserDto
  onClose: () => void
}) {
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { temporaryPassword: '' },
  })
  const reset = useUserMutation(
    (values: ResetPasswordInput) =>
      apiFetch(`/api/users/${user.id}/reset-password`, {
        method: 'POST',
        body: values,
      }),
    onClose,
    'Senha redefinida',
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redefinir senha de {user.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit((values) => reset.mutate(values))}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="temporaryPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha provisória</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="new-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ErrorLine message={reset.error?.message} />
            <DialogFooter>
              <Button
                type="submit"
                disabled={reset.isPending}
                className={GRADIENT_BUTTON}
              >
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function DeactivateDialog({
  user,
  onClose,
}: {
  user: UserDto
  onClose: () => void
}) {
  const deactivate = useUserMutation(
    () => apiFetch(`/api/users/${user.id}/deactivate`, { method: 'POST' }),
    onClose,
  )

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desativar {user.name}?</AlertDialogTitle>{' '}
          <AlertDialogDescription>
            A pessoa não conseguirá mais entrar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ErrorLine message={deactivate.error?.message} />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={deactivate.isPending}
            onClick={(event) => {
              // o diálogo só fecha quando a chamada dá certo
              event.preventDefault()
              deactivate.mutate()
            }}
          >
            Desativar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function UserRowActions({ user }: { user: UserDto }) {
  const [action, setAction] = useState<Action | null>(null)
  const close = () => setAction(null)

  const reactivate = useUserMutation(
    () => apiFetch(`/api/users/${user.id}/reactivate`, { method: 'POST' }),
    () => {},
  )

  let dialog: ReactNode = null
  if (action === 'role')
    dialog = <ChangeRoleDialog user={user} onClose={close} />
  if (action === 'reset')
    dialog = <ResetPasswordDialog user={user} onClose={close} />
  if (action === 'deactivate')
    dialog = <DeactivateDialog user={user} onClose={close} />

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Ações de ${user.name}`}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setAction('role')}>
            Alterar papel
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAction('reset')}>
            Redefinir senha
          </DropdownMenuItem>
          {user.status === 'ACTIVE' ? (
            <DropdownMenuItem onSelect={() => setAction('deactivate')}>
              Desativar
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() =>
                reactivate.mutate(undefined, {
                  onError: (error) => toast.error(error.message),
                })
              }
            >
              Reativar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog}
    </>
  )
}
