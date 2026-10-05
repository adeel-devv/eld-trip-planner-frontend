import type { DutyStatus, StopType } from './api'

export const STATUS_LABEL: Record<DutyStatus, string> = {
  off_duty: 'Off duty',
  sleeper_berth: 'Sleeper berth',
  driving: 'Driving',
  on_duty: 'On duty',
}

export const STOP_GLYPH: Record<StopType, string> = {
  start: 'S',
  pickup: 'P',
  dropoff: 'D',
  fuel: 'F',
  rest: 'R',
  break: 'B',
  restart: '34',
}

export const STOP_LABEL: Record<StopType, string> = {
  start: 'Start',
  pickup: 'Pickup',
  dropoff: 'Drop-off',
  fuel: 'Fuel',
  rest: '10-hour rest',
  break: '30-min break',
  restart: '34-hour restart',
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function formatDay(iso: string): string {
  // Date-only strings parse as UTC; pin them to local noon to keep the calendar day.
  const date = new Date(iso.length === 10 ? `${iso}T12:00` : iso)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

/** 11.5 -> "11:30", as written in a log book's totals column. */
export function formatClockHours(hours: number): string {
  const total = Math.round(hours * 60)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function formatMiles(miles: number): string {
  return `${Math.round(miles).toLocaleString('en-US')} mi`
}

/** Local time as the value of an <input type="datetime-local">, on the next quarter hour. */
export function defaultStartTime(): string {
  const now = new Date()
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}
