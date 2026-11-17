import type { DashboardFilter } from '@ninbi/contracts'
import { act, render, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import {
  FilterSessionProvider,
  filterSessionReducer,
  initialSessionState,
  useFilterSession,
} from './filter-session'

function textFilter(
  id: string,
  parameter: string,
  defaultValue: DashboardFilter['defaultValue'] = null,
): DashboardFilter {
  return {
    id,
    label: parameter,
    parameter,
    type: 'TEXT',
    options: null,
    defaultValue,
  }
}

const filters = [
  textFilter('f-cat', 'categoria', 'Livros'),
  textFilter('f-busca', 'busca'),
]

const seen: Record<string, string | null> = {}
function Probe({ name }: { name: string }) {
  const session = useFilterSession()
  seen[name] = session.values['f-cat'] as string | null
  return (
    <button
      type="button"
      onClick={() => session.setValue('f-cat', `valor-${name}`)}
    >
      {name}
    </button>
  )
}

describe('filter-session', () => {
  it('FLT-15 clearAll devolve todos os filtros ao valor padrão', () => {
    let state = initialSessionState(filters, 0)
    state = filterSessionReducer(state, {
      type: 'setValue',
      filterId: 'f-cat',
      value: 'Jogos',
    })
    state = filterSessionReducer(state, {
      type: 'setValue',
      filterId: 'f-busca',
      value: 'abc',
    })
    state = filterSessionReducer(state, {
      type: 'toggleClick',
      widgetId: 'w-1',
      filterId: 'f-cat',
      value: 'Moda',
    })
    state = filterSessionReducer(state, { type: 'clearAll', filters })
    expect(state.values).toEqual({ 'f-cat': 'Livros', 'f-busca': null })
    expect(state.selection).toBeNull()
  })

  it('XFL-05 toggleClick no mesmo elemento esvazia o filtro', () => {
    const click = (value: string) =>
      ({
        type: 'toggleClick',
        widgetId: 'w-1',
        filterId: 'f-cat',
        value,
      }) as const
    let state = filterSessionReducer(
      initialSessionState(filters, 0),
      click('Livros'),
    )
    expect(state.values['f-cat']).toBe('Livros')
    expect(state.selection).toEqual({
      widgetId: 'w-1',
      filterId: 'f-cat',
      value: 'Livros',
    })
    state = filterSessionReducer(state, click('Jogos'))
    expect(state.values['f-cat']).toBe('Jogos')
    expect(state.selection?.value).toBe('Jogos')
    state = filterSessionReducer(state, click('Jogos'))
    expect(state.values['f-cat']).toBeNull()
    expect(state.selection).toBeNull()
  })

  it('XFL-06 setValue pela barra remove a seleção do filtro', () => {
    const selected = filterSessionReducer(initialSessionState(filters, 0), {
      type: 'toggleClick',
      widgetId: 'w-1',
      filterId: 'f-cat',
      value: 'Livros',
    })
    const other = filterSessionReducer(selected, {
      type: 'setValue',
      filterId: 'f-busca',
      value: 'abc',
    })
    expect(other.selection).toEqual(selected.selection)
    const same = filterSessionReducer(selected, {
      type: 'setValue',
      filterId: 'f-cat',
      value: 'Jogos',
    })
    expect(same.selection).toBeNull()
    expect(same.values['f-cat']).toBe('Jogos')
  })

  it('FLT-31 duas sessões guardam valores, seleção e intervalo separados', () => {
    const wrapper =
      (interval: number) =>
      ({ children }: { children: ReactNode }) => (
        <FilterSessionProvider filters={filters} refreshIntervalSec={interval}>
          {children}
        </FilterSessionProvider>
      )
    const first = renderHook(() => useFilterSession(), {
      wrapper: wrapper(60),
    })
    const second = renderHook(() => useFilterSession(), {
      wrapper: wrapper(60),
    })
    act(() => {
      first.result.current.toggleClick('w-1', 'f-cat', 'Jogos')
      first.result.current.setInterval(10)
    })
    expect(first.result.current.values['f-cat']).toBe('Jogos')
    expect(first.result.current.selection?.value).toBe('Jogos')
    expect(first.result.current.intervalSec).toBe(10)
    expect(second.result.current.values['f-cat']).toBe('Livros')
    expect(second.result.current.selection).toBeNull()
    expect(second.result.current.intervalSec).toBe(60)

    first.unmount()
    const fresh = renderHook(() => useFilterSession(), {
      wrapper: wrapper(60),
    })
    expect(fresh.result.current.values).toEqual({
      'f-cat': 'Livros',
      'f-busca': null,
    })
    expect(fresh.result.current.intervalSec).toBe(60)
  })

  it('FLT-31 provider sem filtros compartilhados entre dois providers na mesma página', () => {
    for (const key of Object.keys(seen)) delete seen[key]
    const view = render(
      <>
        <FilterSessionProvider filters={filters} refreshIntervalSec={0}>
          <Probe name="a" />
        </FilterSessionProvider>
        <FilterSessionProvider filters={filters} refreshIntervalSec={0}>
          <Probe name="b" />
        </FilterSessionProvider>
      </>,
    )
    act(() => view.getByText('a').click())
    expect(seen).toEqual({ a: 'valor-a', b: 'Livros' })
  })

  it('FLT-31 paramsVersion aumenta a cada mudança de valor e não muda com setInterval', () => {
    let state = initialSessionState(filters, 0)
    const start = state.paramsVersion
    state = filterSessionReducer(state, {
      type: 'setValue',
      filterId: 'f-busca',
      value: 'x',
    })
    expect(state.paramsVersion).toBe(start + 1)
    state = filterSessionReducer(state, { type: 'setInterval', sec: 30 })
    expect(state.paramsVersion).toBe(start + 1)
    expect(state.intervalSec).toBe(30)
  })

  it('FLT-31 syncFilters põe o filtro novo no padrão e tira o removido', () => {
    let state = initialSessionState(filters, 0)
    state = filterSessionReducer(state, {
      type: 'syncFilters',
      filters: [filters[0] as DashboardFilter, textFilter('f-uf', 'uf', 'SP')],
    })
    expect(state.values).toEqual({ 'f-cat': 'Livros', 'f-uf': 'SP' })
  })
})
