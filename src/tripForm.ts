import type { Coords, TripRequest } from './api'
import { defaultStartTime } from './format'

export type LocationKey = 'current' | 'pickup' | 'dropoff'

export interface LocationValue {
  text: string
  coords: Coords | null
}

export interface TripFormState {
  locations: Record<LocationKey, LocationValue>
  cycle: string
  start: string
}

export const CYCLE_LIMIT = 70

export const emptyForm = (): TripFormState => ({
  locations: {
    current: { text: '', coords: null },
    pickup: { text: '', coords: null },
    dropoff: { text: '', coords: null },
  },
  cycle: '0',
  start: defaultStartTime(),
})

export function cycleHours(form: TripFormState): number {
  return Math.min(CYCLE_LIMIT, Math.max(0, Number(form.cycle) || 0))
}

export function toRequest(form: TripFormState): TripRequest {
  const { current, pickup, dropoff } = form.locations
  return {
    current_location: current.text,
    pickup_location: pickup.text,
    dropoff_location: dropoff.text,
    current_coords: current.coords,
    pickup_coords: pickup.coords,
    dropoff_coords: dropoff.coords,
    current_cycle_used: cycleHours(form),
    start_time: form.start || defaultStartTime(),
  }
}
