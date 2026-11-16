import { zodResolver } from '@hookform/resolvers/zod'
import {
  type DashboardCreateInput,
  dashboardCreateSchema,
  MESSAGES,
} from '@ninbi/contracts'
import { useForm } from 'react-hook-form'
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
import { useConnections } from '@/features/connections/api'
import { ApiError } from '@/lib/api'
import { useCreateDashboard } from './api'

/** "Novo dashboard": nome e conexão; ao criar, abre o dashboard já em edição. */
export function NewDashboardDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const connections = useConnections()
  const create = useCreateDashboard()
  const form = useForm<DashboardCreateInput>({
    resolver: zodResolver(dashboardCreateSchema),
    defaultValues: { name: '', connectionId: '' },
  })
  const noConnections = connections.data?.length === 0

  function submit(values: DashboardCreateInput) {
    create.mutate(values, {
      onSuccess: (dashboard) => {
        form.reset()
        onOpenChange(false)
        navigate(`/dashboards/${dashboard.id}?editar=1`)
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
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset()
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Escolha uma conexão" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
