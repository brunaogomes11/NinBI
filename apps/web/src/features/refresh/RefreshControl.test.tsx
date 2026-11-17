import type { DashboardDto, DashboardSaveInput } from '@ninbi/contracts'
import { act, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { connectionsHandler } from '@/test/fixtures/connections'
import {
  makeDashboard,
  makeQueryResult,
  makeWidget,
} from '@/test/fixtures/dashboards'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

function dashboardWith(overrides: Partial<DashboardDto> = {}) {
  return makeDashboard({
    tabs: [
      {
        id: 't-1',
        name: 'Aba 1',
        widgets: [
          makeWidget({ id: 'w-1', title: 'Vendas' }),
          makeWidget({ id: 'w-2', title: 'Estoque' }),
        ],
      },
    ],
    ...overrides,
  })
}

function open(
  path: string,
  dashboard: DashboardDto,
  record: { runs: string[]; puts: DashboardSaveInput[] },
) {
  return renderApp(path, {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      connectionsHandler(),
      http.post('/api/dashboards/d-1/query', () =>
        HttpResponse.json(makeQueryResult()),
      ),
      http.get('/api/dashboards/d-1', () => HttpResponse.json(dashboard)),
      http.put('/api/dashboards/d-1', async ({ request }) => {
        const body = (await request.json()) as DashboardSaveInput
        record.puts.push(body)
        return HttpResponse.json({
          ...dashboard,
          version: dashboard.version + 1,
          refreshIntervalSec: body.refreshIntervalSec,
        })
      }),
      http.post('/api/dashboards/:id/widgets/:widgetId/run', ({ params }) => {
        record.runs.push(String(params.widgetId))
        return HttpResponse.json(makeQueryResult())
      }),
    ],
  })
}

async function choose(
  user: ReturnType<typeof renderApp>['user'],
  label: string,
) {
  await user.click(
    await screen.findByRole('combobox', { name: 'Atualização automática' }),
  )
  await user.click(await screen.findByRole('option', { name: label }))
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('RefreshControl', () => {
  it('RFR-01 Atualização automática oferece Desligada a 1 h', async () => {
    const record = { runs: [], puts: [] }
    const { user } = open('/dashboards/d-1', dashboardWith(), record)
    await user.click(
      await screen.findByRole('combobox', { name: 'Atualização automática' }),
    )
    const options = await screen.findAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      'Desligada',
      '10 s',
      '30 s',
      '1 min',
      '5 min',
      '15 min',
      '1 h',
    ])
  })

  it('RFR-03 intervalo escolhido em edição e salvo vira o inicial', async () => {
    const record = { runs: [] as string[], puts: [] as DashboardSaveInput[] }
    const first = open('/dashboards/d-1?editar=1', dashboardWith(), record)
    await choose(first.user, '30 s')
    await first.user.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(record.puts).toHaveLength(1))
    expect(record.puts[0]?.refreshIntervalSec).toBe(30)
    first.unmount()

    // outra pessoa abre o dashboard já salvo com 30 s
    const other = { runs: [] as string[], puts: [] as DashboardSaveInput[] }
    open('/dashboards/d-1', dashboardWith({ refreshIntervalSec: 30 }), other)
    await waitFor(() => expect(other.runs).toHaveLength(2))
    expect(
      within(
        await screen.findByRole('combobox', { name: 'Atualização automática' }),
      ).getByText('30 s'),
    ).toBeInTheDocument()
    await advance(30_000)
    await waitFor(() => expect(other.runs).toHaveLength(4))
  })

  it('RFR-04 intervalo escolhido em visualização não grava o dashboard', async () => {
    const record = { runs: [] as string[], puts: [] as DashboardSaveInput[] }
    const view = open('/dashboards/d-1', dashboardWith(), record)
    await waitFor(() => expect(record.runs).toHaveLength(2))

    await choose(view.user, '10 s')
    await advance(10_000)
    await waitFor(() => expect(record.runs).toHaveLength(4))
    expect([...record.runs].sort()).toEqual(['w-1', 'w-1', 'w-2', 'w-2'])
    expect(record.puts).toHaveLength(0)

    view.unmount()
    open('/dashboards/d-1', dashboardWith(), record)
    expect(
      within(
        await screen.findByRole('combobox', { name: 'Atualização automática' }),
      ).getByText('Desligada'),
    ).toBeInTheDocument()
  })

  it('RFR-11 atualização terminada mostra Atualizado às', async () => {
    vi.setSystemTime(new Date(2026, 10, 16, 14, 5, 9))
    const record = { runs: [] as string[], puts: [] as DashboardSaveInput[] }
    open('/dashboards/d-1', dashboardWith(), record)
    expect(
      await screen.findByText('Atualizado às 14:05:09'),
    ).toBeInTheDocument()
  })
})
