import { zodResolver } from '@hookform/resolvers/zod'
import {
  type LoginInput,
  loginSchema,
  type SessionUserDto,
} from '@ninbi/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { BrandMark } from '../shell/BrandMark'
import { safeRedirectTarget } from './redirect'
import { SESSION_QUERY_KEY } from './useSession'

export function LoginPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const login = useMutation({
    mutationFn: (values: LoginInput) =>
      apiFetch<SessionUserDto>('/api/auth/login', {
        method: 'POST',
        body: values,
        notifyUnauthorized: false,
      }),
    onSuccess: (user) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, user)
      navigate(safeRedirectTarget(params.get('voltar')), { replace: true })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          form.setError(field as keyof LoginInput, { message })
        }
        return
      }
      form.setError('root', { message: error.message })
    },
  })

  return (
    <main className="ocean-auth">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center gap-4">
          <BrandMark />
          <CardTitle className="text-xl">
            <h1>Entrar</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Form {...form}>
            <form
              noValidate
              onSubmit={form.handleSubmit((values) => login.mutate(values))}
              className="flex flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" autoComplete="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                        autoComplete="current-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors.root && (
                <p role="alert" className="text-destructive text-sm">
                  {form.formState.errors.root.message}
                </p>
              )}
              <Button
                type="submit"
                disabled={login.isPending}
                className="bg-[image:var(--gradient-brand)] text-primary-foreground"
              >
                Entrar
              </Button>
            </form>
          </Form>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              to={{ pathname: '/cadastro', search: params.toString() }}
              className="text-accent-text text-sm hover:underline"
            >
              Criar conta
            </Link>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-accent-text"
                >
                  Esqueceu a senha?
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Recuperar senha</DialogTitle>
                  <DialogDescription>
                    Peça ao administrador da sua instalação uma senha provisória
                    para o e-mail da sua conta. Ao entrar com ela, você poderá
                    definir uma nova senha.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Voltar ao login
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
