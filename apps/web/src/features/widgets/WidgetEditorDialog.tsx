import { zodResolver } from '@hookform/resolvers/zod'
import {
  CROSS_FILTER_TYPES,
  type CrossFilterConfig,
  type DashboardFilter,
  extractParameterNames,
  type McpCall,
  MESSAGES,
  type QueryLanguage,
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AskAiPanel } from '@/features/ai/AskAiPanel'
import { previewMcp, runQuery } from '@/features/dashboards/api'
import {
  useFilterParams,
  useOptionalFilterSession,
} from '@/features/filters/filter-session'
import { relevantParams } from '@/features/filters/filter-values'
import { CypherEditor } from './CypherEditor'
import {
  McpWidgetSourceFields,
  mcpSourceDraft,
  parseMcpSource,
  sourceSelectClass,
} from './McpWidgetSourceFields'
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
      <>
        <p className="text-muted-foreground text-sm">{MESSAGES.queryNoData}</p>
        {result.columnTypes && <ResultTable result={result} />}
      </>
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

const NONE = '__none__'

/** "Ao clicar": o filtro que o clique define e a coluna que dá o valor (XFL-01). */
function CrossFilterSection({
  filters,
  columns,
  value,
  error,
  onChange,
}: {
  filters: DashboardFilter[]
  columns: string[] | null
  value: Partial<CrossFilterConfig>
  error: boolean
  onChange: (value: Partial<CrossFilterConfig>) => void
}) {
  const options = filters.filter((filter) =>
    CROSS_FILTER_TYPES.includes(filter.type),
  )
  const columnList = [
    ...new Set([...(columns ?? []), ...(value.column ? [value.column] : [])]),
  ]
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-1 font-medium text-sm">Ao clicar</legend>
      <div className="flex flex-wrap gap-4">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <Label htmlFor="cross-filter-filter">Filtro</Label>
          <Select
            value={value.filterId ?? NONE}
            onValueChange={(next) =>
              onChange(next === NONE ? {} : { filterId: next })
            }
          >
            <SelectTrigger id="cross-filter-filter" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Nenhum</SelectItem>
              {options.map((filter) => (
                <SelectItem key={filter.id} value={filter.id}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <Label htmlFor="cross-filter-column">Coluna</Label>
          <Select
            value={value.column ?? ''}
            disabled={columns === null}
            onValueChange={(column) => onChange({ ...value, column })}
          >
            <SelectTrigger id="cross-filter-column" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {columnList.map((column) => (
                <SelectItem key={column} value={column}>
                  {column}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {MESSAGES.crossFilterInvalid}
        </p>
      )}
    </fieldset>
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
  language = 'CYPHER',
  widget,
  initialCypher,
  initialError,
  ai,
  onApply,
  onClose,
}: {
  dashboardId: string
  connectionId: string | null
  /** Linguagem da conexão do rascunho: define o editor e os parâmetros da consulta. */
  language?: QueryLanguage
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
    mcpCall?: McpCall
    visualization: string
    config: Record<string, unknown>
  }) => void
  onClose: () => void
}) {
  const [cypher, setCypher] = useState(initialCypher ?? widget.cypher ?? '')
  const [source, setSource] = useState<'database' | 'mcp'>(
    widget.mcpCall || !connectionId ? 'mcp' : 'database',
  )
  const [mcpDraft, setMcpDraft] = useState(() => mcpSourceDraft(widget.mcpCall))
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [visualization, setVisualization] = useState(
    initialVisualization(widget),
  )
  const [mapping, setMapping] = useState(() =>
    initialMapping(widget, initialVisualization(widget)),
  )
  const [result, setResult] = useState<QueryResultDto | null>(null)
  const filters = useOptionalFilterSession()?.filters ?? []
  const allParams = useFilterParams()
  const [crossFilter, setCrossFilter] = useState<Partial<CrossFilterConfig>>(
    () => (widget.config.crossFilter as CrossFilterConfig | undefined) ?? {},
  )
  const [crossFilterError, setCrossFilterError] = useState(false)
  const [aiError, setAiError] = useState(initialError ?? null)
  const [mappingError, setMappingError] = useState<MappingError | null>(null)
  const form = useForm<TitleInput>({
    resolver: zodResolver(titleSchema),
    defaultValues: { title: widget.title },
  })
  const run = useMutation({
    mutationFn: () => {
      setAiError(null)
      if (source === 'mcp') {
        const call = parseMcpSource(mcpDraft)
        if (!call)
          throw new Error(
            'Escolha conexão, ferramenta e lista e informe argumentos JSON válidos.',
          )
        return previewMcp(dashboardId, {
          call,
          params: relevantParams(Object.values(call.filterBindings), allParams),
        })
      }
      // Os valores atuais dos filtros que o Cypher usa (FLT-19).
      const params = relevantParams(
        extractParameterNames(cypher, language),
        allParams,
      )
      return runQuery(dashboardId, {
        cypher,
        connectionId: connectionId ?? undefined,
        ...(Object.keys(params).length > 0 && { params }),
      })
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
  const empty = source === 'mcp' ? !mcpDraft.listKey : cypher.trim() === ''
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
              const mcpCall =
                source === 'mcp' ? parseMcpSource(mcpDraft) : undefined
              if (source === 'mcp' && !mcpCall) {
                setSourceError(
                  'Escolha conexão, ferramenta e lista e informe argumentos JSON válidos.',
                )
                return
              }
              const problem = validateMapping(visualization, mapping)
              if (problem) {
                setMappingError(problem)
                return
              }
              const clickable = visualization !== 'KPI' && crossFilter.filterId
              if (clickable && !crossFilter.column) {
                setCrossFilterError(true)
                return
              }
              onApply({
                title: values.title.trim(),
                cypher: mcpCall || empty ? null : cypher,
                ...(mcpCall || widget.mcpCall ? { mcpCall } : {}),
                visualization,
                config: {
                  ...(visualization === 'TABLE' ? {} : { mapping }),
                  ...(clickable && { crossFilter }),
                },
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
            {connectionId && (
              <label className="grid gap-1 text-sm">
                Fonte do widget
                <select
                  className={sourceSelectClass}
                  disabled={running || run.isPending}
                  value={source}
                  onChange={(event) => {
                    setSource(event.target.value === 'mcp' ? 'mcp' : 'database')
                    setSourceError(null)
                    setAiError(null)
                    setResult(null)
                    run.reset()
                  }}
                >
                  <option value="database">Banco do dashboard</option>
                  <option value="mcp">Servidor MCP</option>
                </select>
              </label>
            )}
            {ai && source === 'database' && (
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
                unavailable={!ai.available}
              />
            )}
            {source === 'mcp' ? (
              <fieldset disabled={run.isPending}>
                <McpWidgetSourceFields
                  value={mcpDraft}
                  filters={filters}
                  onChange={(next) => {
                    setMcpDraft(next)
                    setSourceError(null)
                    setResult(null)
                    run.reset()
                  }}
                />
              </fieldset>
            ) : (
              <CypherEditor
                value={cypher}
                onChange={setCypher}
                language={language}
              />
            )}
            {sourceError && (
              <p role="alert" className="text-destructive text-sm">
                {sourceError}
              </p>
            )}
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
            {visualization !== 'KPI' && (
              <CrossFilterSection
                filters={filters}
                columns={result?.columns ?? null}
                value={crossFilter}
                error={crossFilterError}
                onChange={(next) => {
                  setCrossFilter(next)
                  setCrossFilterError(false)
                }}
              />
            )}
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
