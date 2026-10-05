import type { TripPlan } from '../api'
import { formatDay, formatDuration, formatMiles, formatTime } from '../format'

export default function Summary({ plan }: { plan: TripPlan }) {
  const { summary } = plan
  const { counts } = summary
  const stops = [
    counts.rest && `${counts.rest} rest${counts.rest > 1 ? 's' : ''}`,
    counts.fuel && `${counts.fuel} fuel`,
    counts.break && `${counts.break} break${counts.break > 1 ? 's' : ''}`,
    counts.restart && `${counts.restart} restart${counts.restart > 1 ? 's' : ''}`,
  ].filter(Boolean)

  const stats = [
    { label: 'Distance', value: formatMiles(summary.total_miles), sub: `${plan.route.legs.length} legs` },
    {
      label: 'Driving time',
      value: formatDuration(summary.driving_hours * 60),
      sub: `${formatDuration(summary.on_duty_hours * 60)} on duty in total`,
    },
    {
      label: 'Arrival',
      value: formatTime(summary.end),
      sub: `${formatDay(summary.end)} · ${formatDuration(summary.trip_hours * 60)} door to door`,
    },
    {
      label: 'Required stops',
      value: String(counts.rest + counts.fuel + counts.break + counts.restart),
      sub: stops.length ? stops.join(' · ') : 'None needed',
    },
    {
      label: 'Log sheets',
      value: String(summary.days),
      sub: `Cycle after trip: ${summary.cycle_used_end} / 70 h`,
    },
  ]

  return (
    <dl className="summary">
      {stats.map((stat) => (
        <div className="stat card" key={stat.label}>
          <dt>{stat.label}</dt>
          <dd>{stat.value}</dd>
          <p>{stat.sub}</p>
        </div>
      ))}
    </dl>
  )
}
