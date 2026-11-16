import { zodResolver } from '@hookform/resolvers/zod'
import { changePasswordSchema, MESSAGES } from '@ninbi/contracts'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
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
import { ApiError, apiFetch } from '@/lib/api'

const formSchema = changePasswordSchema
  .extend({ confirmPassword: z.string() })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: MESSAGES.passwordsMismatch,
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof formSchema>

const FIELDS = [
  {
    name: 'currentPassword',
    label: 'Senha atual',
    autoComplete: 'current-password',
  },
  { name: 'newPassword', label: 'Nova senha', autoComplete: 'new-password' },
  {
    name: 'confirmPassword',
    label: 'Confirmar nova senha',
    autoComplete: 'new-password',
  },
] as const

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const change = useMutation({
    mutationFn: ({ currentPassword, newPassword }: FormValues) =>
      apiFetch('/api/auth/password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      }),
    onSuccess: () => {
      toast.success(MESSAGES.passwordChanged)
      form.reset()
      onOpenChange(false)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          form.setError(field as keyof FormValues, { message })
        }
        return
      }
      if (
        error instanceof ApiError &&
        error.code === 'CURRENT_PASSWORD_INCORRECT'
      ) {
        form.setError('currentPassword', { message: error.message })
        return
      }
      form.setError('root', { message: error.message })
    },
  })

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
          <DialogTitle>Alterar senha</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit((values) => change.mutate(values))}
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
                        type="password"
                        autoComplete={item.autoComplete}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            {form.formState.errors.root && (
              <p role="alert" className="text-destructive text-sm">
                {form.formState.errors.root.message}
              </p>
            )}
            <DialogFooter>
              <Button
                type="submit"
                disabled={change.isPending}
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
