import type { Stop, TripPlan } from '../api'
import { STOP_GLYPH, formatDay, formatDuration, formatMiles, formatTime } from '../format'

interface Props {
  plan: TripPlan
  onSelect: (stop: Stop) => void
}

export default function Itinerary({ plan, onSelect }: Props) {
  return (
    <ol className="itinerary">
      {plan.stops.map((stop, index) => {
        const day = formatDay(stop.arrive)
        const showDay = index === 0 || day !== formatDay(plan.stops[index - 1].arrive)
        const drive = plan.timeline.find((segment) => segment.kind === 'drive' && segment.start === stop.depart)
        return (
          <li key={`${stop.arrive}-${stop.type}`}>
            {showDay && <h3 className="day-heading">{day}</h3>}
            <button type="button" className="stop" onClick={() => onSelect(stop)} title="Show on map">
              <span className={`map-pin stop-${stop.type}`}>{STOP_GLYPH[stop.type]}</span>
              <span className="stop-body">
                <span className="stop-title">
                  {stop.title}
                  <span className="stop-place"> · {stop.location}</span>
                </span>
                <span className="stop-meta">
                  {formatTime(stop.arrive)} – {formatTime(stop.depart)}
                  {formatDay(stop.depart) !== day && ` (${formatDay(stop.depart)})`} · {formatDuration(stop.minutes)}
                  {stop.activities.length > 1 && ` · ${stop.activities.join(' + ')}`}
                </span>
              </span>
              <span className="stop-mile">mi {Math.round(stop.mile).toLocaleString('en-US')}</span>
            </button>
            {drive && (
              <p className="drive">
                Drive {formatDuration(drive.minutes)} · {formatMiles(drive.miles)}
              </p>
            )}
          </li>
        )
      })}
    </ol>
  )
}
