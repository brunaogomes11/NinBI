import {
  type DashboardFilter,
  type FilterScalar,
  type FilterValue,
  MESSAGES,
} from '@ninbi/contracts'
import { ChevronDown } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type FilterOptionsSource, useFilterOptions } from './api'
import { checkDateRange, parseNumberInput } from './filter-values'

/** Tempo sem digitar até o valor de texto e número ser aplicado (FLT-14). */
export const FILTER_DEBOUNCE_MS = 500
const NONE = '__none__'
const EMPTY_RANGE = { start: null, end: null }

type DateRangeValue = { start: string | null; end: string | null }

export interface FilterControlProps {
  filter: DashboardFilter
  value: FilterValue
  onChange: (value: FilterValue) => void
  /** De onde vêm as opções dos filtros de seleção. */
  source: FilterOptionsSource
  /** Menu do chip em modo de edição ("Editar filtro", "Remover filtro"). */
  actions?: ReactNode
}

const inputClass =
  'h-7 w-32 rounded-full border-0 bg-transparent px-2 py-0 text-sm shadow-none focus-visible:ring-1'

function isRange(value: FilterValue): value is DateRangeValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function FieldError({ message }: { message: string | null }) {
  return message ? (
    <span role="alert" className="text-destructive text-xs">
      {message}
    </span>
  ) : null
}

/** Aplica o texto 500 ms depois da última tecla; `commit` devolve a mensagem de erro, se houver. */
function useDebouncedText(
  text: string,
  commit: (text: string) => string | null,
) {
  const [error, setError] = useState<string | null>(null)
  const commitRef = useRef(commit)
  commitRef.current = commit
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const timer = setTimeout(
      () => setError(commitRef.current(text)),
      FILTER_DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
  }, [text])
  return error
}

function TextInput({
  filter,
  value,
  onChange,
}: Pick<FilterControlProps, 'filter' | 'value' | 'onChange'>) {
  const external = typeof value === 'string' ? value : ''
  const [text, setText] = useState(external)
  const lastApplied = useRef(external)
  useEffect(() => {
    if (external !== lastApplied.current) {
      lastApplied.current = external
      setText(external)
    }
  }, [external])
  useDebouncedText(text, (next) => {
    lastApplied.current = next
    onChange(next === '' ? null : next)
    return null
  })
  return (
    <Input
      aria-label={filter.label}
      autoComplete="off"
      className={inputClass}
      value={text}
      onChange={(event) => setText(event.target.value)}
    />
  )
}

function formatNumber(value: FilterValue): string {
  return typeof value === 'number' ? String(value).replace('.', ',') : ''
}

function NumberInput({
  filter,
  value,
  onChange,
}: Pick<FilterControlProps, 'filter' | 'value' | 'onChange'>) {
  const [text, setText] = useState(formatNumber(value))
  const lastApplied = useRef<number | null>(
    typeof value === 'number' ? value : null,
  )
  const external = typeof value === 'number' ? value : null
  useEffect(() => {
    if (external !== lastApplied.current) {
      lastApplied.current = external
      setText(formatNumber(external))
    }
  }, [external])
  const error = useDebouncedText(text, (next) => {
    const parsed = parseNumberInput(next)
    if (!parsed.ok) return parsed.message
    lastApplied.current = parsed.value
    onChange(parsed.value)
    return null
  })
  return (
    <>
      <Input
        aria-label={filter.label}
        aria-invalid={error !== null}
        autoComplete="off"
        inputMode="decimal"
        className={inputClass}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <FieldError message={error} />
    </>
  )
}

function DateInput({
  filter,
  value,
  onChange,
}: Pick<FilterControlProps, 'filter' | 'value' | 'onChange'>) {
  return (
    <Input
      type="date"
      aria-label={filter.label}
      className={inputClass}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value || null)}
    />
  )
}

function DateRangeInput({
  filter,
  value,
  onChange,
}: Pick<FilterControlProps, 'filter' | 'value' | 'onChange'>) {
  const external = isRange(value) ? value : EMPTY_RANGE
  const [range, setRange] = useState<DateRangeValue>(external)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setRange({ start: external.start, end: external.end })
    setError(null)
  }, [external.start, external.end])

  function change(next: DateRangeValue) {
    setRange(next)
    const problem = checkDateRange(next)
    setError(problem)
    if (!problem) onChange(next)
  }

  return (
    <>
      <Input
        type="date"
        aria-label={`${filter.label} inicial`}
        aria-invalid={error !== null}
        className={inputClass}
        value={range.start ?? ''}
        onChange={(event) =>
          change({ ...range, start: event.target.value || null })
        }
      />
      <Input
        type="date"
        aria-label={`${filter.label} final`}
        aria-invalid={error !== null}
        className={inputClass}
        value={range.end ?? ''}
        onChange={(event) =>
          change({ ...range, end: event.target.value || null })
        }
      />
      <FieldError message={error} />
    </>
  )
}

function OptionsFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <span role="alert" className="text-destructive text-xs">
        {MESSAGES.filterOptionsFailed}
      </span>
      <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </>
  )
}

function SingleSelect({
  filter,
  value,
  onChange,
  source,
}: Pick<FilterControlProps, 'filter' | 'value' | 'onChange' | 'source'>) {
  const state = useFilterOptions(filter, source)
  if (state.failed) return <OptionsFailed onRetry={state.retry} />
  const current =
    value === null || typeof value === 'object' ? null : (value as FilterScalar)
  // Um valor fora das opções (um clique, por exemplo) aparece como uma opção a mais (XFL-10).
  const options =
    current !== null && !state.options.some((option) => option === current)
      ? [...state.options, current]
      : state.options
  return (
    <Select
      value={current === null ? NONE : String(current)}
      onValueChange={(next) => {
        if (next === NONE) {
          onChange(null)
          return
        }
        onChange(options.find((option) => String(option) === next) ?? next)
      }}
    >
      <SelectTrigger
        aria-label={filter.label}
        className="h-7 min-w-28 rounded-full border-0 bg-transparent px-2 py-0 shadow-none"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Nenhum</SelectItem>
        {options.map((option) => (
          <SelectItem key={String(option)} value={String(option)}>
            {String(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function MultiSelect({
  filter,
  value,
  onChange,
  source,
}: Pick<FilterControlProps, 'filter' | 'value' | 'onChange' | 'source'>) {
  const state = useFilterOptions(filter, source)
  if (state.failed) return <OptionsFailed onRetry={state.retry} />
  const selected = Array.isArray(value) ? value : []
  const options = [
    ...state.options,
    ...selected.filter((item) => !state.options.includes(item)),
  ]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={filter.label}
          className="h-7 max-w-48 gap-1 rounded-full px-2 font-normal"
        >
          <span className="truncate">
            {selected.length === 0 ? 'Nenhum' : selected.join(', ')}
          </span>
          <ChevronDown aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={String(option)}
            checked={selected.includes(option)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) =>
              onChange(
                checked
                  ? [...selected, option]
                  : selected.filter((item) => item !== option),
              )
            }
          >
            {String(option)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Control(props: FilterControlProps) {
  switch (props.filter.type) {
    case 'SINGLE_SELECT':
      return <SingleSelect {...props} />
    case 'MULTI_SELECT':
      return <MultiSelect {...props} />
    case 'TEXT':
      return <TextInput {...props} />
    case 'NUMBER':
      return <NumberInput {...props} />
    case 'DATE':
      return <DateInput {...props} />
    case 'DATE_RANGE':
      return <DateRangeInput {...props} />
  }
}

/** Chip da barra de filtros: o rótulo e o controle do tipo do filtro. */
export function FilterControl(props: FilterControlProps) {
  return (
    <div
      data-filter-chip={props.filter.id}
      className="flex items-center gap-1 rounded-full border border-border bg-card-elevated py-0.5 pr-1 pl-3 text-sm"
    >
      <span className="text-muted-foreground">{props.filter.label}</span>
      <Control {...props} />
      {props.actions}
    </div>
  )
}
