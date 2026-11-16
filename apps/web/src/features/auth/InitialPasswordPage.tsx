import { zodResolver } from '@hookform/resolvers/zod'
import {
  type InitialPasswordInput,
  initialPasswordSchema,
} from '@ninbi/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router'
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
import { SESSION_QUERY_KEY, useSession } from './useSession'

const FIELDS = [
  { name: 'newPassword', label: 'Nova senha' },
  { name: 'confirmPassword', label: 'Confirmar senha' },
] as const

export function InitialPasswordPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const form = useForm<InitialPasswordInput>({
    resolver: zodResolver(initialPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const setPassword = useMutation({
    mutationFn: (values: InitialPasswordInput) =>
      apiFetch('/api/auth/initial-password', { method: 'POST', body: values }),
    onSuccess: () => {
      if (user) {
        queryClient.setQueryData(SESSION_QUERY_KEY, {
          ...user,
          mustChangePassword: false,
        })
      }
      navigate('/', { replace: true })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          form.setError(field as keyof InitialPasswordInput, { message })
        }
        return
      }
      form.setError('root', { message: error.message })
    },
  })

  // A tela só existe para quem ainda usa a senha provisória.
  if (user && !user.mustChangePassword && !setPassword.isSuccess) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center gap-4">
          <BrandMark />
          <CardTitle className="text-xl">
            <h1>Definir nova senha</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              noValidate
              onSubmit={form.handleSubmit((values) =>
                setPassword.mutate(values),
              )}
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
                          autoComplete="new-password"
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
                disabled={setPassword.isPending}
                className="bg-[image:var(--gradient-brand)] text-primary-foreground"
              >
                Salvar
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  )
}
