import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCalendarEvents, CalendarEvent } from '../api/calendar'
import { createTask as createDayPlan } from '../api/day'
import {
  fetchRecurring, createRecurring, deleteRecurring,
  RecurringEvent, WEEKDAY_LABELS, COLOR_OPTIONS,
} from '../api/recurring'

type View = 'month' | 'week' | 'day'

const WEEKDAYS  = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTHS    = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
const MONTHS_S  = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
const WEEKDAYS_LONG = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']

// ── date helpers ────────────────────────────────────────────────────────────────
function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fromStr(s: string): Date { return new Date(s + 'T00:00:00') }
function addDays(d: Date, n: number): Date { const r=new Date(d); r.setDate(d.getDate()+n); return r }
function monday(d: Date): Date { const dow=d.getDay()||7; return addDays(d,-(dow-1)) }
function monthCells(y: number, m: number): Date[] {
  const start = monday(new Date(y, m, 1))
  const cells = Array.from({length:42},(_,i)=>addDays(start,i))
  if (cells[35].getMonth()!==m) return cells.slice(0,35)
  return cells
}
function weekDays(ref: Date): Date[] { const mo=monday(ref); return Array.from({length:7},(_,i)=>addDays(mo,i)) }
function formatDayLong(s: string): string {
  const d=fromStr(s)
  return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
function formatTime(t: string|null): string { return t ? t.slice(0,5) : '' }

// ── event dot strip ─────────────────────────────────────────────────────────────
function Dots({ events, max=3 }: { events: CalendarEvent[]; max?: number }) {
  const shown = events.slice(0,max), rest=events.length-max
  return (
    <div className="flex items-center gap-0.5 flex-wrap justify-center mt-0.5">
      {shown.map(e=>(
        <span key={e.id} className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{backgroundColor:e.color}} />
      ))}
      {rest>0 && <span className="text-[8px] text-[var(--color-text-muted)] ml-0.5">+{rest}</span>}
    </div>
  )
}

// ── month view ──────────────────────────────────────────────────────────────────
function MonthView({ current, today, byDate, onDay }: {
  current: Date; today: string
  byDate: Record<string,CalendarEvent[]>
  onDay: (d: string) => void
}) {
  const cells   = monthCells(current.getFullYear(), current.getMonth())
  const curMonth= current.getMonth()
  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(w=>(
          <div key={w} className="text-center text-[10px] font-semibold text-[var(--color-text-muted)] py-1">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map(cell=>{
          const ds=toStr(cell), evs=byDate[ds]??[], isCur=cell.getMonth()===curMonth
          const isToday=ds===today, isWknd=cell.getDay()===0||cell.getDay()===6
          return (
            <button key={ds} onClick={()=>onDay(ds)}
              className={`flex flex-col items-center pt-1.5 pb-1 rounded-xl transition-colors min-h-[52px]
                hover:bg-[var(--color-muted)]
                ${isToday?'bg-[var(--color-primary)] text-white':!isCur?'opacity-25':isWknd?'text-[var(--color-text-muted)]':'text-[var(--color-text)]'}`}
            >
              <span className={`text-xs leading-none ${isToday?'font-bold':isCur&&evs.length>0?'font-semibold':''}`}>{cell.getDate()}</span>
              {evs.length>0&&!isToday&&<Dots events={evs} />}
              {evs.length>0&&isToday&&<span className="text-[9px] text-white/80 mt-0.5">{evs.length}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── week view ───────────────────────────────────────────────────────────────────
const WEEK_MAX = 4
function WeekView({ current, today, byDate, onDay }: {
  current: Date; today: string
  byDate: Record<string,CalendarEvent[]>
  onDay: (d: string) => void
}) {
  const days=weekDays(current)
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map(day=>{
        const ds=toStr(day), isToday=ds===today
        const isWknd=day.getDay()===0||day.getDay()===6
        const evs=byDate[ds]??[], shown=evs.slice(0,WEEK_MAX), rest=evs.length-WEEK_MAX
        return (
          <div key={ds} className={`flex flex-col rounded-xl overflow-hidden border transition-colors
            cursor-pointer hover:border-[var(--color-primary)]
            ${isWknd?'bg-[var(--color-muted)] border-transparent':'bg-[var(--color-surface)] border-[var(--color-muted)]'}`}
            onClick={()=>onDay(ds)}
          >
            {/* Day header */}
            <div className={`text-center py-2 text-[10px] font-semibold leading-tight
              ${isToday?'bg-[var(--color-primary)] text-white':isWknd?'text-[var(--color-text-muted)]':'text-[var(--color-text)]'}`}>
              <div>{WEEKDAYS[(day.getDay()+6)%7]}</div>
              <div className="text-sm font-bold">{day.getDate()}</div>
            </div>
            {/* Events */}
            <div className="flex flex-col gap-0.5 p-1 min-h-[60px]">
              {shown.map(e=>(
                <div key={e.id}
                  className="rounded px-1 py-0.5 text-[9px] leading-snug truncate font-medium"
                  style={{backgroundColor:e.color+'22',color:e.color,borderLeft:`2px solid ${e.color}`}}
                  title={e.title}
                >
                  {e.time_from&&<span className="mr-0.5 opacity-75">{formatTime(e.time_from)}</span>}
                  {e.area_icon&&<span className="mr-0.5">{e.area_icon}</span>}
                  {e.title}
                </div>
              ))}
              {rest>0&&(
                <button onClick={e=>{e.stopPropagation();onDay(ds)}}
                  className="text-[9px] text-[var(--color-primary)] font-medium text-left px-1 hover:underline">
                  +{rest} weitere
                </button>
              )}
              {evs.length===0&&(
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

// ── recurring event manager ─────────────────────────────────────────────────────
function RecurringManager({ onClose }: { onClose: () => void }) {
  const [list,     setList]     = useState<RecurringEvent[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title,    setTitle]    = useState('')
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [timeFrom, setTimeFrom] = useState('')
  const [color,    setColor]    = useState(COLOR_OPTIONS[0].value)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { fetchRecurring().then(setList) }, [])

  function toggleWd(d: number) {
    setWeekdays(p => p.includes(d) ? p.filter(x=>x!==d) : [...p, d].sort())
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || weekdays.length===0) return
    setSaving(true)
    try {
      const created = await createRecurring({ title: title.trim(), weekdays, time_from: timeFrom||null, time_to: null, color })
      setList(p=>[...p, created])
      setTitle(''); setWeekdays([]); setTimeFrom(''); setShowForm(false)
    } finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    await deleteRecurring(id)
    setList(p=>p.filter(r=>r.id!==id))
  }

  const wdLabel = (wds: number[]) => wds.map(d=>WEEKDAY_LABELS[d]).join(', ')

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[var(--color-surface)] rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[80vh] mb-16 md:mb-0">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="text-xl" style={{fontFamily:'Cormorant Garamond, serif'}}>Wiederkehrende Einträge</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xl">×</button>
        </div>

        {/* Existing recurring events */}
        <div className="flex flex-col gap-2 mb-4 px-6 overflow-y-auto flex-1">
          {list.length===0&&!showForm&&(
            <p className="text-sm text-[var(--color-text-muted)] text-center py-4">Noch keine wiederkehrenden Einträge</p>
          )}
          {list.map(r=>(
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-muted)]">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor:r.color}} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">↻ {r.title}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {wdLabel(r.weekdays)}{r.time_from?` · ${r.time_from}`:''}
                </p>
              </div>
              <button onClick={()=>handleDelete(r.id)} className="text-red-400 hover:text-red-600 text-lg leading-none flex-shrink-0">×</button>
            </div>
          ))}
        </div>

        {/* Add form */}
        {showForm ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-3 border-t border-[var(--color-muted)] pt-4 px-6 pb-6 flex-shrink-0">
            <input
              className="w-full px-3 py-2 rounded-xl border border-[var(--color-muted)] text-sm bg-transparent focus:outline-none focus:border-[var(--color-primary)]"
              placeholder="Titel (z.B. Sport, Yoga, Spazieren…)"
              value={title} onChange={e=>setTitle(e.target.value)} autoFocus required
            />
            {/* Weekday picker */}
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">Wochentag(e)</label>
              <div className="flex gap-1">
                {WEEKDAY_LABELS.map((wd,i)=>(
                  <button key={i} type="button" onClick={()=>toggleWd(i)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors
                      ${weekdays.includes(i)?'text-white':'bg-[var(--color-muted)] text-[var(--color-text-muted)]'}`}
                    style={weekdays.includes(i)?{backgroundColor:color}:{}}
                  >{wd}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Uhrzeit (optional)</label>
                <input type="time" value={timeFrom} onChange={e=>setTimeFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-muted)] text-sm bg-transparent focus:outline-none focus:border-[var(--color-primary)]" />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Farbe</label>
                <div className="flex gap-1 pt-1">
                  {COLOR_OPTIONS.map(c=>(
                    <button key={c.value} type="button" onClick={()=>setColor(c.value)}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                      style={{backgroundColor:c.value, outline: color===c.value?`2px solid ${c.value}`:'none', outlineOffset:'2px'}}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={()=>setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--color-muted)] text-sm text-[var(--color-text-muted)]">Abbrechen</button>
              <button type="submit" disabled={saving||!title.trim()||weekdays.length===0}
                className="flex-1 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium disabled:opacity-50">
                {saving?'…':'Hinzufügen'}
              </button>
            </div>
          </form>
        ) : (
          <div className="px-6 pb-6 flex-shrink-0">
            <button onClick={()=>setShowForm(true)}
              className="w-full py-2.5 border-2 border-dashed border-[var(--color-muted)] rounded-xl text-sm text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors">
              + Wiederkehrender Eintrag
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── day view ────────────────────────────────────────────────────────────────────
function DayView({ dateStr, today, events, onNavigate }: {
  dateStr: string; today: string
  events: CalendarEvent[]
  onNavigate: (e: CalendarEvent) => void
}) {
  const [showForm,  setShowForm]  = useState(false)
  const [title,     setTitle]     = useState('')
  const [timeFrom,  setTimeFrom]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [created,   setCreated]   = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(()=>{ if(showForm) inputRef.current?.focus() },[showForm])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      await createDayPlan({
        title: title.trim(),
        date: dateStr,
        time_from: timeFrom || null,
        time_to: null,
        priority: 2,
        completed: false,
      })
      setCreated(p=>[...p, title.trim()])
      setTitle(''); setTimeFrom('')
      setShowForm(false)
    } finally { setSaving(false) }
  }

  // Separate timed from untimed
  const typeOrder: Record<string,number> = { appointment:0, day_plan:1, task:2 }
  const sorted = [...events].sort((a,b)=>{
    if (a.time_from&&b.time_from) return a.time_from.localeCompare(b.time_from)
    if (a.time_from&&!b.time_from) return -1
    if (!a.time_from&&b.time_from) return 1
    return (typeOrder[a.type]??9)-(typeOrder[b.type]??9)
  })

  const typeLabel = (e: CalendarEvent) =>
    e.type==='day_plan'   ?'Tagesplan'  :
    e.type==='appointment'?'Arzttermin' :
    e.type==='recurring'  ?'↻ Wiederkehrend' :
    e.area_icon?`${e.area_icon} Aufgabe`:'Aufgabe'

  const isToday = dateStr===today
  const navigate = useNavigate()

  return (
    <div className="max-w-lg mx-auto">
      {/* Link to Mein Tag */}
      <div className="flex justify-end mb-2">
        <button onClick={()=>navigate(`/day?date=${dateStr}`)}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--color-muted)]">
          ☀️ In Mein Tag öffnen →
        </button>
      </div>
      {/* Add day plan form */}
      {showForm ? (
        <form onSubmit={handleCreate} className="mb-4 p-3 bg-[var(--color-surface)] border border-[var(--color-primary)] rounded-xl flex flex-col gap-2">
          <input
            ref={inputRef}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-muted)] text-sm bg-transparent focus:outline-none focus:border-[var(--color-primary)]"
            placeholder="Titel des Eintrags…"
            value={title}
            onChange={e=>setTitle(e.target.value)}
            required
          />
          <div className="flex gap-2 items-center">
            <input
              type="time"
              className="px-3 py-2 rounded-lg border border-[var(--color-muted)] text-sm bg-transparent focus:outline-none focus:border-[var(--color-primary)]"
              value={timeFrom}
              onChange={e=>setTimeFrom(e.target.value)}
              placeholder="Uhrzeit (optional)"
            />
            <span className="text-xs text-[var(--color-text-muted)]">optional</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={()=>setShowForm(false)}
              className="flex-1 py-2 rounded-lg border border-[var(--color-muted)] text-sm text-[var(--color-text-muted)]">
              Abbrechen
            </button>
            <button type="submit" disabled={saving||!title.trim()}
              className="flex-1 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium disabled:opacity-50">
              {saving?'…':'Hinzufügen'}
            </button>
          </div>
        </form>
      ) : (
        <button onClick={()=>setShowForm(true)}
          className="w-full mb-4 py-2.5 border-2 border-dashed border-[var(--color-muted)] rounded-xl text-sm text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors">
          + Tagesplan-Eintrag für {isToday?'heute':fromStr(dateStr).getDate()+'. '+MONTHS_S[fromStr(dateStr).getMonth()]}
        </button>
      )}

      {/* Newly created (optimistic) */}
      {created.map((t,i)=>(
        <div key={i} className="flex items-center gap-3 p-3 mb-2 rounded-xl border border-[var(--color-muted)] bg-[var(--color-surface)] opacity-60">
          <span className="w-2 h-2 rounded-full bg-[#6B8F71]" />
          <span className="text-sm">{t}</span>
          <span className="text-xs text-[var(--color-text-muted)] ml-auto">Tagesplan · gerade erstellt</span>
        </div>
      ))}

      {/* Event list */}
      {sorted.length===0&&created.length===0&&(
        <div className="flex flex-col items-center py-12 text-[var(--color-text-muted)] gap-2">
          <span className="text-4xl">📭</span>
          <p className="text-sm">Nichts geplant für diesen Tag</p>
        </div>
      )}
      <div className="flex flex-col gap-2">
        {sorted.map(e=>(
          <button key={e.id} onClick={()=>onNavigate(e)}
            className="flex items-start gap-3 p-3 rounded-xl border border-[var(--color-muted)] hover:border-[var(--color-primary)] hover:bg-[var(--color-muted)] transition-colors text-left w-full">
            <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5" style={{backgroundColor:e.color}} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${e.completed?'line-through text-[var(--color-text-muted)]':''}`}>{e.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {e.time_from&&(
                  <span className="text-xs font-semibold" style={{color:e.color}}>
                    {formatTime(e.time_from)}{e.time_to&&`–${formatTime(e.time_to)}`}
                  </span>
                )}
                <span className="text-xs text-[var(--color-text-muted)]">{typeLabel(e)}</span>
                {e.priority===3&&<span className="text-[10px] text-red-400 font-bold">Hoch</span>}
              </div>
            </div>
            <span className="text-[var(--color-text-muted)] text-xs flex-shrink-0 self-center">›</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── legend ──────────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="flex gap-4 flex-wrap mt-5 px-1">
      {[['#6B8F71','Tagesplan'],['#4A7FA5','Arzttermin'],['#C4A882','Aufgabe fällig']].map(([c,l])=>(
        <div key={l} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:c}} />
          <span className="text-[11px] text-[var(--color-text-muted)]">{l}</span>
        </div>
      ))}
    </div>
  )
}

// ── main page ───────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [view,       setView]       = useState<View>('month')
  const [current,    setCurrent]    = useState(() => new Date())
  const [dayStr,     setDayStr]     = useState(() => toStr(new Date()))
  const [events,     setEvents]     = useState<CalendarEvent[]>([])
  const [loading,    setLoading]    = useState(false)
  const [showRec,    setShowRec]    = useState(false)
  const navigate  = useNavigate()
  const today     = toStr(new Date())

  // compute fetch range
  const range = useMemo(()=>{
    if (view==='month') {
      const cells=monthCells(current.getFullYear(),current.getMonth())
      return { from:toStr(cells[0]), to:toStr(cells[cells.length-1]) }
    }
    if (view==='week') {
      const days=weekDays(current)
      return { from:toStr(days[0]), to:toStr(days[6]) }
    }
    // day: fetch ±7 days buffer so navigating days is instant
    return { from:toStr(addDays(fromStr(dayStr),-7)), to:toStr(addDays(fromStr(dayStr),7)) }
  }, [view, current, dayStr])

  useEffect(()=>{
    setLoading(true)
    fetchCalendarEvents(range.from, range.to)
      .then(setEvents).catch(()=>setEvents([])).finally(()=>setLoading(false))
  }, [range])

  const byDate = useMemo(()=>{
    const map: Record<string,CalendarEvent[]>={}
    for (const e of events) { if(!map[e.date]) map[e.date]=[]; map[e.date].push(e) }
    return map
  }, [events])

  function goToDay(d: string) { setDayStr(d); setView('day') }

  function navPrev() {
    if (view==='month') setCurrent(d=>new Date(d.getFullYear(),d.getMonth()-1,1))
    else if (view==='week') setCurrent(d=>addDays(d,-7))
    else setDayStr(s=>toStr(addDays(fromStr(s),-1)))
  }
  function navNext() {
    if (view==='month') setCurrent(d=>new Date(d.getFullYear(),d.getMonth()+1,1))
    else if (view==='week') setCurrent(d=>addDays(d,7))
    else setDayStr(s=>toStr(addDays(fromStr(s),1)))
  }
  function goToday() { const t=new Date(); setCurrent(t); setDayStr(today) }

  const headerTitle = useMemo(()=>{
    if (view==='month') return `${MONTHS[current.getMonth()]} ${current.getFullYear()}`
    if (view==='week') {
      const days=weekDays(current), from=days[0], to=days[6]
      if (from.getMonth()===to.getMonth())
        return `${from.getDate()}–${to.getDate()}. ${MONTHS_S[from.getMonth()]} ${from.getFullYear()}`
      return `${from.getDate()}. ${MONTHS_S[from.getMonth()]} – ${to.getDate()}. ${MONTHS_S[to.getMonth()]}`
    }
    return formatDayLong(dayStr)
  },[view,current,dayStr])

  function handleNavigateEvent(e: CalendarEvent) {
    if (e.type==='task'&&e.area_slug) navigate(`/${e.area_slug}?edit=${e.source_id}`)
    else if (e.type==='day_plan') navigate('/day')
    else if (e.type==='appointment') navigate('/health/doctors')
  }

  const dayEvents = byDate[dayStr]??[]

  return (
    <div className="flex flex-col min-h-full">
      {showRec && (
        <RecurringManager onClose={() => { setShowRec(false); setEvents([]); setLoading(true); fetchCalendarEvents(range.from, range.to).then(setEvents).finally(()=>setLoading(false)) }} />
      )}

      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg)] border-b border-[var(--color-muted)] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl" style={{fontFamily:'Cormorant Garamond, serif'}}>Kalender</h1>
          <div className="flex items-center gap-2">
          <button onClick={()=>setShowRec(true)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-muted)] text-[var(--color-text-muted)] hover:bg-[var(--color-muted)] transition-colors"
            title="Wiederkehrende Einträge verwalten">↻</button>
          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden border border-[var(--color-muted)]">
            {(['month','week','day'] as View[]).map((v,i)=>(
              <button key={v} onClick={()=>{ if(v==='day') setDayStr(view==='month'||view==='week'?today:dayStr); setView(v) }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${i>0?'border-l border-[var(--color-muted)]':''}
                  ${view===v?'bg-[var(--color-primary)] text-white':'text-[var(--color-text-muted)] hover:bg-[var(--color-muted)]'}`}>
                {v==='month'?'Monat':v==='week'?'Woche':'Tag'}
              </button>
            ))}
          </div>
          </div>
        </div>
        {/* Nav row */}
        <div className="flex items-center justify-between">
          <button onClick={navPrev} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--color-muted)] text-[var(--color-text-muted)] text-xl transition-colors">‹</button>
          <div className="flex items-center gap-2">
            <button onClick={goToday} className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-muted)] text-[var(--color-text-muted)] hover:bg-[var(--color-muted)] transition-colors">Heute</button>
            <span className="text-sm font-semibold text-[var(--color-text)] min-w-[180px] text-center">{headerTitle}</span>
          </div>
          <button onClick={navNext} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--color-muted)] text-[var(--color-text-muted)] text-xl transition-colors">›</button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-3 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="grid grid-cols-7 gap-0.5 mt-2">
            {Array.from({length:35}).map((_,i)=>(
              <div key={i} className="h-12 bg-[var(--color-muted)] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : view==='month' ? (
          <>
            <MonthView current={current} today={today} byDate={byDate} onDay={goToDay} />
            <Legend />
          </>
        ) : view==='week' ? (
          <>
            <WeekView current={current} today={today} byDate={byDate} onDay={goToDay} />
            <Legend />
          </>
        ) : (
          <DayView
            dateStr={dayStr}
            today={today}
            events={dayEvents}
            onNavigate={handleNavigateEvent}
          />
        )}
      </div>
    </div>
  )
}
