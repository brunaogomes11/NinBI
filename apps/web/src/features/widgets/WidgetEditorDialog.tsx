import { zodResolver } from '@hookform/resolvers/zod'
import {
  MESSAGES,
  type QueryResultDto,
  type WidgetVisualization as Visualization,
  WIDGET_VISUALIZATIONS,
  type WidgetDto,
} from '@ninbi/contracts'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
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
import { AskAiPanel } from '@/features/ai/AskAiPanel'
import { runQuery } from '@/features/dashboards/api'
import { CypherEditor } from './CypherEditor'
import {
  emptyMapping,
  type MappingDraft,
  suggestMapping,
  validateMapping,
} from './mapping/suggest'
import { ResultTable } from './ResultTable'
import { type MappingError, VisualizationPanel } from './VisualizationPanel'
import type { WidgetAi } from './WidgetCard'
import { WidgetVisualization } from './WidgetVisualization'

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
  visualization,
  mapping,
}: {
  result?: QueryResultDto | null
  error?: Error | null
  visualization: Visualization
  mapping: MappingDraft
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
  if (visualization === 'TABLE') {
    return (
      <div className="flex max-h-64 min-h-0 flex-col">
        <ResultTable result={result} />
      </div>
    )
  }
  return (
    <div className="flex h-64 min-h-0 flex-col">
      <WidgetVisualization
        result={result}
        visualization={visualization}
        config={{ mapping }}
      />
    </div>
  )
}

function initialVisualization(widget: WidgetDto): Visualization {
  return (WIDGET_VISUALIZATIONS as readonly string[]).includes(
    widget.visualization,
  )
    ? (widget.visualization as Visualization)
    : 'TABLE'
}

function initialMapping(widget: WidgetDto, v: Visualization): MappingDraft {
  const saved = widget.config.mapping
  return saved && typeof saved === 'object'
    ? { ...emptyMapping(v), ...(saved as MappingDraft) }
    : emptyMapping(v)
}

/** Edita título e Cypher de um widget, com execução e prévia na conexão do rascunho (WDG-01 a WDG-07, WDG-10). */
export function WidgetEditorDialog({
  dashboardId,
  connectionId,
  widget,
  initialCypher,
  initialError,
  ai,
  onApply,
  onClose,
}: {
  dashboardId: string
  connectionId: string
  widget: WidgetDto
  /** Último Cypher gerado pela IA que falhou (FIX-06): abre no editor no lugar do salvo. */
  initialCypher?: string
  /** Mensagem do último erro da IA, mostrada na prévia até a próxima execução (FIX-06). */
  initialError?: string
  /** Só no widget recém-criado por "Novo widget" com provedor configurado (AIQ-02). */
  ai?: WidgetAi
  onApply: (changes: {
    title: string
    cypher: string | null
    visualization: string
    config: Record<string, unknown>
  }) => void
  onClose: () => void
}) {
  const [cypher, setCypher] = useState(initialCypher ?? widget.cypher ?? '')
  const [visualization, setVisualization] = useState(
    initialVisualization(widget),
  )
  const [mapping, setMapping] = useState(() =>
    initialMapping(widget, initialVisualization(widget)),
  )
  const [result, setResult] = useState<QueryResultDto | null>(null)
  const [aiError, setAiError] = useState(initialError ?? null)
  const [mappingError, setMappingError] = useState<MappingError | null>(null)
  const form = useForm<TitleInput>({
    resolver: zodResolver(titleSchema),
    defaultValues: { title: widget.title },
  })
  const run = useMutation({
    mutationFn: () => {
      setAiError(null)
      return runQuery(dashboardId, { cypher, connectionId })
    },
    onSuccess: (data) => {
      setResult(data)
      // Visualização escolhida antes de executar: agora há colunas para sugerir.
      if (
        JSON.stringify(mapping) === JSON.stringify(emptyMapping(visualization))
      ) {
        setMapping(suggestMapping(visualization, data))
      }
    },
  })
  const empty = cypher.trim() === ''
  const [prompt, setPrompt] = useState('')
  const running = ai?.state.running !== undefined
  const aiRequestError = ai?.state.error?.message ?? null
  const wasRunning = useRef(false)
  const cancelled = useRef(false)

  // A IA falhou na última tentativa: o editor mostra o último Cypher e a mensagem (FIX-06).
  useEffect(() => {
    if (initialCypher !== undefined) setCypher(initialCypher)
    if (initialError !== undefined) setAiError(initialError)
  }, [initialCypher, initialError])

  // Geração concluída sem erro nem falha: o diálogo fecha com o widget atualizado (AIQ-02).
  useEffect(() => {
    if (running) {
      wasRunning.current = true
      return
    }
    if (!wasRunning.current) return
    wasRunning.current = false
    if (!aiRequestError && !cancelled.current && initialError === undefined) {
      onClose()
    }
    cancelled.current = false
  }, [running, aiRequestError, initialError, onClose])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar widget</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit((values) => {
              const problem = validateMapping(visualization, mapping)
              if (problem) {
                setMappingError(problem)
                return
              }
              onApply({
                title: values.title.trim(),
                cypher: empty ? null : cypher,
                visualization,
                config: visualization === 'TABLE' ? {} : { mapping },
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
            {ai && (
              <AskAiPanel
                value={prompt}
                onChange={setPrompt}
                onSubmit={() => {
                  setAiError(null)
                  ai.onStart(prompt.trim())
                }}
                onCancel={() => {
                  cancelled.current = true
                  ai.onCancel()
                }}
                running={running}
                attempt={ai.state.running?.attempt ?? 1}
                error={aiRequestError}
              />
            )}
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
            <VisualizationPanel
              result={result}
              visualization={visualization}
              mapping={mapping}
              error={mappingError}
              onChange={(nextVisualization, nextMapping) => {
                setVisualization(nextVisualization)
                setMapping(nextMapping)
                setMappingError(null)
              }}
            />
            <section aria-label="Prévia" className="flex min-w-0 flex-col">
              {!run.isPending && (
                <Preview
                  result={run.error || aiError ? undefined : result}
                  error={run.error ?? (aiError ? new Error(aiError) : null)}
                  visualization={visualization}
                  mapping={mapping}
                />
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
