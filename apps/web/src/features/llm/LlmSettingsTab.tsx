import { zodResolver } from '@hookform/resolvers/zod'
import {
  LLM_PROVIDER_LABELS,
  LLM_PROVIDERS,
  type LlmSettingsInput,
  type LlmSettingsResponse,
  llmSettingsSchema,
  MESSAGES,
  PROVIDERS_REQUIRING_KEY,
} from '@ninbi/contracts'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api'
import { useLlmSettings, useSaveLlmSettings } from './api'

function defaultsFor(settings: LlmSettingsResponse): LlmSettingsInput {
  return settings.configured
    ? {
        provider: settings.provider,
        model: settings.model,
        apiKey: '',
        baseUrl: settings.baseUrl ?? '',
      }
    : { provider: 'OPENAI', model: '', apiKey: '', baseUrl: '' }
}

function LlmSettingsForm({ settings }: { settings: LlmSettingsResponse }) {
  const hasStoredKey = settings.configured && settings.apiKeyLast4 !== null
  // A chave guardada vale para qualquer provedor (LLM-07): a API tem a mesma regra.
  const schema = useMemo(
    () =>
      llmSettingsSchema.superRefine((value, ctx) => {
        if (
          PROVIDERS_REQUIRING_KEY.includes(value.provider) &&
          !value.apiKey &&
          !hasStoredKey
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['apiKey'],
            message: MESSAGES.llmApiKeyRequired,
          })
        }
      }),
    [hasStoredKey],
  )
  const form = useForm<LlmSettingsInput>({
    resolver: zodResolver(schema) as never,
    defaultValues: defaultsFor(settings),
  })
  const save = useSaveLlmSettings()
  const last4 = settings.configured ? settings.apiKeyLast4 : null

  function submit(values: LlmSettingsInput) {
    save.mutate(values, {
      onSuccess: () => toast.success('Configuração do LLM salva'),
      onError: (error) => {
        if (error instanceof ApiError && error.fieldErrors) {
          for (const [field, message] of Object.entries(error.fieldErrors)) {
            form.setError(field as keyof LlmSettingsInput, { message })
          }
          return
        }
        form.setError('root', { message: error.message })
      },
    })
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(submit)}
        className="flex max-w-xl flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="provider"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Provedor</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LLM_PROVIDERS.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {LLM_PROVIDER_LABELS[provider]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Modelo</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="off" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="apiKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chave de API</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  type="password"
                  autoComplete="new-password"
                  placeholder={last4 ? `••••${last4}` : undefined}
                />
              </FormControl>
              {hasStoredKey && (
                <FormDescription>{MESSAGES.llmKeepKeyHint}</FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="baseUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL base</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  autoComplete="off"
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
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={save.isPending}
            className="bg-[image:var(--gradient-brand)] text-primary-foreground"
          >
            Salvar
          </Button>
        </div>
      </form>
    </Form>
  )
}

/** Aba "LLM" de Configurações: provedor, modelo, chave e URL base (LLM-01 a LLM-08). */
export function LlmSettingsTab() {
  const settings = useLlmSettings()
  if (settings.isPending) {
    return <Skeleton className="h-64 max-w-xl" aria-label="Carregando" />
  }
  if (settings.isError) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {settings.error.message}
      </p>
    )
  }
  return (
    <LlmSettingsForm
      key={settings.data.configured ? settings.data.updatedAt : 'sem-config'}
      settings={settings.data}
    />
  )
}
