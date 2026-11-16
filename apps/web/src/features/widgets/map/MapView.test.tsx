import { readFileSync } from 'node:fs'
import { MESSAGES, type QueryResultDto } from '@ninbi/contracts'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import L from 'leaflet'
import { HttpResponse, http } from 'msw'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockElementSize } from '@/test/element-size'
import { makeQueryResult } from '@/test/fixtures/dashboards'
import { renderApp } from '@/test/renderApp'
import { buildMapPoints } from '../mapping/simple-data'
import { WidgetVisualization } from '../WidgetVisualization'
import { MapView } from './MapView'

let restore: () => void
beforeEach(() => {
  restore = mockElementSize(400, 300)
})
afterEach(() => restore())

type Row = [string, number | string | null, number | string | null]

const STORES: Row[] = [
  ['Centro', -23.55, -46.63],
  ['Norte', -23.5, -46.6],
  ['Sul', -23.65, -46.7],
]

function draw(
  rows: Row[] = STORES,
  handlers: ReturnType<typeof http.get>[] = [],
) {
  const built = buildMapPoints(
    makeQueryResult({ columns: ['loja', 'lat', 'lon'], rows }),
    { lat: 'lat', lon: 'lon', label: 'loja' },
  )
  if (!built.ok) throw new Error('dados inválidos no teste')
  const view = renderApp('/', {
    routes: [
      {
        path: '/',
        element: <MapView points={built.data} notice={built.notice} />,
      },
    ],
    handlers,
  })
  return view
}

const markers = (container: HTMLElement) =>
  container.querySelectorAll('.leaflet-marker-icon')

async function tilesDrawn(container: HTMLElement) {
  await waitFor(() =>
    expect(
      container.querySelectorAll('img.leaflet-tile').length,
    ).toBeGreaterThan(0),
  )
}

function Card({
  result,
  config,
}: {
  result: QueryResultDto
  config: Record<string, unknown>
}) {
  const [count, setCount] = useState(0)
  return (
    <div>
      <button type="button" onClick={() => setCount(count + 1)}>
        Redesenhar {count}
      </button>
      <WidgetVisualization
        result={result}
        visualization="MAP"
        config={config}
      />
    </div>
  )
}

describe('MapView', () => {
  it('MAP-01 mapa desenha um marcador por linha', async () => {
    const { container } = draw()
    await waitFor(() => expect(markers(container)).toHaveLength(3))
  })

  it('MAP-02 rótulo de cada marcador aparece em um chip', async () => {
    const { container } = draw()
    await waitFor(() => expect(markers(container)).toHaveLength(3))
    const labels = [...markers(container)].map((marker) => marker.textContent)
    expect(labels).toEqual(['Centro', 'Norte', 'Sul'])
    for (const marker of markers(container)) {
      expect(marker.querySelector('.rounded-full')).toBeInTheDocument()
    }
  })

  it('MAP-03 linha com latitude 200 é ignorada e avisada', async () => {
    const { container } = draw([...STORES, ['Falsa', 200, -46.6]])
    await waitFor(() => expect(markers(container)).toHaveLength(3))
    expect(
      screen.getByText('1 linha sem coordenadas válidas'),
    ).toBeInTheDocument()
  })

  it('MAP-06 passar o cursor no marcador mostra rótulo e coordenadas', async () => {
    const { container } = draw()
    await waitFor(() => expect(markers(container)).toHaveLength(3))
    fireEvent.mouseOver(markers(container)[0] as Element)
    const tooltip = await waitFor(() => {
      const found = container.querySelector('.leaflet-tooltip')
      expect(found).toBeInTheDocument()
      return found as HTMLElement
    })
    expect(within(tooltip).getByText('Centro')).toBeInTheDocument()
    expect(within(tooltip).getByText('-23,55, -46,63')).toBeInTheDocument()
  })

  it('MAP-07 mapa de tiles com zoom e arrasto no estilo do tema', async () => {
    const { container, user } = draw(STORES, [
      http.get('/api/map-config', () =>
        HttpResponse.json({
          tileUrl: 'https://tiles.teste/{z}/{x}/{y}.png',
          attribution: '© Teste',
        }),
      ),
    ])
    await tilesDrawn(container)
    const tiles = [...container.querySelectorAll('img.leaflet-tile')]
    for (const tile of tiles) {
      expect(tile.getAttribute('src')).toMatch(/^https:\/\/tiles\.teste\//)
    }
    const map = container.querySelector('.leaflet-container') as HTMLElement
    expect(map).toHaveClass('leaflet-grab')
    expect(container.querySelector('.ninbi-map-tiles')).toBeInTheDocument()

    const before = Number(map.getAttribute('data-zoom'))
    await user.click(screen.getByRole('button', { name: 'Aumentar zoom' }))
    await waitFor(() =>
      expect(Number(map.getAttribute('data-zoom'))).toBe(before + 1),
    )
    expect(
      screen.getByRole('button', { name: 'Diminuir zoom' }),
    ).toBeInTheDocument()

    const css = readFileSync('src/styles/theme.css', 'utf-8')
    expect(css).toMatch(/\.dark \.ninbi-map-tiles\s*\{[^}]*filter:/)
  })

  it('MAP-08 dois marcadores na mesma coordenada mostram os dois rótulos na dica', async () => {
    const { container } = draw([
      ['Loja A', -23.55, -46.63],
      ['Loja B', -23.55, -46.63],
    ])
    await waitFor(() => expect(markers(container)).toHaveLength(2))
    fireEvent.mouseOver(markers(container)[0] as Element)
    const tooltip = await waitFor(() => {
      const found = container.querySelector('.leaflet-tooltip')
      expect(found).toBeInTheDocument()
      return found as HTMLElement
    })
    expect(within(tooltip).getByText('Loja A')).toBeInTheDocument()
    expect(within(tooltip).getByText('Loja B')).toBeInTheDocument()
  })

  it('MAP-09 falha dos tiles mostra Não foi possível carregar o mapa de fundo', async () => {
    const { container } = draw()
    await tilesDrawn(container)
    expect(screen.queryByText(MESSAGES.mapTilesFailed)).not.toBeInTheDocument()
    fireEvent.error(container.querySelector('img.leaflet-tile') as Element)
    expect(await screen.findByText(MESSAGES.mapTilesFailed)).toBeInTheDocument()
    expect(markers(container)).toHaveLength(3)
  })

  it('MAP-09 map-config com erro mostra o aviso e mantém os marcadores', async () => {
    const { container } = draw(STORES, [
      http.get('/api/map-config', () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'Falha' },
          { status: 500 },
        ),
      ),
    ])
    expect(await screen.findByText(MESSAGES.mapTilesFailed)).toBeInTheDocument()
    expect(markers(container)).toHaveLength(3)
  })

  it('MAP-05 re-render com os mesmos dados não reenquadra o mapa', async () => {
    const fitBounds = vi.spyOn(L.Map.prototype, 'fitBounds')
    const result = makeQueryResult({
      columns: ['loja', 'lat', 'lon'],
      rows: STORES,
    })
    const config = { mapping: { lat: 'lat', lon: 'lon', label: 'loja' } }
    const { container, user } = renderApp('/', {
      routes: [
        { path: '/', element: <Card result={result} config={config} /> },
      ],
    })
    await waitFor(() => expect(markers(container)).toHaveLength(3))
    const calls = fitBounds.mock.calls.length
    expect(calls).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Redesenhar 0' }))
    await screen.findByRole('button', { name: 'Redesenhar 1' })
    expect(fitBounds.mock.calls.length).toBe(calls)
    fitBounds.mockRestore()
  })

  it('MAP-05 vários marcadores enquadram os limites de todos', async () => {
    const fitBounds = vi.spyOn(L.Map.prototype, 'fitBounds')
    const { container } = draw()
    await waitFor(() => expect(markers(container)).toHaveLength(3))
    expect(fitBounds).toHaveBeenLastCalledWith(
      [
        [-23.65, -46.7],
        [-23.5, -46.6],
      ],
      expect.objectContaining({ animate: false }),
    )
    fitBounds.mockRestore()
  })

  it('MAP-05 um marcador centraliza nele com zoom 10', async () => {
    const setView = vi.spyOn(L.Map.prototype, 'setView')
    const { container } = draw([['Centro', -23.55, -46.63]])
    await waitFor(() => expect(markers(container)).toHaveLength(1))
    expect(setView).toHaveBeenLastCalledWith(
      [-23.55, -46.63],
      10,
      expect.objectContaining({ animate: false }),
    )
    await waitFor(() =>
      expect(
        container
          .querySelector('.leaflet-container')
          ?.getAttribute('data-zoom'),
      ).toBe('10'),
    )
    setView.mockRestore()
  })
})
