import { zodResolver } from '@hookform/resolvers/zod'
import {
  assistantDescriptionSchema,
  can,
  type DashboardCreateInput,
  dashboardCreateSchema,
  MESSAGES,
} from '@ninbi/contracts'
import { useState } from 'react'
import { type Resolver, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAiStatus } from '@/features/ai/api'
import { useSession } from '@/features/auth/useSession'
import { useConnections } from '@/features/connections/api'
import { useMcpConnections } from '@/features/connections/mcp-api'
import { ApiError } from '@/lib/api'
import { useCreateDashboard } from './api'

type NewDashboardValues = DashboardCreateInput & { description: string }
type Mode = 'blank' | 'describe'

/** "Novo dashboard": nome e conexão (e a descrição para a IA); ao criar, abre o dashboard já em edição. */
export function NewDashboardDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const connections = useConnections()
  const mcp = useMcpConnections(open)
  const create = useCreateDashboard()
  const { user } = useSession()
  const canUseAi = user ? can(user.role, 'ai.use') : false
  const aiStatus = useAiStatus(canUseAi)
  const aiAvailable = aiStatus.data?.configured === true
  const [mode, setMode] = useState<Mode>('blank')
  const describing = canUseAi && mode === 'describe'
  const resolver: Resolver<NewDashboardValues> = async (
    values,
    context,
    options,
  ) => {
    const base = await zodResolver(dashboardCreateSchema)(
      values,
      context,
      options as never,
    )
    const parsed = assistantDescriptionSchema.safeParse(values.description)
    if (describing && values.connectionId === null) {
      return {
        values: {},
        errors: {
          connectionId: {
            type: 'validation',
            message: 'Escolha uma conexão de banco para usar a IA.',
          },
        },
      }
    }
    if (!describing || parsed.success) {
      // o zod descarta o que o esquema não conhece: a descrição volta junto
      return {
        ...base,
        values: { ...base.values, description: values.description ?? '' },
      } as never
    }
    return {
      values: {},
      errors: {
        ...base.errors,
        description: {
          type: 'validation',
          message: parsed.error.issues[0]?.message,
        },
      },
    } as never
  }
  const form = useForm<NewDashboardValues>({
    resolver,
    defaultValues: { name: '', connectionId: '', description: '' },
  })
  const hasMcp = !describing && (mcp.data?.length ?? 0) > 0
  const noConnections = connections.data?.length === 0 && !hasMcp

  function submit(values: NewDashboardValues) {
    const assistantPrompt = describing ? values.description.trim() : null
    create.mutate(
      { name: values.name, connectionId: values.connectionId },
      {
        onSuccess: (dashboard) => {
          form.reset()
          setMode('blank')
          onOpenChange(false)
          navigate(
            `/dashboards/${dashboard.id}?editar=1`,
            assistantPrompt ? { state: { assistantPrompt } } : undefined,
          )
        },
        onError: (error) => {
          if (error instanceof ApiError && error.fieldErrors) {
            for (const [field, message] of Object.entries(error.fieldErrors)) {
              form.setError(field as keyof DashboardCreateInput, { message })
            }
            return
          }
          form.setError('root', { message: error.message })
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          form.reset()
          setMode('blank')
        }
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo dashboard</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit(submit)}
            className="flex flex-col gap-4"
          >
            {canUseAi && (
              <div className="flex flex-col gap-2">
                <Tabs
                  value={mode}
                  onValueChange={(value) => setMode(value as Mode)}
                >
                  <TabsList>
                    <TabsTrigger value="blank">
                      {MESSAGES.assistantBlankOption}
                    </TabsTrigger>
                    <TabsTrigger value="describe" disabled={!aiAvailable}>
                      {MESSAGES.assistantDescribeOption}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                {aiStatus.data?.configured === false && (
                  <p className="text-muted-foreground text-sm">
                    {MESSAGES.llmNotConfigured}
                  </p>
                )}
              </div>
            )}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="connectionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conexão</FormLabel>
                  <Select
                    value={field.value ?? 'mcp'}
                    onValueChange={(value) =>
                      field.onChange(value === 'mcp' ? null : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Escolha uma conexão" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {hasMcp && (
                        <SelectItem value="mcp">MCP por widget</SelectItem>
                      )}
                      {(connections.data ?? []).map((connection) => (
                        <SelectItem key={connection.id} value={connection.id}>
                          {connection.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {describing && (
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{MESSAGES.assistantDescriptionLabel}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={5} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {noConnections && (
              <p role="alert" className="text-muted-foreground text-sm">
                {MESSAGES.dashboardNeedsConnection}
              </p>
            )}
            {form.formState.errors.root && (
              <p role="alert" className="text-destructive text-sm">
                {form.formState.errors.root.message}
              </p>
            )}
            <DialogFooter>
              <Button
                type="submit"
                disabled={create.isPending || noConnections}
                className="bg-[image:var(--gradient-brand)] text-primary-foreground"
              >
                Criar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
