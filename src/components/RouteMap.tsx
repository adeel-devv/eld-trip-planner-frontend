import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import type { Coords, Stop, StopType, TripPlan } from '../api'
import { STOP_GLYPH, STOP_LABEL, formatDay, formatDuration, formatTime } from '../format'
import type { LocationKey, LocationValue } from '../tripForm'

const US_CENTER: Coords = [39.5, -98.35]
const LEGEND: StopType[] = ['start', 'pickup', 'dropoff', 'fuel', 'break', 'rest', 'restart']

/** The three trip locations the user can drop and drag on the map. */
const PINS: { key: LocationKey; type: StopType; name: string }[] = [
  { key: 'current', type: 'start', name: 'Current location' },
  { key: 'pickup', type: 'pickup', name: 'Pickup' },
  { key: 'dropoff', type: 'dropoff', name: 'Drop-off' },
]

function stopIcon(type: StopType, draggable = false) {
  const size = draggable ? 36 : 30
  return L.divIcon({
    className: '',
    html: `<span class="map-pin stop-${type}${draggable ? ' draggable' : ''}">${STOP_GLYPH[type]}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

function MapController({ plan, focus }: { plan: TripPlan | null; focus: Coords | null }) {
  const map = useMap()
  useEffect(() => {
    if (plan) map.fitBounds(L.latLngBounds(plan.route.geometry), { padding: [36, 36] })
  }, [map, plan])
  useEffect(() => {
    if (focus) map.flyTo(focus, Math.max(map.getZoom(), 8), { duration: 0.8 })
  }, [map, focus])
  return null
}

function ClickToPlace({ target, onPlace }: { target: LocationKey | null; onPlace: Props['onPlace'] }) {
  const map = useMapEvents({
    click: (event) => {
      if (target) onPlace(target, [event.latlng.lat, event.latlng.lng])
    },
  })
  useEffect(() => {
    map.getContainer().classList.toggle('placing', target !== null)
  }, [map, target])
  return null
}

function StopDetails({ stop }: { stop: Stop }) {
  return (
    <Popup>
      <strong>{stop.title}</strong>
      <br />
      {stop.location}
      <br />
      {formatDay(stop.arrive)}, {formatTime(stop.arrive)} · {formatDuration(stop.minutes)}
      <br />
      Mile {Math.round(stop.mile).toLocaleString('en-US')}
    </Popup>
  )
}

interface Props {
  plan: TripPlan | null
  focus: Coords | null
  locations: Record<LocationKey, LocationValue>
  /** Which location the next map click will place, if any. */
  target: LocationKey | null
  onTargetChange: (target: LocationKey | null) => void
  onPlace: (key: LocationKey, coords: Coords) => void
}

export default function RouteMap({ plan, focus, locations, target, onTargetChange, onPlace }: Props) {
  const icons = useMemo(
    () => Object.fromEntries(LEGEND.map((type) => [type, stopIcon(type)])) as Record<StopType, L.DivIcon>,
    [],
  )
  const pinIcons = useMemo(
    () => Object.fromEntries(PINS.map((pin) => [pin.key, stopIcon(pin.type, true)])) as Record<LocationKey, L.DivIcon>,
    [],
  )
  const pinTypes = PINS.filter((pin) => locations[pin.key].coords).map((pin) => pin.type)
  const present = plan ? LEGEND.filter((type) => plan.stops.some((stop) => stop.type === type)) : []
  const targetName = PINS.find((pin) => pin.key === target)?.name.toLowerCase()

  return (
    <div className="map card">
      <div className="pin-bar">
        <span className="pin-bar-label">Set on map</span>
        {PINS.map((pin) => (
          <button
            key={pin.key}
            type="button"
            className={`pin-chip${target === pin.key ? ' active' : ''}`}
            aria-pressed={target === pin.key}
            onClick={() => onTargetChange(target === pin.key ? null : pin.key)}
          >
            <span className={`map-pin small stop-${pin.type}`}>{STOP_GLYPH[pin.type]}</span>
            {pin.name}
          </button>
        ))}
        <span className="pin-bar-hint">
          {target ? `Click the map to drop the ${targetName} pin.` : 'Drag a pin to move it.'}
        </span>
      </div>

      <MapContainer center={US_CENTER} zoom={4} scrollWheelZoom className="map-canvas">
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {plan && (
          <>
            <Polyline positions={plan.route.geometry} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9 }} />
            <Polyline positions={plan.route.geometry} pathOptions={{ color: '#1d5fd1', weight: 4.5 }} />
            {plan.stops
              // The trip's own endpoints are drawn as draggable pins below.
              .filter((stop) => !pinTypes.includes(stop.type))
              .map((stop) => (
                <Marker key={`${stop.arrive}-${stop.type}`} position={[stop.lat, stop.lng]} icon={icons[stop.type]}>
                  <StopDetails stop={stop} />
                </Marker>
              ))}
          </>
        )}
        {PINS.map((pin) => {
          const { coords, text } = locations[pin.key]
          const stop = plan?.stops.find((item) => item.type === pin.type)
          return (
            coords && (
              <Marker
                key={pin.key}
                position={coords}
                icon={pinIcons[pin.key]}
                draggable
                zIndexOffset={500}
                eventHandlers={{
                  dragend: (event) => {
                    const { lat, lng } = (event.target as L.Marker).getLatLng()
                    onPlace(pin.key, [lat, lng])
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -18]}>
                  {pin.name}: {text} · drag to move
                </Tooltip>
                {stop && <StopDetails stop={stop} />}
              </Marker>
            )
          )
        })}
        <ClickToPlace target={target} onPlace={onPlace} />
        <MapController plan={plan} focus={focus} />
      </MapContainer>
      {present.length > 0 && (
        <ul className="map-legend">
          {present.map((type) => (
            <li key={type}>
              <span className={`map-pin small stop-${type}`}>{STOP_GLYPH[type]}</span>
              {STOP_LABEL[type]}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
