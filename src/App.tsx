import { useRef, useState } from 'react'
import { ApiError, planTrip, reversePlace } from './api'
import type { Coords, FieldErrors, Place, TripPlan } from './api'
import DailyLogs from './components/DailyLogs'
import Directions from './components/Directions'
import Itinerary from './components/Itinerary'
import RouteMap from './components/RouteMap'
import Summary from './components/Summary'
import TripForm from './components/TripForm'
import type { SheetDetails } from './components/TripForm'
import { emptyForm, toRequest } from './tripForm'
import type { LocationKey, LocationValue, TripFormState } from './tripForm'

type Tab = 'stops' | 'logs' | 'directions'

const LOCATION_KEYS: LocationKey[] = ['current', 'pickup', 'dropoff']

/** The next location a map click should place: the first one without a pin. */
const nextUnset = (form: TripFormState) => LOCATION_KEYS.find((key) => !form.locations[key].coords) ?? null

export default function App() {
  const [form, setForm] = useState<TripFormState>(emptyForm)
  const [plan, setPlan] = useState<TripPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [tab, setTab] = useState<Tab>('stops')
  const [focus, setFocus] = useState<Coords | null>(null)
  const [target, setTarget] = useState<LocationKey | null>('current')
  const [details, setDetails] = useState<SheetDetails>({ driver: '', carrier: '', office: '', truck: '', shipping: '' })
  // Only the latest request may update the screen (pins can be dragged mid-request).
  const requestId = useRef(0)

  const runPlan = async (next: TripFormState) => {
    const id = ++requestId.current
    setLoading(true)
    setError('')
    setFieldErrors({})
    try {
      const result = await planTrip(toRequest(next))
      if (id !== requestId.current) return
      setPlan(result)
      setFocus(null)
      setTarget(null)
      // Typed locations are now resolved: show them as pins too.
      setForm((current) => ({
        ...current,
        locations: Object.fromEntries(
          LOCATION_KEYS.map((key) => {
            const place = result.locations[key]
            return [key, current.locations[key].coords ? current.locations[key] : { text: place.label, coords: [place.lat, place.lng] }]
          }),
        ) as TripFormState['locations'],
      }))
    } catch (caught) {
      if (id !== requestId.current) return
      const apiError = caught instanceof ApiError ? caught : new ApiError('Something went wrong planning this trip.')
      setError(apiError.message)
      setFieldErrors(apiError.fields)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }

  const withLocation = (current: TripFormState, key: LocationKey, value: LocationValue): TripFormState => ({
    ...current,
    locations: { ...current.locations, [key]: value },
  })

  /** A suggestion was picked in the form: pin it and show it on the map. */
  const pickPlace = (key: LocationKey, place: Place) => {
    const coords: Coords = [place.lat, place.lng]
    const pinned = withLocation(form, key, { text: place.label, coords })
    setForm(pinned)
    setFocus(coords)
    setTarget(nextUnset(pinned))
  }

  /** A pin was dropped or dragged on the map: name the spot, then re-plan if a trip is shown. */
  const placePin = async (key: LocationKey, coords: Coords) => {
    const pinned = withLocation(form, key, { text: `${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`, coords })
    setForm(pinned)
    setTarget(nextUnset(pinned))

    const place = await reversePlace(coords[0], coords[1])
    const named = withLocation(pinned, key, { text: place.label, coords })
    setForm((current) => (current.locations[key].coords === coords ? withLocation(current, key, named.locations[key]) : current))
    if (plan) runPlan(named)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'stops', label: 'Stops & rests' },
    { id: 'logs', label: `Daily logs${plan ? ` (${plan.daily_logs.length})` : ''}` },
    { id: 'directions', label: 'Directions' },
  ]

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#f5a524" />
            <path d="M5 21h4l3-9h4l3 6h4l2-4h2" fill="none" stroke="#0f2742" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <h1>ELD Trip Planner</h1>
            <p>Hours-of-Service compliant routes and daily logs</p>
          </div>
        </div>
      </header>

      <main className="layout">
        <aside className="sidebar">
          <TripForm
            form={form}
            loading={loading}
            errors={fieldErrors}
            details={details}
            onChange={setForm}
            onPick={pickPlace}
            onDetailsChange={setDetails}
            onSubmit={() => runPlan(form)}
          />
        </aside>

        <section className="results">
          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
          {plan && <Summary plan={plan} />}
          <RouteMap plan={plan} focus={focus} locations={form.locations} target={target} onTargetChange={setTarget} onPlace={placePin} />

          {plan ? (
            <div className="card panel">
              <div className="tabs" role="tablist">
                {tabs.map(({ id, label }) => (
                  <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
                    {label}
                  </button>
                ))}
              </div>
              {tab === 'stops' && <Itinerary plan={plan} onSelect={(stop) => setFocus([stop.lat, stop.lng])} />}
              {tab === 'logs' && <DailyLogs logs={plan.daily_logs} details={details} />}
              {tab === 'directions' && <Directions legs={plan.route.legs} />}
            </div>
          ) : (
            <div className="card empty">
              <h2>Plan a trip to see the route and logs</h2>
              <p>
                Type the three locations or drop them as pins on the map. You'll get the route on the map, every
                required fuel stop, break and rest, and a filled-out driver's daily log for each day of the trip.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
