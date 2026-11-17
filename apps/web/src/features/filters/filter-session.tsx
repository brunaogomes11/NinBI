import type {
  DashboardFilter,
  FilterValue,
  QueryParamValue,
} from '@ninbi/contracts'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import { defaultValues, filterParams } from './filter-values'

export interface ClickSelection {
  widgetId: string
  filterId: string
  value: FilterValue
}

export interface FilterSessionState {
  values: Record<string, FilterValue>
  selection: ClickSelection | null
  intervalSec: number
  /** Aumenta a cada mudança de valor; reinicia a contagem da atualização automática. */
  paramsVersion: number
}

export type FilterSessionAction =
  | { type: 'setValue'; filterId: string; value: FilterValue }
  | { type: 'clearAll'; filters: DashboardFilter[] }
  | {
      type: 'toggleClick'
      widgetId: string
      filterId: string
      value: FilterValue
    }
  | { type: 'setInterval'; sec: number }
  | { type: 'syncFilters'; filters: DashboardFilter[] }

export function initialSessionState(
  filters: DashboardFilter[],
  intervalSec: number,
): FilterSessionState {
  return {
    values: defaultValues(filters),
    selection: null,
    intervalSec,
    paramsVersion: 0,
  }
}

export function filterSessionReducer(
  state: FilterSessionState,
  action: FilterSessionAction,
): FilterSessionState {
  switch (action.type) {
    case 'setValue':
      return {
        ...state,
        values: { ...state.values, [action.filterId]: action.value },
        selection:
          state.selection?.filterId === action.filterId
            ? null
            : state.selection,
        paramsVersion: state.paramsVersion + 1,
      }
    case 'clearAll':
      return {
        ...state,
        values: defaultValues(action.filters),
        selection: null,
        paramsVersion: state.paramsVersion + 1,
      }
    case 'toggleClick': {
      const { selection } = state
      const same =
        selection?.widgetId === action.widgetId &&
        selection.filterId === action.filterId &&
        selection.value === action.value
      return {
        ...state,
        values: {
          ...state.values,
          [action.filterId]: same ? null : action.value,
        },
        selection: same
          ? null
          : {
              widgetId: action.widgetId,
              filterId: action.filterId,
              value: action.value,
            },
        paramsVersion: state.paramsVersion + 1,
      }
    }
    case 'setInterval':
      return { ...state, intervalSec: action.sec }
    case 'syncFilters': {
      const ids = new Set(action.filters.map((f) => f.id))
      const added = action.filters.filter((f) => !(f.id in state.values))
      const removed = Object.keys(state.values).filter((id) => !ids.has(id))
      if (added.length === 0 && removed.length === 0) return state
      const values = Object.fromEntries(
        Object.entries(state.values).filter(([id]) => ids.has(id)),
      )
      for (const filter of added) values[filter.id] = filter.defaultValue
      return {
        ...state,
        values,
        selection:
          state.selection && ids.has(state.selection.filterId)
            ? state.selection
            : null,
        paramsVersion: state.paramsVersion + 1,
      }
    }
  }
}

interface FilterSession extends FilterSessionState {
  /** Os filtros em uso (os do rascunho em edição). */
  filters: DashboardFilter[]
  setValue: (filterId: string, value: FilterValue) => void
  clearAll: () => void
  toggleClick: (widgetId: string, filterId: string, value: FilterValue) => void
  setInterval: (sec: number) => void
}

const FilterSessionContext = createContext<FilterSession | null>(null)

/** Valores, seleção por clique e intervalo da página; só em memória (FLT-31). */
export function FilterSessionProvider({
  filters,
  refreshIntervalSec,
  children,
}: {
  filters: DashboardFilter[]
  refreshIntervalSec: number
  children: ReactNode
}) {
  const [state, dispatch] = useReducer(filterSessionReducer, undefined, () =>
    initialSessionState(filters, refreshIntervalSec),
  )

  useEffect(() => {
    dispatch({ type: 'syncFilters', filters })
  }, [filters])

  const setValue = useCallback(
    (filterId: string, value: FilterValue) =>
      dispatch({ type: 'setValue', filterId, value }),
    [],
  )
  const clearAll = useCallback(
    () => dispatch({ type: 'clearAll', filters }),
    [filters],
  )
  const toggleClick = useCallback(
    (widgetId: string, filterId: string, value: FilterValue) =>
      dispatch({ type: 'toggleClick', widgetId, filterId, value }),
    [],
  )
  const setInterval = useCallback(
    (sec: number) => dispatch({ type: 'setInterval', sec }),
    [],
  )

  const session = useMemo<FilterSession>(
    () => ({
      ...state,
      filters,
      setValue,
      clearAll,
      toggleClick,
      setInterval,
    }),
    [state, filters, setValue, clearAll, toggleClick, setInterval],
  )
  return (
    <FilterSessionContext.Provider value={session}>
      {children}
    </FilterSessionContext.Provider>
  )
}

export function useFilterSession(): FilterSession {
  const session = useContext(FilterSessionContext)
  if (!session) {
    throw new Error('useFilterSession fora do FilterSessionProvider')
  }
  return session
}

/** A sessão, ou `null` fora de um `FilterSessionProvider`. */
export function useOptionalFilterSession(): FilterSession | null {
  return useContext(FilterSessionContext)
}

const NO_PARAMS: Record<string, QueryParamValue> = {}

/** Os valores atuais dos filtros como parâmetros de consulta (FLT-11 a FLT-13). */
export function useFilterParams(): Record<string, QueryParamValue> {
  const session = useOptionalFilterSession()
  const filters = session?.filters
  const values = session?.values
  return useMemo(
    () => (filters && values ? filterParams(filters, values) : NO_PARAMS),
    [filters, values],
  )
}
