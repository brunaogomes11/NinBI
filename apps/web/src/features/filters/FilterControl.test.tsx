import {
  type DashboardFilter,
  type FilterValue,
  MESSAGES,
} from '@ninbi/contracts'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { type ReactNode, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/providers'
import { server } from '@/test/server'
import { FilterControl } from './FilterControl'

const SOURCE = { dashboardId: 'd-1', version: 1 }

function makeFilter(overrides: Partial<DashboardFilter> = {}): DashboardFilter {
  return {
    id: 'f-1',
    label: 'Categoria',
    parameter: 'categoria',
    type: 'SINGLE_SELECT',
    options: { source: 'STATIC', values: ['Livros', 'Jogos'] },
    defaultValue: null,
    ...overrides,
  }
}

function withClient(node: ReactNode) {
  return (
    <QueryClientProvider client={createQueryClient()}>
      {node}
    </QueryClientProvider>
  )
}

/** Controle com estado próprio: cada mudança chama o espião e vale como o novo valor. */
function Stateful({
  filter,
  initial,
  onChange,
}: {
  filter: DashboardFilter
  initial: FilterValue
  onChange: (value: FilterValue) => void
}) {
  const [value, setValue] = useState<FilterValue>(initial)
  return (
    <FilterControl
      filter={filter}
      value={value}
      source={SOURCE}
      onChange={(next) => {
        setValue(next)
        onChange(next)
      }}
    />
  )
}

describe('FilterControl com timers falsos', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  // Com timers totalmente falsos o user-event não termina (o `asyncWrapper` do Testing Library
  // espera um `setTimeout` que nunca dispara): digitar aqui é um `change` por tecla.
  function setup() {
    vi.useFakeTimers()
  }

  function type(input: HTMLElement, text: string) {
    let typed = (input as HTMLInputElement).value
    for (const char of text) {
      typed += char
      fireEvent.change(input, { target: { value: typed } })
    }
  }

  async function advance(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  }

  it('FLT-14 texto e número aplicam o valor 500 ms depois da última tecla', async () => {
    setup()
    const onText = vi.fn()
    const onNumber = vi.fn()
    render(
      withClient(
        <>
          <Stateful
            filter={makeFilter({
              id: 'f-t',
              label: 'Busca',
              type: 'TEXT',
              options: null,
            })}
            initial={null}
            onChange={onText}
          />
          <Stateful
            filter={makeFilter({
              id: 'f-n',
              label: 'Número',
              type: 'NUMBER',
              options: null,
            })}
            initial={null}
            onChange={onNumber}
          />
        </>,
      ),
    )

    const busca = screen.getByRole('textbox', { name: 'Busca' })
    type(busca, 'Livr')
    await advance(300)
    type(busca, 'os')
    await advance(499)
    expect(onText).not.toHaveBeenCalled()
    await advance(1)
    expect(onText).toHaveBeenCalledTimes(1)
    expect(onText).toHaveBeenCalledWith('Livros')

    const numero = screen.getByRole('textbox', { name: 'Número' })
    type(numero, '12,5')
    await advance(499)
    expect(onNumber).not.toHaveBeenCalled()
    await advance(1)
    expect(onNumber).toHaveBeenCalledTimes(1)
    expect(onNumber).toHaveBeenCalledWith(12.5)
  })

  it('FLT-26 número inválido não aplica e mostra Digite um número', async () => {
    setup()
    const onChange = vi.fn()
    render(
      withClient(
        <Stateful
          filter={makeFilter({
            label: 'Número',
            type: 'NUMBER',
            options: null,
          })}
          initial={null}
          onChange={onChange}
        />,
      ),
    )
    type(screen.getByRole('textbox', { name: 'Número' }), 'abc')
    await advance(500)
    expect(screen.getByText(MESSAGES.filterNumberInvalid)).toBeInTheDocument()
    expect(MESSAGES.filterNumberInvalid).toBe('Digite um número')
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('FilterControl', () => {
  it('FLT-25 intervalo invertido não aplica e mostra a mensagem', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      withClient(
        <Stateful
          filter={makeFilter({
            label: 'Período',
            type: 'DATE_RANGE',
            options: null,
          })}
          initial={{ start: '2025-03-01', end: null }}
          onChange={onChange}
        />,
      ),
    )
    const end = screen.getByLabelText('Período final')
    await user.type(end, '2025-01-01')
    expect(
      screen.getByText('A data inicial é maior que a final'),
    ).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()

    await user.clear(end)
    await user.type(end, '2025-04-01')
    expect(
      screen.queryByText('A data inicial é maior que a final'),
    ).not.toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith({
      start: '2025-03-01',
      end: '2025-04-01',
    })
  })

  it('FLT-12 marcar duas opções aplica a lista', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      withClient(
        <Stateful
          filter={makeFilter({ type: 'MULTI_SELECT' })}
          initial={[]}
          onChange={onChange}
        />,
      ),
    )
    await user.click(screen.getByRole('button', { name: 'Categoria' }))
    await user.click(
      await screen.findByRole('menuitemcheckbox', { name: 'Livros' }),
    )
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Jogos' }))
    expect(onChange).toHaveBeenLastCalledWith(['Livros', 'Jogos'])
  })

  it('XFL-10 valor fora das opções aparece no filtro de seleção única', async () => {
    const user = userEvent.setup()
    render(
      withClient(
        <FilterControl
          filter={makeFilter()}
          value="Brinquedos"
          source={SOURCE}
          onChange={() => {}}
        />,
      ),
    )
    const trigger = screen.getByRole('combobox', { name: 'Categoria' })
    expect(trigger).toHaveTextContent('Brinquedos')
    await user.click(trigger)
    expect(
      await screen.findByRole('option', { name: 'Brinquedos' }),
    ).toBeInTheDocument()
  })

  it('FLT-14 escolher Nenhum chama onChange com null', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      withClient(
        <FilterControl
          filter={makeFilter()}
          value="Livros"
          source={SOURCE}
          onChange={onChange}
        />,
      ),
    )
    await user.click(screen.getByRole('combobox', { name: 'Categoria' }))
    await user.click(await screen.findByRole('option', { name: 'Nenhum' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('FLT-23 falha das opções mostra Não foi possível carregar as opções e Tentar novamente', async () => {
    let failing = true
    server.use(
      http.post('/api/dashboards/d-1/filters/f-ruim/options', () =>
        failing
          ? HttpResponse.json(
              { code: 'QUERY_FAILED', message: 'falhou' },
              { status: 422 },
            )
          : HttpResponse.json({ options: ['Eletrônicos'], truncated: false }),
      ),
      http.post('/api/dashboards/d-1/filters/f-bom/options', () =>
        HttpResponse.json({ options: ['Livros'], truncated: false }),
      ),
    )
    const user = userEvent.setup()
    const query = {
      source: 'QUERY' as const,
      cypher: 'MATCH (c) RETURN c.nome',
    }
    render(
      withClient(
        <>
          <FilterControl
            filter={makeFilter({ id: 'f-ruim', label: 'Ruim', options: query })}
            value={null}
            source={SOURCE}
            onChange={() => {}}
          />
          <FilterControl
            filter={makeFilter({ id: 'f-bom', label: 'Bom', options: query })}
            value={null}
            source={SOURCE}
            onChange={() => {}}
          />
        </>,
      ),
    )
    expect(
      await screen.findByText('Não foi possível carregar as opções'),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText('Não foi possível carregar as opções'),
    ).toHaveLength(1)
    // o outro chip segue com as opções
    await user.click(await screen.findByRole('combobox', { name: 'Bom' }))
    expect(
      await screen.findByRole('option', { name: 'Livros' }),
    ).toBeInTheDocument()
    await user.keyboard('{Escape}')

    failing = false
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    const combobox = await screen.findByRole('combobox', { name: 'Ruim' })
    await user.click(combobox)
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Eletrônicos' }),
      ).toBeInTheDocument(),
    )
  })
})
