import { MESSAGES } from '@ninbi/contracts'
import L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
  ZoomControl,
} from 'react-leaflet'
import { formatNumber } from '@/lib/format'
import { type MapPoint, mapViewport } from '../mapping/simple-data'
import { useMapConfig } from './useMapConfig'

const FIT_PADDING: L.PointTuple = [24, 24]
const FIT_MAX_ZOOM = 12

/** Marcador em forma de chip com o rótulo; sem rótulo, um ponto (MAP-02). */
function markerIcon(label: string | null): L.DivIcon {
  const html = renderToStaticMarkup(
    label === null ? (
      <span className="block size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-primary" />
    ) : (
      <span className="inline-block -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-border bg-card-elevated px-2 py-0.5 text-xs font-medium text-foreground shadow">
        {label}
      </span>
    ),
  )
  return L.divIcon({
    className: 'ninbi-map-marker',
    html,
    iconSize: undefined,
  })
}

/** Mantém o atributo `data-zoom` do contêiner igual ao zoom do mapa (MAP-07). */
function ZoomTracker() {
  const map = useMap()
  useEffect(() => {
    map.getContainer().setAttribute('data-zoom', String(map.getZoom()))
  }, [map])
  useMapEvents({
    zoomend: () =>
      map.getContainer().setAttribute('data-zoom', String(map.getZoom())),
  })
  return null
}

/** Enquadra todos os marcadores (MAP-05). */
function FitViewport({ points }: { points: MapPoint[] }) {
  const map = useMap()
  useEffect(() => {
    const viewport = mapViewport(points)
    if ('bounds' in viewport) {
      map.fitBounds(viewport.bounds, {
        padding: FIT_PADDING,
        maxZoom: FIT_MAX_ZOOM,
        animate: false,
      })
    } else {
      map.setView(viewport.center, viewport.zoom, { animate: false })
    }
  }, [map, points])
  return null
}

function TileFailureNotice() {
  return (
    <p
      role="status"
      className="absolute top-2 left-2 z-[1000] rounded-control border border-border bg-card-elevated px-2 py-1 text-xs text-muted-foreground"
    >
      {MESSAGES.mapTilesFailed}
    </p>
  )
}

export interface MapViewProps {
  points: MapPoint[]
  notice?: string
}

/** Mapa de tiles com um marcador por ponto, zoom e arrasto (MAP-01 a MAP-09). */
export function MapView({ points, notice }: MapViewProps) {
  const config = useMapConfig()
  const [tilesFailed, setTilesFailed] = useState(false)
  const icons = useMemo(
    () => points.map((point) => markerIcon(point.label)),
    [points],
  )
  const first = mapViewport(points)
  const initial =
    'center' in first
      ? { center: first.center, zoom: first.zoom }
      : { center: first.bounds[0], zoom: 4 }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-1">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-control">
        <MapContainer
          center={initial.center}
          zoom={initial.zoom}
          zoomControl={false}
          scrollWheelZoom
          dragging
          className="h-full w-full"
        >
          <ZoomControl
            zoomInTitle="Aumentar zoom"
            zoomOutTitle="Diminuir zoom"
          />
          <ZoomTracker />
          <FitViewport points={points} />
          {config.data && (
            <TileLayer
              url={config.data.tileUrl}
              attribution={config.data.attribution}
              className="ninbi-map-tiles"
              crossOrigin="anonymous"
              eventHandlers={{ tileerror: () => setTilesFailed(true) }}
            />
          )}
          {points.map((point, index) => (
            <Marker
              // biome-ignore lint/suspicious/noArrayIndexKey: pontos do resultado não têm identidade própria
              key={index}
              position={[point.lat, point.lon]}
              icon={icons[index]}
            >
              <Tooltip direction="top">
                <div className="flex flex-col text-xs">
                  {point.sameSpotLabels.map((label, i) => (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: rótulos na ordem do resultado
                      key={i}
                      className="font-medium"
                    >
                      {label}
                    </span>
                  ))}
                  <span>{`${formatNumber(point.lat)}, ${formatNumber(point.lon)}`}</span>
                </div>
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
        {(tilesFailed || config.isError) && <TileFailureNotice />}
      </div>
      {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
    </div>
  )
}
