import type { DailyLog, DutyStatus, LogRemark } from '../api'
import { formatClockHours } from '../format'
import type { SheetDetails } from './TripForm'

// Geometry of the 24-hour graph grid, in SVG user units.
const GRID_X = 128
const HOUR_W = 32
const GRID_W = HOUR_W * 24
const GRID_Y = 278
const ROW_H = 32
const GRID_BOTTOM = GRID_Y + ROW_H * 4
const TOTAL_X = 940

const ROWS: { status: DutyStatus; lines: string[] }[] = [
  { status: 'off_duty', lines: ['1. Off Duty'] },
  { status: 'sleeper_berth', lines: ['2. Sleeper', 'Berth'] },
  { status: 'driving', lines: ['3. Driving'] },
  { status: 'on_duty', lines: ['4. On Duty', '(not driving)'] },
]

const HOUR_LABELS = ['Mid-\nnight', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', 'Noon']
const INK = '#1a3fa8'

const xAt = (minute: number) => GRID_X + (minute / 60) * HOUR_W
const yAt = (status: DutyStatus) => GRID_Y + ROWS.findIndex((row) => row.status === status) * ROW_H + ROW_H / 2

function Lines({ x, y, lines, lineHeight = 11, ...rest }: { x: number; y: number; lines: string[]; lineHeight?: number } & React.SVGProps<SVGTextElement>) {
  return (
    <text x={x} y={y} {...rest}>
      {lines.map((line, index) => (
        <tspan key={index} x={x} dy={index ? lineHeight : 0}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

/** Hand-written value sitting on a form line. */
function Filled({ x, y, children, anchor = 'start' }: { x: number; y: number; children: React.ReactNode; anchor?: 'start' | 'middle' }) {
  return (
    <text x={x} y={y} className="filled" textAnchor={anchor}>
      {children}
    </text>
  )
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

interface Props {
  log: DailyLog
  details: SheetDetails
}

export default function LogSheet({ log, details }: Props) {
  const [year, month, day] = log.date.split('-')
  const dutyPath = log.entries
    .flatMap((entry) => [`${xAt(entry.start)},${yAt(entry.status)}`, `${xAt(entry.end)},${yAt(entry.status)}`])
    .join(' ')
  const totalHours = Object.values(log.totals).reduce((sum, hours) => sum + hours, 0)

  // Label each duty change with its place; skip repeats so slanted text never collides.
  const remarks: (LogRemark & { x: number; labelled: boolean })[] = []
  let lastLabelX = -Infinity
  let lastLocation = ''
  for (const remark of log.remarks) {
    const x = xAt(remark.minute)
    const repeat = remark.note === 'Driving' && remark.location === lastLocation
    const labelled = !repeat && x - lastLabelX >= 11
    if (labelled) {
      lastLabelX = x
      lastLocation = remark.location
    }
    remarks.push({ ...remark, x, labelled })
  }

  return (
    <svg className="log-sheet" viewBox="0 0 1000 700" role="img" aria-label={`Driver's daily log for ${log.date}`}>
      <rect width="1000" height="700" fill="#fff" />

      {/* Header */}
      <text x="20" y="42" className="sheet-title">Drivers Daily Log</text>
      <text x="62" y="58" className="tiny">(24 hours)</text>
      {[
        { x: 400, value: month, label: '(month)' },
        { x: 470, value: day, label: '(day)' },
        { x: 545, value: year, label: '(year)' },
      ].map((part) => (
        <g key={part.label}>
          <Filled x={part.x} y={38} anchor="middle">{part.value}</Filled>
          <line x1={part.x - 28} x2={part.x + 28} y1="43" y2="43" className="rule" />
          <text x={part.x} y="56" className="tiny" textAnchor="middle">{part.label}</text>
        </g>
      ))}
      <text x="435" y="40" className="label">/</text>
      <text x="507" y="40" className="label">/</text>
      <text x="640" y="34" className="tiny">Original - File at home terminal.</text>
      <text x="640" y="48" className="tiny">Duplicate - Driver retains in his/her possession for 8 days.</text>

      <text x="80" y="92" className="label bold">From:</text>
      <line x1="122" x2="470" y1="95" y2="95" className="rule" />
      <Filled x={128} y={90}>{truncate(log.from, 44)}</Filled>
      <text x="500" y="92" className="label bold">To:</text>
      <line x1="526" x2="900" y1="95" y2="95" className="rule" />
      <Filled x={532} y={90}>{truncate(log.to, 46)}</Filled>

      <rect x="80" y="112" width="150" height="38" className="box" />
      <rect x="240" y="112" width="150" height="38" className="box" />
      <Filled x={155} y={137} anchor="middle">{log.total_miles}</Filled>
      <Filled x={315} y={137} anchor="middle">{log.total_miles}</Filled>
      <text x="155" y="163" className="tiny" textAnchor="middle">Total Miles Driving Today</text>
      <text x="315" y="163" className="tiny" textAnchor="middle">Total Mileage Today</text>

      <rect x="80" y="174" width="310" height="38" className="box" />
      <Filled x={235} y={199} anchor="middle">{truncate(details.truck, 40)}</Filled>
      <Lines x={235} y={224} className="tiny" textAnchor="middle"
        lines={['Truck/Tractor and Trailer Numbers or', 'License Plate(s)/State (show each unit)']} />

      {[
        { y: 130, value: details.carrier, label: 'Name of Carrier or Carriers' },
        { y: 170, value: details.office, label: 'Main Office Address' },
        { y: 210, value: details.driver, label: "Driver's Name / Signature" },
      ].map((line) => (
        <g key={line.label}>
          <Filled x={700} y={line.y - 5} anchor="middle">{truncate(line.value, 56)}</Filled>
          <line x1="460" x2="940" y1={line.y} y2={line.y} className="rule" />
          <text x="700" y={line.y + 12} className="tiny" textAnchor="middle">{line.label}</text>
        </g>
      ))}

      {/* Graph grid */}
      <rect x="100" y={GRID_Y - 32} width="880" height="32" fill="#111" />
      {Array.from({ length: 25 }, (_, hour) => {
        const lines = HOUR_LABELS[hour % 12 === 0 ? (hour === 12 ? 12 : 0) : hour % 12].split('\n')
        return (
          <Lines key={hour} x={xAt(hour * 60)} y={GRID_Y - (lines.length > 1 ? 17 : 7)} lines={lines}
            lineHeight={10} className="hour-label" textAnchor="middle" />
        )
      })}
      <Lines x={TOTAL_X} y={GRID_Y - 17} lines={['Total', 'Hours']} lineHeight={10} className="hour-label" textAnchor="middle" />

      {ROWS.map((row, index) => {
        const top = GRID_Y + index * ROW_H
        return (
          <g key={row.status}>
            <Lines x={22} y={top + (row.lines.length > 1 ? 14 : 20)} lines={row.lines} className="label bold" />
            <rect x={GRID_X} y={top} width={GRID_W} height={ROW_H} className="box" />
            {Array.from({ length: 96 }, (_, quarter) => {
              const x = GRID_X + (quarter * HOUR_W) / 4
              const length = quarter % 4 === 0 ? ROW_H : quarter % 2 === 0 ? 16 : 9
              // Upper rows hang their ticks from the top, lower rows stand them on the bottom.
              const from = index < 2 ? top : top + ROW_H - length
              return <line key={quarter} x1={x} x2={x} y1={from} y2={from + length} className="tick" />
            })}
            <Filled x={TOTAL_X} y={top + 21} anchor="middle">{formatClockHours(log.totals[row.status])}</Filled>
            <line x1={TOTAL_X - 28} x2={TOTAL_X + 28} y1={top + 26} y2={top + 26} className="rule" />
          </g>
        )
      })}
      <polyline points={dutyPath} fill="none" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      <Filled x={TOTAL_X} y={GRID_BOTTOM + 22} anchor="middle">{formatClockHours(totalHours)}</Filled>
      <line x1={TOTAL_X - 28} x2={TOTAL_X + 28} y1={GRID_BOTTOM + 27} y2={GRID_BOTTOM + 27} className="rule" />
      <line x1={TOTAL_X - 28} x2={TOTAL_X + 28} y1={GRID_BOTTOM + 30} y2={GRID_BOTTOM + 30} className="rule" />

      {/* Remarks */}
      <text x="22" y={GRID_BOTTOM + 28} className="label bold remarks-title">Remarks</text>
      <path d={`M20 ${GRID_BOTTOM + 40} V612 H410 M690 612 H980`} fill="none" stroke="#111" strokeWidth="2.5" />
      <Lines x={26} y={500} lines={['Shipping', 'Documents:']} lineHeight={13} className="label bold" />
      <Filled x={26} y={540}>{truncate(details.shipping, 16)}</Filled>
      <line x1="26" x2="118" y1="545" y2="545" className="rule" />
      <Lines x={26} y={557} lines={['DVL or Manifest No.', 'or']} className="tiny" />
      <line x1="26" x2="118" y1="582" y2="582" className="rule" />
      <text x="26" y="594" className="tiny">Shipper &amp; Commodity</text>

      {remarks.map((remark, index) => (
        <g key={index}>
          <line x1={remark.x} x2={remark.x} y1={GRID_BOTTOM} y2={GRID_BOTTOM + 9} stroke={INK} strokeWidth="1.6" />
          {remark.labelled && (
            <text className="remark" transform={`translate(${remark.x - 2} ${GRID_BOTTOM + 14}) rotate(58)`}>
              {truncate(remark.note === 'Driving' ? remark.location : `${remark.location} — ${remark.note}`, 36)}
            </text>
          )}
        </g>
      ))}

      <text x="550" y="606" className="tiny" textAnchor="middle">
        Enter name of place you reported and where released from work and when and where each change of duty occurred.
      </text>
      <text x="550" y="619" className="tiny" textAnchor="middle">Use time standard of home terminal.</text>

      {/* Recap */}
      <Lines x={22} y={640} lines={['Recap:', 'Complete at', 'end of day']} className="tiny bold" />
      <Filled x={130} y={642} anchor="middle">{formatClockHours(log.recap.on_duty_today)}</Filled>
      <line x1="100" x2="160" y1="647" y2="647" className="rule" />
      <Lines x={130} y={658} lines={['On duty hours', 'today, Total', 'lines 3 & 4']} className="tiny" textAnchor="middle" />

      <Lines x={215} y={640} lines={['70 Hour/', '8 Day', 'Drivers']} className="tiny bold" textAnchor="middle" />
      {[
        { x: 300, value: formatClockHours(log.recap.cycle_used), lines: ['A. Total hours on', 'duty last 7 days', 'including today.'] },
        { x: 400, value: formatClockHours(log.recap.available_tomorrow), lines: ['B. Total hours', 'available tomorrow', '70 hr. minus A*'] },
        { x: 500, value: formatClockHours(log.recap.cycle_used), lines: ['C. Total hours on', 'duty last 8 days', 'including today.'] },
        { x: 660, value: '', lines: ['A. Total hours on', 'duty last 6 days', 'including today.'] },
        { x: 755, value: '', lines: ['B. Total hours', 'available tomorrow', '60 hr. minus A*'] },
        { x: 850, value: '', lines: ['C. Total hours on', 'duty last 7 days', 'including today.'] },
      ].map((column, index) => (
        <g key={index}>
          <Filled x={column.x} y={642} anchor="middle">{column.value}</Filled>
          <line x1={column.x - 38} x2={column.x + 38} y1="647" y2="647" className="rule" />
          <Lines x={column.x} y={658} lines={column.lines} className="tiny" textAnchor="middle" />
        </g>
      ))}
      <Lines x={585} y={640} lines={['60 Hour/', '7 Day', 'Drivers']} className="tiny bold" textAnchor="middle" />
      <Lines x={903} y={640} lines={['*If you took 34', 'consecutive hours', 'off duty you have', '60/70 hours', 'available']} lineHeight={10} className="tiny" />
      <line x1="20" x2="980" y1="692" y2="692" stroke="#111" strokeWidth="2.5" />
    </svg>
  )
}
