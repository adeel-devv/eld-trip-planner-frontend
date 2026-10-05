export type DutyStatus = 'off_duty' | 'sleeper_berth' | 'driving' | 'on_duty'
export type StopType = 'start' | 'pickup' | 'dropoff' | 'fuel' | 'rest' | 'break' | 'restart'

export interface Place {
  lat: number
  lng: number
  label: string
}

export interface Stop extends Place {
  type: StopType
  title: string
  activities: string[]
  location: string
  mile: number
  arrive: string
  depart: string
  minutes: number
}

export interface TimelineSegment {
  status: DutyStatus
  kind: string
  note: string
  start: string
  end: string
  minutes: number
  miles: number
  location: string
}

export interface DirectionStep {
  text: string
  miles: number
  kind: string
  modifier: string
}

export interface RouteLeg {
  from: string
  to: string
  miles: number
  drive_hours: number
  steps: DirectionStep[]
}

export interface LogEntry {
  status: DutyStatus
  start: number
  end: number
}

export interface LogRemark {
  minute: number
  status: DutyStatus
  location: string
  note: string
}

export interface DailyLog {
  date: string
  from: string
  to: string
  entries: LogEntry[]
  remarks: LogRemark[]
  totals: Record<DutyStatus, number>
  total_miles: number
  recap: { on_duty_today: number; cycle_used: number; available_tomorrow: number }
}

export interface TripPlan {
  locations: { current: Place; pickup: Place; dropoff: Place }
  summary: {
    total_miles: number
    driving_hours: number
    on_duty_hours: number
    trip_hours: number
    start: string
    end: string
    days: number
    cycle_used_start: number
    cycle_used_end: number
    counts: { rest: number; fuel: number; break: number; restart: number }
  }
  route: { geometry: [number, number][]; legs: RouteLeg[] }
  stops: Stop[]
  timeline: TimelineSegment[]
  daily_logs: DailyLog[]
}

export type Coords = [number, number]

export interface TripRequest {
  current_location: string
  pickup_location: string
  dropoff_location: string
  /** Set when the location was picked from suggestions or dropped on the map. */
  current_coords: Coords | null
  pickup_coords: Coords | null
  dropoff_coords: Coords | null
  current_cycle_used: number
  start_time: string
}

export type FieldErrors = Partial<Record<keyof TripRequest, string>>

export class ApiError extends Error {
  fields: FieldErrors

  constructor(message: string, fields: FieldErrors = {}) {
    super(message)
    this.fields = fields
  }
}

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export async function planTrip(request: TripRequest): Promise<TripPlan> {
  let response: Response
  try {
    response = await fetch(`${API_URL}/api/trips/plan/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
  } catch {
    throw new ApiError("Can't reach the planning server. Check your connection and try again.")
  }
  if (response.ok) return response.json()

  const body = await response.json().catch(() => ({}))
  if (typeof body.detail === 'string') throw new ApiError(body.detail)
  const fields: FieldErrors = {}
  for (const [key, value] of Object.entries(body)) {
    fields[key as keyof TripRequest] = Array.isArray(value) ? String(value[0]) : String(value)
  }
  throw new ApiError(
    Object.keys(fields).length ? 'Please fix the highlighted fields.' : 'Something went wrong planning this trip.',
    fields,
  )
}

export async function searchPlaces(query: string, signal: AbortSignal): Promise<Place[]> {
  const response = await fetch(`${API_URL}/api/places/?q=${encodeURIComponent(query)}`, { signal })
  return response.ok ? response.json() : []
}

/** Nearest town to a point dropped on the map. */
export async function reversePlace(lat: number, lng: number): Promise<Place> {
  const fallback = { lat, lng, label: `${lat.toFixed(4)}, ${lng.toFixed(4)}` }
  try {
    const response = await fetch(`${API_URL}/api/reverse/?lat=${lat}&lng=${lng}`)
    return response.ok ? response.json() : fallback
  } catch {
    return fallback
  }
}
