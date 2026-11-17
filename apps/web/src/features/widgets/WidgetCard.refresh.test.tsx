import { screen, waitFor } from '@testing-library/react'
import { delay, HttpResponse, http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatClock } from '@/lib/format'
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

const threeRows = makeQueryResult({
  rows: [
    ['Centro', 120],
    ['Norte', 80],
    ['Sul', 60],
  ],
})
const fourRows = makeQueryResult({
  rows: [...threeRows.rows, ['Leste', 40]],
})

function openDashboard(secondResponse: () => Promise<Response> | Response) {
  let runs = 0
  const view = renderApp('/dashboards/d-1', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      http.get('/api/dashboards/d-1', () =>
        HttpResponse.json(
          makeDashboard({
            tabs: [{ id: 't-1', name: 'Aba 1', widgets: [makeWidget()] }],
          }),
        ),
      ),
      http.post('/api/dashboards/:id/widgets/:widgetId/run', () => {
        runs += 1
        return runs === 1 ? HttpResponse.json(threeRows) : secondResponse()
      }),
    ],
  })
  return view
}

afterEach(() => {
  vi.useRealTimers()
})

describe('WidgetCard atualização', () => {
  it('RFR-09 atualização mantém os dados anteriores sem esqueleto', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const { user, container } = openDashboard(async () => {
      await gate
      return HttpResponse.json(fourRows)
    })
    expect(await screen.findByText('Sul')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Atualizar' }))
    await delay(100)
    expect(screen.getByText('Sul')).toBeInTheDocument()
    expect(screen.getByText('Centro')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0)

    release()
    expect(await screen.findByText('Leste')).toBeInTheDocument()
  })

  it('RFR-10 falha da atualização mantém os dados e mostra Não foi possível atualizar às', async () => {
    const { user } = openDashboard(() =>
      HttpResponse.json(
        { code: 'QUERY_FAILED', message: 'Falha do Neo4j' },
        { status: 422 },
      ),
    )
    expect(await screen.findByText('Sul')).toBeInTheDocument()

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 16, 14, 5, 0))
    await user.click(screen.getByRole('button', { name: 'Atualizar' }))

    expect(
      await screen.findByText('Não foi possível atualizar às 14:05'),
    ).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Centro')).toBeInTheDocument())
    expect(screen.getByText('Sul')).toBeInTheDocument()
    expect(screen.queryByText('Falha do Neo4j')).not.toBeInTheDocument()
  })

  it('RFR-10 formatClock dá 14:05 e 14:05:09', () => {
    const date = new Date(2026, 10, 16, 14, 5, 9)
    expect(formatClock(date)).toBe('14:05')
    expect(formatClock(date, { seconds: true })).toBe('14:05:09')
  })
})
