import { zodResolver } from '@hookform/resolvers/zod'
import { type RegisterInput, registerSchema } from '@ninbi/contracts'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'
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
import { apiFetch } from '@/lib/api'
import { BrandMark } from '../shell/BrandMark'

const fields = [
  { name: 'name', label: 'Nome', type: 'text', autoComplete: 'name' },
  { name: 'email', label: 'E-mail', type: 'email', autoComplete: 'email' },
] as const

export function RegistrationPage() {
  const [params] = useSearchParams()
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '' },
  })
  const register = useMutation({
    mutationFn: (body: RegisterInput) =>
      apiFetch('/api/auth/register', { method: 'POST', body }),
  })

  return (
    <main className="ocean-auth">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center gap-4">
          <BrandMark />
          <CardTitle className="text-xl">
            <h1>Criar conta</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {register.isSuccess ? (
            <p role="status">
              Se este e-mail for novo, o cadastro ficará pendente até a
              aprovação de um administrador. Peça a ele a senha provisória para
              o primeiro login.
            </p>
          ) : (
            <Form {...form}>
              <form
                noValidate
                className="grid gap-4"
                onSubmit={form.handleSubmit((values) =>
                  register.mutate(values),
                )}
              >
                {fields.map(({ name, label, type, autoComplete }) => (
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
                {register.error && (
                  <p role="alert" className="text-destructive text-sm">
                    {register.error.message}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={register.isPending}
                  className="bg-[image:var(--gradient-brand)] text-primary-foreground"
                >
                  Solicitar cadastro
                </Button>
              </form>
            </Form>
          )}
          <Link
            to={{ pathname: '/entrar', search: params.toString() }}
            className="w-fit text-accent-text text-sm hover:underline"
          >
            Voltar para o login
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
