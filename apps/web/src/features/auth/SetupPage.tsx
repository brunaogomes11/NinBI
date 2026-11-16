import { zodResolver } from '@hookform/resolvers/zod'
import {
  type SessionUserDto,
  type SetupAdminInput,
  setupAdminSchema,
} from '@ninbi/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { BrandMark } from '../shell/BrandMark'
import { SESSION_QUERY_KEY } from './useSession'
import { SETUP_STATUS_QUERY_KEY } from './useSetupStatus'

const FIELDS = [
  { name: 'name', label: 'Nome', type: 'text', autoComplete: 'name' },
  { name: 'email', label: 'E-mail', type: 'email', autoComplete: 'email' },
  {
    name: 'password',
    label: 'Senha',
    type: 'password',
    autoComplete: 'new-password',
  },
  {
    name: 'confirmPassword',
    label: 'Confirmar senha',
    type: 'password',
    autoComplete: 'new-password',
  },
] as const

export function SetupPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const form = useForm<SetupAdminInput>({
    resolver: zodResolver(setupAdminSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  const createAdmin = useMutation({
    mutationFn: (values: SetupAdminInput) =>
      apiFetch<SessionUserDto>('/api/setup/admin', {
        method: 'POST',
        body: values,
        notifyUnauthorized: false,
      }),
    onSuccess: (user) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, user)
      queryClient.setQueryData(SETUP_STATUS_QUERY_KEY, { needsSetup: false })
      navigate('/', { replace: true })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'SETUP_ALREADY_DONE') {
        queryClient.setQueryData(SESSION_QUERY_KEY, null)
        queryClient.setQueryData(SETUP_STATUS_QUERY_KEY, { needsSetup: false })
        navigate('/entrar', { replace: true })
        return
      }
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          form.setError(field as keyof SetupAdminInput, { message })
        }
        return
      }
      form.setError('root', { message: error.message })
    },
  })

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center gap-4">
          <BrandMark />
          <CardTitle className="text-xl">
            <h1>Criar administrador</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              noValidate
              onSubmit={form.handleSubmit((values) =>
                createAdmin.mutate(values),
              )}
              className="flex flex-col gap-4"
            >
              {FIELDS.map(({ name, label, type, autoComplete }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type={type}
                          autoComplete={autoComplete}
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
              <Button
                type="submit"
                disabled={createAdmin.isPending}
                className="bg-[image:var(--gradient-brand)] text-primary-foreground"
              >
                Criar administrador
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  )
}
