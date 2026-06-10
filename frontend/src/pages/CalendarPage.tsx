import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCalendarEvents, CalendarEvent } from '../api/calendar'
import BottomSheet from '../components/ui/BottomSheet'

type View = 'month' | 'week'

const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]
const MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(d.getDate() + n)
  return r
}

function getMondayOfWeek(d: Date): Date {
  const dow = d.getDay() === 0 ? 7 : d.getDay()
  return addDays(d, -(dow - 1))
}

function getMonthCells(year: number, month: number): Date[] {
  const first  = new Date(year, month, 1)
  const start  = getMondayOfWeek(first)
  const cells  = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  // Use 35 cells if the 6th row is entirely in the next month
  if (cells[35].getMonth() !== month) return cells.slice(0, 35)
  return cells
}

function getWeekDays(ref: Date): Date[] {
  const monday = getMondayOfWeek(ref)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

function formatTime(t: string | null): string {
  if (!t) return ''
  return t.slice(0, 5)
}

function formatDayTitle(s: string): string {
  const d = new Date(s + 'T00:00:00')
  const weekday = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'][d.getDay()]
  return `${weekday}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

// ──────────────────────────────────────────────────────────────────────────────
// Event dot strip (used in month cells)
// ──────────────────────────────────────────────────────────────────────────────
function EventDots({ events }: { events: CalendarEvent[] }) {
  const MAX = 3
  const shown = events.slice(0, MAX)
  const rest  = events.length - MAX

  return (
    <div className="flex items-center gap-0.5 flex-wrap justify-center mt-0.5">
      {shown.map((e) => (
        <span
          key={e.id}
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: e.color }}
          title={e.title}
        />
      ))}
      {rest > 0 && (
        <span className="text-[8px] leading-none text-[var(--color-text-muted)] ml-0.5">+{rest}</span>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Month view
// ──────────────────────────────────────────────────────────────────────────────
function MonthView({
  current, today, eventsByDate, selected, onSelectDay,
}: {
  current: Date
  today: string
  eventsByDate: Record<string, CalendarEvent[]>
  selected: string | null
  onSelectDay: (d: string) => void
}) {
  const cells = getMonthCells(current.getFullYear(), current.getMonth())
  const curMonth = current.getMonth()

  return (
    <div>
      {/* Weekday header */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS_SHORT.map((wd) => (
          <div key={wd} className="text-center text-[10px] font-semibold text-[var(--color-text-muted)] py-1">
            {wd}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell) => {
          const ds       = toDateStr(cell)
          const isToday  = ds === today
          const isCurMon = cell.getMonth() === curMonth
          const isWeekend= cell.getDay() === 0 || cell.getDay() === 6
          const dayEvents= eventsByDate[ds] ?? []
          const isSelected = ds === selected

          return (
            <button
              key={ds}
              onClick={() => onSelectDay(ds)}
              className={`
                flex flex-col items-center pt-1.5 pb-1 rounded-xl transition-colors min-h-[52px]
                ${isSelected
                  ? 'bg-[var(--color-primary)] text-white'
                  : isToday
                  ? 'bg-[var(--color-primary)] bg-opacity-15 text-[var(--color-primary)]'
                  : !isCurMon
                  ? 'opacity-30'
                  : isWeekend
                  ? 'text-[var(--color-text-muted)]'
                  : 'text-[var(--color-text)]'
                }
                ${!isSelected ? 'hover:bg-[var(--color-muted)]' : ''}
              `}
            >
              <span className={`text-xs font-medium leading-none ${isToday && !isSelected ? 'font-bold' : ''}`}>
                {cell.getDate()}
              </span>
              {dayEvents.length > 0 && !isSelected && (
                <EventDots events={dayEvents} />
              )}
              {dayEvents.length > 0 && isSelected && (
                <span className="text-[9px] mt-0.5 text-white/80">{dayEvents.length}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Week view
// ──────────────────────────────────────────────────────────────────────────────
function WeekView({
  current, today, eventsByDate, selected, onSelectDay,
}: {
  current: Date
  today: string
  eventsByDate: Record<string, CalendarEvent[]>
  selected: string | null
  onSelectDay: (d: string) => void
}) {
  const days = getWeekDays(current)

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day) => {
        const ds        = toDateStr(day)
        const isToday   = ds === today
        const isWeekend = day.getDay() === 0 || day.getDay() === 6
        const dayEvents = eventsByDate[ds] ?? []
        const isSelected= ds === selected

        return (
          <div
            key={ds}
            onClick={() => onSelectDay(ds)}
            className={`
              flex flex-col rounded-xl overflow-hidden cursor-pointer transition-colors
              ${isSelected ? 'ring-2 ring-[var(--color-primary)]' : ''}
              ${isWeekend ? 'bg-[var(--color-muted)] bg-opacity-50' : 'bg-[var(--color-surface)]'}
              border border-[var(--color-muted)] hover:border-[var(--color-primary)] hover:border-opacity-50
            `}
          >
            {/* Day header */}
            <div
              className={`
                text-center py-2 text-[10px] font-semibold leading-tight
                ${isToday
                  ? 'bg-[var(--color-primary)] text-white'
                  : isWeekend
                  ? 'text-[var(--color-text-muted)]'
                  : 'text-[var(--color-text)]'
                }
              `}
            >
              <div>{WEEKDAYS_SHORT[(day.getDay() + 6) % 7]}</div>
              <div className="text-sm font-bold">{day.getDate()}</div>
            </div>

            {/* Events */}
            <div className="flex flex-col gap-0.5 p-1 min-h-[60px]">
              {dayEvents.map((e) => (
                <div
                  key={e.id}
                  className="rounded px-1 py-0.5 text-[9px] leading-snug truncate font-medium"
                  style={{ backgroundColor: e.color + '25', color: e.color, borderLeft: `2px solid ${e.color}` }}
                  title={e.title}
                >
                  {e.time_from && <span className="mr-0.5 opacity-75">{formatTime(e.time_from)}</span>}
                  {e.area_icon && <span className="mr-0.5">{e.area_icon}</span>}
                  <span className="truncate">{e.title}</span>
                </div>
              ))}
              {dayEvents.length === 0 && (
                <div className="flex-1 flex items-center justify-center opacity-20">
                  <span className="text-[10px]">—</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Day event list (shown in bottom sheet)
// ──────────────────────────────────────────────────────────────────────────────
function DayEventList({
  events,
  onNavigate,
}: {
  events: CalendarEvent[]
  onNavigate: (e: CalendarEvent) => void
}) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-[var(--color-text-muted)] gap-2">
        <span className="text-3xl">📭</span>
        <p className="text-sm">Keine Einträge für diesen Tag</p>
      </div>
    )
  }

  const typeOrder = { appointment: 0, day_plan: 1, task: 2 }
  const sorted = [...events].sort((a, b) => {
    // First by time, then by type
    if (a.time_from && b.time_from) return a.time_from.localeCompare(b.time_from)
    if (a.time_from && !b.time_from) return -1
    if (!a.time_from && b.time_from) return 1
    return (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9)
  })

  return (
    <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto -mx-2 px-2 pb-2">
      {sorted.map((e) => {
        const typeLabel =
          e.type === 'day_plan'    ? 'Tagesplan'  :
          e.type === 'appointment' ? 'Arzttermin' :
          e.area_slug ? (e.area_icon ? `${e.area_icon}` : '') + ' Aufgabe' : 'Aufgabe'

        return (
          <button
            key={e.id}
            onClick={() => onNavigate(e)}
            className="flex items-start gap-3 p-3 rounded-xl border border-[var(--color-muted)] hover:border-[var(--color-primary)] hover:bg-[var(--color-muted)] transition-colors text-left w-full"
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
              style={{ backgroundColor: e.color }}
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${e.completed ? 'line-through text-[var(--color-text-muted)]' : ''}`}>
                {e.title}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {e.time_from && <span className="mr-2 font-medium">{formatTime(e.time_from)}{e.time_to && `–${formatTime(e.time_to)}`}</span>}
                <span>{typeLabel}</span>
                {e.priority === 3 && <span className="ml-1 text-red-400">●</span>}
                {e.priority === 2 && <span className="ml-1 text-amber-400">●</span>}
              </p>
            </div>
            <span className="text-[var(--color-text-muted)] text-xs flex-shrink-0 self-center">›</span>
          </button>
        )
      })}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Legend
// ──────────────────────────────────────────────────────────────────────────────
function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[11px] text-[var(--color-text-muted)]">{label}</span>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [view,     setView]     = useState<View>('month')
  const [current,  setCurrent]  = useState(() => new Date())
  const [events,   setEvents]   = useState<CalendarEvent[]>([])
  const [loading,  setLoading]  = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const navigate = useNavigate()

  const today = toDateStr(new Date())

  const range = useMemo(() => {
    if (view === 'month') {
      const cells = getMonthCells(current.getFullYear(), current.getMonth())
      return { from: toDateStr(cells[0]), to: toDateStr(cells[cells.length - 1]) }
    }
    const days = getWeekDays(current)
    return { from: toDateStr(days[0]), to: toDateStr(days[6]) }
  }, [view, current])

  useEffect(() => {
    setLoading(true)
    fetchCalendarEvents(range.from, range.to)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [range])

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const e of events) {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    }
    return map
  }, [events])

  function navPrev() {
    if (view === 'month') setCurrent((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
    else setCurrent((d) => addDays(d, -7))
  }

  function navNext() {
    if (view === 'month') setCurrent((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
    else setCurrent((d) => addDays(d, 7))
  }

  const weekTitle = useMemo(() => {
    const days = getWeekDays(current)
    const from = days[0]
    const to   = days[6]
    if (from.getMonth() === to.getMonth()) {
      return `${from.getDate()}–${to.getDate()}. ${MONTHS_SHORT[from.getMonth()]}`
    }
    return `${from.getDate()}. ${MONTHS_SHORT[from.getMonth()]} – ${to.getDate()}. ${MONTHS_SHORT[to.getMonth()]}`
  }, [current])

  const headerTitle = view === 'month'
    ? `${MONTHS[current.getMonth()]} ${current.getFullYear()}`
    : weekTitle

  const selectedEvents = selected ? (eventsByDate[selected] ?? []) : []

  function handleNavigateEvent(e: CalendarEvent) {
    setSelected(null)
    if (e.type === 'task' && e.area_slug) {
      navigate(`/${e.area_slug}?edit=${e.source_id}`)
    } else if (e.type === 'day_plan') {
      navigate('/day')
    } else if (e.type === 'appointment') {
      navigate('/health/doctors')
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg)] border-b border-[var(--color-muted)] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Kalender
          </h1>
          <div className="flex rounded-xl overflow-hidden border border-[var(--color-muted)]">
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                view === 'month'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-muted)]'
              }`}
            >
              Monat
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                view === 'week'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-muted)]'
              }`}
            >
              Woche
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={navPrev}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--color-muted)] transition-colors text-[var(--color-text-muted)] text-lg"
          >
            ‹
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setCurrent(new Date()); setSelected(null) }}
              className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-muted)] text-[var(--color-text-muted)] hover:bg-[var(--color-muted)] transition-colors"
            >
              Heute
            </button>
            <span className="text-sm font-semibold text-[var(--color-text)] min-w-[160px] text-center">
              {headerTitle}
            </span>
          </div>
          <button
            onClick={navNext}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--color-muted)] transition-colors text-[var(--color-text-muted)] text-lg"
          >
            ›
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-3 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="space-y-1.5 mt-2">
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-12 bg-[var(--color-muted)] rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        ) : view === 'month' ? (
          <MonthView
            current={current}
            today={today}
            eventsByDate={eventsByDate}
            selected={selected}
            onSelectDay={(d) => setSelected(d === selected ? null : d)}
          />
        ) : (
          <WeekView
            current={current}
            today={today}
            eventsByDate={eventsByDate}
            selected={selected}
            onSelectDay={(d) => setSelected(d === selected ? null : d)}
          />
        )}

        {/* Legend */}
        <div className="flex gap-4 flex-wrap mt-5 px-1">
          <LegendItem color="#6B8F71" label="Tagesplan" />
          <LegendItem color="#4A7FA5" label="Arzttermin" />
          <LegendItem color="#C4A882" label="Aufgabe fällig" />
        </div>
      </div>

      {/* Day detail sheet */}
      <BottomSheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? formatDayTitle(selected) : ''}
      >
        <DayEventList events={selectedEvents} onNavigate={handleNavigateEvent} />
      </BottomSheet>
    </div>
  )
}
