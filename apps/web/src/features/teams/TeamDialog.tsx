import { zodResolver } from '@hookform/resolvers/zod'
import {
  MESSAGES,
  type TeamDto,
  teamCreateSchema,
  type UserDto,
} from '@ninbi/contracts'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { USERS_QUERY_KEY } from '@/features/users/queryKeys'
import { ApiError, apiFetch } from '@/lib/api'
import { useCreateTeam, useUpdateTeam } from './api'

const nameSchema = teamCreateSchema.pick({ name: true })
type NameValues = z.input<typeof nameSchema>

/** "Nova equipe" (sem `team`) e "Editar equipe" (com `team`). */
export function TeamDialog({
  team,
  onClose,
}: {
  team?: TeamDto
  onClose: () => void
}) {
  const form = useForm<NameValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: team?.name ?? '' },
  })
  const [memberIds, setMemberIds] = useState<string[]>(
    () => team?.members.map((member) => member.id) ?? [],
  )
  const users = useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: () => apiFetch<UserDto[]>('/api/users'),
  })
  const create = useCreateTeam()
  const update = useUpdateTeam(team?.id ?? '')
  const saving = create.isPending || update.isPending

  const toggle = (id: string, checked: boolean) =>
    setMemberIds((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id),
    )

  const submit = form.handleSubmit(async (values) => {
    const body = { name: values.name, memberIds }
    try {
      if (team) await update.mutateAsync(body)
      else await create.mutateAsync(body)
      onClose()
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors?.name) {
        form.setError('name', { message: error.fieldErrors.name })
        return
      }
      form.setError('root', {
        message:
          error instanceof Error ? error.message : MESSAGES.teamsLoadFailed,
      })
    }
  })

  const activeUsers = (users.data ?? []).filter(
    (user) => user.status === 'ACTIVE',
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {team ? MESSAGES.editTeam : MESSAGES.newTeam}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form noValidate onSubmit={submit} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} type="text" autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 font-medium text-sm">Membros</legend>
              <div className="flex max-h-60 flex-col gap-2 overflow-y-auto">
                {activeUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`member-${user.id}`}
                      checked={memberIds.includes(user.id)}
                      onCheckedChange={(checked) =>
                        toggle(user.id, checked === true)
                      }
                    />
                    <Label
                      htmlFor={`member-${user.id}`}
                      className="font-normal"
                    >
                      {user.name}
                      <span className="text-muted-foreground text-xs">
                        {user.email}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </fieldset>
            {form.formState.errors.root ? (
              <p role="alert" className="text-destructive text-sm">
                {form.formState.errors.root.message}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[image:var(--gradient-brand)] text-primary-foreground"
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
