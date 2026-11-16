import { zodResolver } from '@hookform/resolvers/zod'
import {
  type ConnectionCreateInput,
  type ConnectionDto,
  connectionCreateSchema,
  connectionUpdateSchema,
} from '@ninbi/contracts'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api'
import { useCreateConnection, useUpdateConnection } from './api'

const FIELDS = [
  { name: 'name', label: 'Nome', type: 'text' },
  { name: 'uri', label: 'URI', type: 'text' },
  { name: 'database', label: 'Banco', type: 'text' },
  { name: 'username', label: 'Usuário', type: 'text' },
] as const

function defaultsFor(connection?: ConnectionDto): ConnectionCreateInput {
  return {
    name: connection?.name ?? '',
    uri: connection?.uri ?? '',
    database: connection?.database ?? '',
    username: connection?.username ?? '',
    password: '',
  }
}

/** Cria (sem `connection`) ou edita (com `connection`) uma conexão; a API testa no Neo4j antes de gravar. */
export function ConnectionFormDialog({
  open,
  onOpenChange,
  connection,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  connection?: ConnectionDto
}) {
  const editing = connection !== undefined
  const form = useForm<ConnectionCreateInput>({
    resolver: zodResolver(
      editing ? connectionUpdateSchema : connectionCreateSchema,
    ) as never,
    defaultValues: defaultsFor(connection),
  })
  const create = useCreateConnection()
  const update = useUpdateConnection(connection?.id ?? '')
  const pending = create.isPending || update.isPending

  // Reabrir recarrega os valores; a lista atualizada com o diálogo aberto não pode apagar o que foi digitado.
  // biome-ignore lint/correctness/useExhaustiveDependencies: depende só de abrir e de qual conexão
  useEffect(() => {
    if (open) form.reset(defaultsFor(connection))
  }, [open, connection?.id, form])

  function submit(values: ConnectionCreateInput) {
    // O resolvedor já aplicou o schema: o banco vazio chega como null.
    const { password, ...rest } = values
    const callbacks = {
      onSuccess: () => onOpenChange(false),
      onError: (error: Error) => {
        if (error instanceof ApiError && error.fieldErrors) {
          for (const [field, message] of Object.entries(error.fieldErrors)) {
            form.setError(field as keyof ConnectionCreateInput, { message })
          }
          return
        }
        form.setError('root', { message: error.message })
      },
    }
    if (editing) {
      // Senha vazia não é enviada: a API mantém a guardada.
      const body = { ...rest, database: rest.database ?? null }
      update.mutate(password ? { ...body, password } : body, callbacks)
    } else {
      create.mutate(
        { ...rest, database: rest.database ?? null, password },
        callbacks,
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Editar conexão' : 'Nova conexão'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit(submit)}
            className="flex flex-col gap-4"
          >
            {FIELDS.map((item) => (
              <FormField
                key={item.name}
                control={form.control}
                name={item.name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{item.label}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        type={item.type}
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="new-password"
                    />
                  </FormControl>
                  {editing && (
                    <FormDescription>
                      Deixe em branco para manter a senha atual
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p role="alert" className="text-destructive text-sm">
                {form.formState.errors.root.message}
              </p>
            )}
            <DialogFooter>
              <Button
                type="submit"
                disabled={pending}
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
