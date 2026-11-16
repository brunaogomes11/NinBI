import {
  MAPPING_FIELD_LABELS,
  MAPPING_OPTION_LABELS,
  MESSAGES,
  type QueryResultDto,
  VISUALIZATION_LABELS,
  WIDGET_VISUALIZATIONS,
  type WidgetVisualization,
} from '@ninbi/contracts'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { adaptMapping, type MappingDraft } from './mapping/suggest'

type FieldName = keyof typeof MAPPING_FIELD_LABELS
type OptionName = keyof typeof MAPPING_OPTION_LABELS

interface FieldSpec {
  name: FieldName
  kind: 'single' | 'optional' | 'multi'
  /** Máximo de colunas escolhidas em um campo `multi`. */
  max?: number
}

/** Campos e opções de cada visualização, na ordem em que aparecem. */
const LAYOUT: Record<
  WidgetVisualization,
  { fields: FieldSpec[]; options: OptionName[] }
> = {
  TABLE: { fields: [], options: [] },
  LIST: {
    fields: [
      { name: 'primary', kind: 'single' },
      { name: 'secondary', kind: 'optional' },
      { name: 'values', kind: 'multi', max: 2 },
    ],
    options: [],
  },
  AREA: {
    fields: [
      { name: 'x', kind: 'single' },
      { name: 'series', kind: 'multi' },
    ],
    options: ['stacked'],
  },
  BAR: {
    fields: [
      { name: 'x', kind: 'single' },
      { name: 'series', kind: 'multi' },
    ],
    options: ['stacked', 'horizontal'],
  },
  LINE: {
    fields: [
      { name: 'x', kind: 'single' },
      { name: 'series', kind: 'multi' },
    ],
    options: [],
  },
  PIE: {
    fields: [
      { name: 'category', kind: 'single' },
      { name: 'value', kind: 'single' },
    ],
    options: ['donut'],
  },
  RADAR: {
    fields: [
      { name: 'axis', kind: 'single' },
      { name: 'series', kind: 'multi' },
    ],
    options: [],
  },
  RADIAL: {
    fields: [
      { name: 'category', kind: 'single' },
      { name: 'value', kind: 'single' },
    ],
    options: [],
  },
  KPI: {
    fields: [
      { name: 'value', kind: 'single' },
      { name: 'change', kind: 'optional' },
    ],
    options: [],
  },
  MAP: {
    fields: [
      { name: 'lat', kind: 'single' },
      { name: 'lon', kind: 'single' },
      { name: 'label', kind: 'optional' },
    ],
    options: [],
  },
}

const NONE = '__none__'

export interface MappingError {
  field: string
  message: string
}

export interface VisualizationPanelProps {
  /** Último resultado executado; sem ele os campos de coluna ficam desabilitados (VIZ-10). */
  result: QueryResultDto | null
  visualization: WidgetVisualization
  mapping: MappingDraft
  error: MappingError | null
  onChange: (visualization: WidgetVisualization, mapping: MappingDraft) => void
}

function ColumnSelect({
  id,
  spec,
  value,
  columns,
  disabled,
  onChange,
}: {
  id: string
  spec: FieldSpec
  value: string | null
  columns: string[]
  disabled: boolean
  onChange: (value: string | null) => void
}) {
  const options =
    value !== null && !columns.includes(value) ? [value, ...columns] : columns
  return (
    <Select
      value={value ?? (spec.kind === 'optional' ? NONE : undefined)}
      onValueChange={(next) => onChange(next === NONE ? null : next)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Escolha uma coluna" />
      </SelectTrigger>
      <SelectContent>
        {spec.kind === 'optional' && (
          <SelectItem value={NONE}>Nenhuma</SelectItem>
        )}
        {options.map((column) => (
          <SelectItem key={column} value={column}>
            {column}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ColumnChecks({
  id,
  spec,
  value,
  columns,
  disabled,
  onChange,
}: {
  id: string
  spec: FieldSpec
  value: string[]
  columns: string[]
  disabled: boolean
  onChange: (value: string[]) => void
}) {
  const options = [
    ...columns,
    ...value.filter((name) => !columns.includes(name)),
  ]
  const full = spec.max !== undefined && value.length >= spec.max
  return (
    <fieldset
      aria-labelledby={id}
      className="m-0 flex min-w-0 flex-wrap gap-x-4 gap-y-2 border-0 p-0"
    >
      {options.map((column) => {
        const checked = value.includes(column)
        return (
          <Label key={column} className="gap-2 font-normal">
            <Checkbox
              checked={checked}
              disabled={disabled || (!checked && full)}
              onCheckedChange={(next) => {
                const selected = new Set(value)
                if (next === true) selected.add(column)
                else selected.delete(column)
                onChange(options.filter((name) => selected.has(name)))
              }}
            />
            {column}
          </Label>
        )
      })}
    </fieldset>
  )
}

/** Escolha da visualização e das colunas de cada campo dela (VIZ-01, VIZ-02, VIZ-10, VIZ-19). */
export function VisualizationPanel({
  result,
  visualization,
  mapping,
  error,
  onChange,
}: VisualizationPanelProps) {
  const layout = LAYOUT[visualization]
  const columns = result?.columns ?? []
  const disabled = result === null
  const setField = (name: string, value: MappingDraft[string]) =>
    onChange(visualization, { ...mapping, [name]: value })

  return (
    <section
      aria-label="Visualização do widget"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="widget-visualization">Visualização</Label>
        <Select
          value={visualization}
          onValueChange={(next) => {
            const nextV = next as WidgetVisualization
            onChange(nextV, adaptMapping(mapping, visualization, nextV, result))
          }}
        >
          <SelectTrigger id="widget-visualization" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WIDGET_VISUALIZATIONS.map((value) => (
              <SelectItem key={value} value={value}>
                {VISUALIZATION_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {layout.fields.length > 0 && disabled && (
        <p className="text-sm text-muted-foreground">
          {MESSAGES.runQueryToMap}
        </p>
      )}

      {layout.fields.map((spec) => {
        const id = `widget-field-${spec.name}`
        const label = MAPPING_FIELD_LABELS[spec.name]
        const value = mapping[spec.name]
        const invalid = error?.field === spec.name
        return (
          <div key={spec.name} className="flex flex-col gap-1.5">
            {spec.kind === 'multi' ? (
              <>
                <Label id={id}>{label}</Label>
                <ColumnChecks
                  id={id}
                  spec={spec}
                  value={Array.isArray(value) ? value : []}
                  columns={columns}
                  disabled={disabled}
                  onChange={(next) => setField(spec.name, next)}
                />
              </>
            ) : (
              <>
                <Label htmlFor={id}>{label}</Label>
                <ColumnSelect
                  id={id}
                  spec={spec}
                  value={typeof value === 'string' ? value : null}
                  columns={columns}
                  disabled={disabled}
                  onChange={(next) => setField(spec.name, next)}
                />
              </>
            )}
            {invalid && (
              <p role="alert" className="text-sm text-destructive">
                {error.message}
              </p>
            )}
          </div>
        )
      })}

      {layout.options.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {layout.options.map((name) => (
            <Label key={name} className="gap-2 font-normal">
              <Checkbox
                checked={mapping[name] === true}
                onCheckedChange={(next) => setField(name, next === true)}
              />
              {MAPPING_OPTION_LABELS[name]}
            </Label>
          ))}
        </div>
      )}
    </section>
  )
}
