import type { FieldErrors, Place } from '../api'
import { CYCLE_LIMIT, cycleHours } from '../tripForm'
import type { LocationKey, LocationValue, TripFormState } from '../tripForm'
import LocationInput from './LocationInput'

export interface SheetDetails {
  driver: string
  carrier: string
  office: string
  truck: string
  shipping: string
}

interface Props {
  form: TripFormState
  loading: boolean
  errors: FieldErrors
  details: SheetDetails
  onChange: (form: TripFormState) => void
  onPick: (key: LocationKey, place: Place) => void
  onDetailsChange: (details: SheetDetails) => void
  onSubmit: () => void
}

const EXAMPLE: Record<LocationKey, LocationValue> = {
  current: { text: 'Chicago, IL', coords: [41.85, -87.65] },
  pickup: { text: 'Indianapolis, IN', coords: [39.7684, -86.158] },
  dropoff: { text: 'Dallas, TX', coords: [32.7831, -96.8067] },
}

const LOCATION_FIELDS: {
  key: LocationKey
  label: string
  marker: string
  markerClass: string
  placeholder: string
  error: keyof FieldErrors
}[] = [
  { key: 'current', label: 'Current location', marker: 'S', markerClass: 'stop-start', placeholder: 'Where the truck is now', error: 'current_location' },
  { key: 'pickup', label: 'Pickup location', marker: 'P', markerClass: 'stop-pickup', placeholder: 'Where the load is picked up', error: 'pickup_location' },
  { key: 'dropoff', label: 'Drop-off location', marker: 'D', markerClass: 'stop-dropoff', placeholder: 'Where the load is delivered', error: 'dropoff_location' },
]

const DETAIL_FIELDS: { key: keyof SheetDetails; label: string; placeholder: string }[] = [
  { key: 'driver', label: 'Driver name', placeholder: 'Alex Morgan' },
  { key: 'carrier', label: 'Carrier', placeholder: 'Acme Freight Lines' },
  { key: 'office', label: 'Main office address', placeholder: 'Chicago, IL' },
  { key: 'truck', label: 'Truck / trailer no.', placeholder: 'Truck 4521 / Trailer 88213' },
  { key: 'shipping', label: 'Shipping document / commodity', placeholder: 'BOL 778123 · Dry goods' },
]

export default function TripForm({ form, loading, errors, details, onChange, onPick, onDetailsChange, onSubmit }: Props) {
  const cycleUsed = cycleHours(form)
  const set = (key: 'cycle' | 'start') => (value: string) => onChange({ ...form, [key]: value })
  const cycleLeft = CYCLE_LIMIT - cycleUsed

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="trip-form card" onSubmit={submit}>
      <div className="form-head">
        <h2>Trip details</h2>
        <button type="button" className="link" onClick={() => onChange({ ...form, locations: EXAMPLE, cycle: '18' })}>
          Use an example
        </button>
      </div>

      <div className="location-stack">
        {LOCATION_FIELDS.map((field) => (
          <LocationInput
            key={field.key}
            label={field.label}
            marker={field.marker}
            markerClass={field.markerClass}
            placeholder={field.placeholder}
            value={form.locations[field.key].text}
            error={errors[field.error]}
            // Typed text has no coordinates until a suggestion is picked or the trip is planned.
            onChange={(text) => onChange({ ...form, locations: { ...form.locations, [field.key]: { text, coords: null } } })}
            onPick={(place) => onPick(field.key, place)}
            allowGeolocation={field.key === 'current'}
          />
        ))}
        <p className="hint">Type a city, or drop and drag the pins on the map.</p>
      </div>

      <div className={`field${errors.current_cycle_used ? ' has-error' : ''}`}>
        <label htmlFor="cycle">Current cycle used</label>
        <div className="cycle-row">
          <input
            type="range"
            min="0"
            max={CYCLE_LIMIT}
            step="0.5"
            value={cycleUsed}
            aria-label="Current cycle used, slider"
            onChange={(event) => set('cycle')(event.target.value)}
          />
          <div className="number-unit">
            <input
              id="cycle"
              type="number"
              min="0"
              max={CYCLE_LIMIT}
              step="0.25"
              required
              value={form.cycle}
              onChange={(event) => set('cycle')(event.target.value)}
            />
            <span>hrs</span>
          </div>
        </div>
        <p className="hint">
          {cycleLeft > 0
            ? `${cycleLeft} of 70 hours left in the 8-day cycle.`
            : 'No hours left — the trip will begin with a 34-hour restart.'}
        </p>
        {errors.current_cycle_used && <p className="field-error">{errors.current_cycle_used}</p>}
      </div>

      <div className="field">
        <label htmlFor="start">Departure</label>
        <input
          id="start"
          type="datetime-local"
          step="900"
          value={form.start}
          onChange={(event) => set('start')(event.target.value)}
        />
        <p className="hint">Home-terminal time. Logs are drawn midnight to midnight.</p>
      </div>

      <details className="sheet-details">
        <summary>Log sheet header (optional)</summary>
        {DETAIL_FIELDS.map(({ key, label, placeholder }) => (
          <div className="field" key={key}>
            <label htmlFor={`detail-${key}`}>{label}</label>
            <input
              id={`detail-${key}`}
              type="text"
              maxLength={60}
              placeholder={placeholder}
              value={details[key]}
              onChange={(event) => onDetailsChange({ ...details, [key]: event.target.value })}
            />
          </div>
        ))}
      </details>

      <button type="submit" className="primary" disabled={loading}>
        {loading ? (
          <>
            <span className="spinner" /> Planning trip…
          </>
        ) : (
          'Plan trip'
        )}
      </button>

      <ul className="assumptions">
        <li>Property-carrying driver, 70 hrs / 8 days</li>
        <li>11 h driving · 14 h window · 30-min break after 8 h</li>
        <li>Fuel every 1,000 mi · 1 h each for pickup and drop-off</li>
      </ul>
    </form>
  )
}
