import { useState } from 'react'
import type { DailyLog, DutyStatus } from '../api'
import { STATUS_LABEL, formatClockHours, formatDay } from '../format'
import LogSheet from './LogSheet'
import type { SheetDetails } from './TripForm'

const STATUSES: DutyStatus[] = ['off_duty', 'sleeper_berth', 'driving', 'on_duty']

interface Props {
  logs: DailyLog[]
  details: SheetDetails
}

export default function DailyLogs({ logs, details }: Props) {
  const [selected, setSelected] = useState(0)
  const index = Math.min(selected, logs.length - 1)
  const log = logs[index]

  return (
    <div className="daily-logs">
      <div className="logs-toolbar">
        <div className="day-tabs" role="tablist" aria-label="Log day">
          {logs.map((item, i) => (
            <button
              key={item.date}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={i === index ? 'active' : ''}
              onClick={() => setSelected(i)}
            >
              <span>Day {i + 1}</span>
              {formatDay(item.date)}
            </button>
          ))}
        </div>
        <button type="button" className="secondary" onClick={() => window.print()}>
          Print all {logs.length} {logs.length === 1 ? 'sheet' : 'sheets'}
        </button>
      </div>

      <ul className="status-totals">
        {STATUSES.map((status) => (
          <li key={status}>
            <span className={`dot status-${status}`} />
            {STATUS_LABEL[status]}
            <strong>{formatClockHours(log.totals[status])}</strong>
          </li>
        ))}
        <li>
          Miles today<strong>{log.total_miles.toLocaleString('en-US')}</strong>
        </li>
      </ul>

      <div className="sheet-frame">
        <LogSheet log={log} details={details} />
      </div>

      {/* Every sheet, rendered only for printing. */}
      <div className="print-only">
        {logs.map((item) => (
          <LogSheet key={item.date} log={item} details={details} />
        ))}
      </div>
    </div>
  )
}
