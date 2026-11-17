import {
  type DashboardFilter,
  dashboardFiltersSchema,
  FILTER_TYPE_LABELS,
  FILTER_TYPES,
  type FilterScalar,
  type FilterType,
  type FilterValue,
  OPTION_SOURCE_LABELS,
  OPTION_SOURCES,
  type OptionSource,
} from '@ninbi/contracts'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CypherEditor } from '@/features/widgets/CypherEditor'
import { fetchDraftFilterOptions } from './api'
import { FilterControl } from './FilterControl'
import { parseStaticOptions } from './filter-values'

const SELECTION_TYPES: FilterType[] = ['SINGLE_SELECT', 'MULTI_SELECT']
const PREVIEW_OPTIONS_SHOWN = 20

type FieldKey = 'label' | 'parameter' | 'options' | 'defaultValue'

function emptyDefault(type: FilterType): FilterValue {
  if (type === 'MULTI_SELECT') return []
  if (type === 'DATE_RANGE') return { start: null, end: null }
  return null
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  )
}

/** Cria ou edita um filtro do rascunho; "Aplicar" só fecha com o filtro válido (FLT-01 a FLT-06). */
export function FilterEditorDialog({
  dashboardId,
  connectionId,
  filter,
  otherFilters,
  onApply,
  onClose,
}: {
  dashboardId: string
  connectionId: string
  /** O filtro em edição; `null` cria um novo. */
  filter: DashboardFilter | null
  /** Os demais filtros do rascunho, para a regra de parâmetro repetido. */
  otherFilters: DashboardFilter[]
  onApply: (filter: DashboardFilter) => void
  onClose: () => void
}) {
  const [label, setLabel] = useState(filter?.label ?? '')
  const [parameter, setParameter] = useState(filter?.parameter ?? '')
  const [type, setType] = useState<FilterType>(filter?.type ?? 'TEXT')
  const [source, setSource] = useState<OptionSource>(
    filter?.options?.source ?? 'STATIC',
  )
  const [staticText, setStaticText] = useState(
    filter?.options?.source === 'STATIC'
      ? filter.options.values.join('\n')
      : '',
  )
  const [cypher, setCypher] = useState(
    filter?.options?.source === 'QUERY' ? (filter.options.cypher ?? '') : '',
  )
  const [defaultValue, setDefaultValue] = useState<FilterValue>(
    filter?.defaultValue ?? emptyDefault(filter?.type ?? 'TEXT'),
  )
  const [id] = useState(() => filter?.id ?? crypto.randomUUID())
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [loaded, setLoaded] = useState<FilterScalar[] | null>(null)

  const isSelection = SELECTION_TYPES.includes(type)
  const loadOptions = useMutation({
    mutationFn: () =>
      fetchDraftFilterOptions(dashboardId, { cypher, connectionId }),
    onSuccess: (data) => setLoaded(data.options),
  })

  function build(): DashboardFilter {
    const staticValues = parseStaticOptions(staticText)
    return {
      id,
      label,
      parameter,
      type,
      options: !isSelection
        ? null
        : source === 'STATIC'
          ? { source: 'STATIC', values: staticValues }
          : { source: 'QUERY', cypher },
      defaultValue,
    }
  }

  function apply() {
    const candidate = build()
    const others = otherFilters.filter((other) => other.id !== candidate.id)
    const result = dashboardFiltersSchema.safeParse([...others, candidate])
    if (!result.success) {
      const next: Partial<Record<FieldKey, string>> = {}
      for (const issue of result.error.issues) {
        const [index, field] = issue.path
        if (index !== others.length || typeof field !== 'string') continue
        const key = field as FieldKey
        next[key] ??= issue.message
      }
      setErrors(next)
      return
    }
    onApply(result.data[others.length] as DashboardFilter)
    onClose()
  }

  // O valor padrão usa o mesmo controle do chip; de uma consulta ele usa as opções já carregadas.
  const preview: DashboardFilter = {
    ...build(),
    label: 'Valor padrão',
    options: !isSelection
      ? null
      : {
          source: 'STATIC',
          values:
            source === 'STATIC'
              ? parseStaticOptions(staticText)
              : (loaded ?? []).map(String),
        },
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{filter ? 'Editar filtro' : 'Novo filtro'}</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="flex min-w-0 flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            apply()
          }}
        >
          <Field label="Rótulo" htmlFor="filter-label" error={errors.label}>
            <Input
              id="filter-label"
              autoComplete="off"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </Field>
          <Field
            label="Parâmetro"
            htmlFor="filter-parameter"
            error={errors.parameter}
          >
            <Input
              id="filter-parameter"
              autoComplete="off"
              value={parameter}
              onChange={(event) => setParameter(event.target.value)}
            />
          </Field>
          <Field label="Tipo" htmlFor="filter-type">
            <Select
              value={type}
              onValueChange={(next) => {
                setType(next as FilterType)
                setDefaultValue(emptyDefault(next as FilterType))
              }}
            >
              <SelectTrigger id="filter-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTER_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {FILTER_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {isSelection && (
            <>
              <Field
                label="Origem das opções"
                htmlFor="filter-source"
                error={errors.options}
              >
                <Select
                  value={source}
                  onValueChange={(next) => setSource(next as OptionSource)}
                >
                  <SelectTrigger id="filter-source" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPTION_SOURCES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {OPTION_SOURCE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {source === 'STATIC' ? (
                <Field label="Opções (uma por linha)" htmlFor="filter-static">
                  <Textarea
                    id="filter-static"
                    value={staticText}
                    onChange={(event) => setStaticText(event.target.value)}
                  />
                </Field>
              ) : (
                <div className="flex flex-col gap-2">
                  <CypherEditor value={cypher} onChange={setCypher} />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={cypher.trim() === '' || loadOptions.isPending}
                      onClick={() => loadOptions.mutate()}
                    >
                      Carregar opções
                    </Button>
                    {loadOptions.error && (
                      <p role="alert" className="text-destructive text-sm">
                        {loadOptions.error.message}
                      </p>
                    )}
                  </div>
                  {loaded && !loadOptions.error && (
                    <div className="text-sm">
                      <p className="text-muted-foreground">
                        {loaded.length} opções
                      </p>
                      <ul className="flex flex-wrap gap-x-3">
                        {loaded
                          .slice(0, PREVIEW_OPTIONS_SHOWN)
                          .map((option) => (
                            <li key={String(option)}>{String(option)}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          <div className="flex flex-col items-start gap-1.5">
            <FilterControl
              key={type}
              filter={preview}
              value={defaultValue}
              source={{ dashboardId, version: 0 }}
              onChange={setDefaultValue}
            />
            {errors.defaultValue && (
              <p role="alert" className="text-destructive text-sm">
                {errors.defaultValue}
              </p>
            )}
          </div>
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
      </DialogContent>
    </Dialog>
  )
}
