import { zodResolver } from '@hookform/resolvers/zod'
import { MESSAGES, type QueryResultDto, type WidgetDto } from '@ninbi/contracts'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { runQuery } from '@/features/dashboards/api'
import { CypherEditor } from './CypherEditor'
import { ResultTable } from './ResultTable'

const titleSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, MESSAGES.widgetTitleRequired)
    .max(80, MESSAGES.widgetTitleTooLong),
})

type TitleInput = z.input<typeof titleSchema>

function Preview({
  result,
  error,
}: {
  result?: QueryResultDto
  error?: Error | null
}) {
  if (error) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {error.message}
      </p>
    )
  }
  if (!result) return null
  if (result.rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">{MESSAGES.queryNoData}</p>
    )
  }
  return (
    <div className="flex max-h-64 min-h-0 flex-col">
      <ResultTable result={result} />
    </div>
  )
}

/** Edita título e Cypher de um widget, com execução e prévia na conexão do rascunho (WDG-01 a WDG-07, WDG-10). */
export function WidgetEditorDialog({
  dashboardId,
  connectionId,
  widget,
  onApply,
  onClose,
}: {
  dashboardId: string
  connectionId: string
  widget: WidgetDto
  onApply: (changes: { title: string; cypher: string | null }) => void
  onClose: () => void
}) {
  const [cypher, setCypher] = useState(widget.cypher ?? '')
  const form = useForm<TitleInput>({
    resolver: zodResolver(titleSchema),
    defaultValues: { title: widget.title },
  })
  const run = useMutation({
    mutationFn: () => runQuery(dashboardId, { cypher, connectionId }),
  })
  const empty = cypher.trim() === ''

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar widget</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit((values) => {
              onApply({
                title: values.title.trim(),
                cypher: empty ? null : cypher,
              })
              onClose()
            })}
            className="flex min-w-0 flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <CypherEditor value={cypher} onChange={setCypher} />
            <div>
              <Button
                type="button"
                variant="outline"
                disabled={empty || run.isPending}
                onClick={() => run.mutate()}
              >
                {run.isPending ? MESSAGES.running : 'Executar'}
              </Button>
            </div>
            <section aria-label="Prévia" className="flex min-w-0 flex-col">
              {!run.isPending && (
                <Preview result={run.data} error={run.error} />
              )}
            </section>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[image:var(--gradient-brand)] text-primary-foreground"
              >
                Aplicar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
