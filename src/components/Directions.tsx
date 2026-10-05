import type { RouteLeg } from '../api'
import { formatDuration, formatMiles } from '../format'

export default function Directions({ legs }: { legs: RouteLeg[] }) {
  return (
    <div className="directions">
      {legs.map((leg, index) => (
        <details key={index} open={index === 0}>
          <summary>
            <span className="leg-title">
              {leg.from} → {leg.to}
            </span>
            <span className="leg-meta">
              {formatMiles(leg.miles)} · {formatDuration(leg.drive_hours * 60)} driving
            </span>
          </summary>
          <ol>
            {leg.steps.map((step, stepIndex) => (
              <li key={stepIndex}>
                <span>{step.text}</span>
                {step.kind !== 'arrive' && (
                  <span className="step-miles">{step.miles < 0.1 ? '< 0.1' : step.miles.toLocaleString('en-US')} mi</span>
                )}
              </li>
            ))}
          </ol>
        </details>
      ))}
    </div>
  )
}
