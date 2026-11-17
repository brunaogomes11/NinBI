import {
  CONNECTION_TYPES,
  type ConnectionCreate,
  type ConnectionDto,
  type ConnectionType,
  type ConnectionUpdate,
  connectionCreateSchema,
  connectionUpdateSchema,
} from '@ninbi/contracts'
import { useEffect } from 'react'
import { type FieldErrors, type Resolver, useForm } from 'react-hook-form'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApiError } from '@/lib/api'
import {
  connectionTypeLabel,
  defaultPortFor,
  useCreateConnection,
  useUpdateConnection,
} from './api'

interface FormValues {
  type: ConnectionType
  name: string
  uri: string
  host: string
  port: string
  database: string
  username: string
  password: string
  ssl: boolean
}

function defaultsFor(connection?: ConnectionDto): FormValues {
  return {
    type: connection?.type ?? 'NEO4J',
    name: connection?.name ?? '',
    uri: connection?.uri ?? '',
    host: connection?.host ?? '',
    port: connection?.port ? String(connection.port) : '',
    database: connection?.database ?? '',
    username: connection?.username ?? '',
    password: '',
    ssl: connection?.ssl ?? false,
  }
}

/** O corpo que o contrato valida: Neo4j com URI; SQL com host, porta numérica e SSL. */
function toPayload(values: FormValues) {
  const { type, name, database, username, password } = values
  if (type === 'NEO4J') {
    return { type, name, uri: values.uri, database, username, password }
  }
  return {
    type,
    name,
    host: values.host,
    port: Number(values.port),
    database,
    username,
    ssl: values.ssl,
    password,
  }
}

/** Valida com o schema do contrato e leva a mensagem de cada campo ao formulário. */
function resolverFor(editing: boolean): Resolver<FormValues> {
  const schema = editing ? connectionUpdateSchema : connectionCreateSchema
  return async (values) => {
    const parsed = schema.safeParse(toPayload(values))
    if (parsed.success) return { values: parsed.data as never, errors: {} }
    const errors: Record<string, { type: string; message: string }> = {}
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? 'root')
      if (!errors[field]) {
        errors[field] = { type: 'validation', message: issue.message }
      }
    }
    return { values: {}, errors: errors as FieldErrors<FormValues> }
  }
}

const TEXT_FIELDS = {
  name: 'Nome',
  uri: 'URI',
  host: 'Host',
  port: 'Porta',
  database: 'Banco',
  username: 'Usuário',
} as const
type TextField = keyof typeof TEXT_FIELDS

const FIELDS_BY_KIND: Record<'NEO4J' | 'SQL', TextField[]> = {
  NEO4J: ['name', 'uri', 'database', 'username'],
  SQL: ['name', 'host', 'port', 'database', 'username'],
}

/** Cria (sem `connection`) ou edita (com `connection`) uma conexão; a API testa no banco antes de gravar. */
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
  const form = useForm<FormValues>({
    resolver: resolverFor(editing),
    defaultValues: defaultsFor(connection),
  })
  const isSql = form.watch('type') !== 'NEO4J'
  const create = useCreateConnection()
  const update = useUpdateConnection(connection?.id ?? '')
  const pending = create.isPending || update.isPending

  // Reabrir recarrega os valores; a lista atualizada com o diálogo aberto não pode apagar o que foi digitado.
  // biome-ignore lint/correctness/useExhaustiveDependencies: depende só de abrir e de qual conexão
  useEffect(() => {
    if (open) form.reset(defaultsFor(connection))
  }, [open, connection?.id, form])

  function submit(resolved: FormValues) {
    // O resolvedor já aplicou o contrato: o banco vazio do Neo4j chega como null.
    const values = resolved as unknown as ConnectionCreate
    const callbacks = {
      onSuccess: () => onOpenChange(false),
      onError: (error: Error) => {
        if (error instanceof ApiError && error.fieldErrors) {
          for (const [field, message] of Object.entries(error.fieldErrors)) {
            form.setError(field as keyof FormValues, { message })
          }
          return
        }
        form.setError('root', { message: error.message })
      },
    }
    if (editing) {
      // Senha vazia não é enviada: a API mantém a guardada.
      const { password, ...rest } = values
      update.mutate(
        (password ? { ...rest, password } : rest) as ConnectionUpdate,
        callbacks,
      )
    } else {
      create.mutate(values, callbacks)
    }
  }

  function chooseType(next: ConnectionType) {
    form.setValue('type', next)
    const port = defaultPortFor(next)
    if (port) form.setValue('port', String(port))
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
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(next) => chooseType(next as ConnectionType)}
                    disabled={editing}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONNECTION_TYPES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {connectionTypeLabel(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {FIELDS_BY_KIND[isSql ? 'SQL' : 'NEO4J'].map((name) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{TEXT_FIELDS[name]}</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" autoComplete="off" />
                    </FormControl>
                    {isSql && name === 'username' && (
                      <FormDescription>
                        Use um usuário com permissão só de leitura
                      </FormDescription>
                    )}
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
            {isSql && (
              <FormField
                control={form.control}
                name="ssl"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Usar SSL</FormLabel>
                  </FormItem>
                )}
              />
            )}
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
