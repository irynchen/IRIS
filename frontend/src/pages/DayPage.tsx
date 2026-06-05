import { useEffect, useRef, useState } from 'react'
import { useDayStore } from '../store/dayStore'
import Timeline from '../components/day/Timeline'
import TaskForm from '../components/day/TaskForm'
import DayFocus from '../components/day/DayFocus'
import TaskCard from '../components/day/TaskCard'
import EmptyState from '../components/ui/EmptyState'
import SkeletonCard from '../components/ui/SkeletonCard'
import { CATEGORIES } from '../api/day'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function formatShort(dateStr: string): { weekday: string; day: string } {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    weekday: d.toLocaleDateString('de-DE', { weekday: 'short' }),
    day: String(d.getDate()),
  }
}

function formatLong(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function buildDateRange(center: string): string[] {
  return [-3, -2, -1, 0, 1, 2, 3].map((n) => addDays(center, n))
}

type ViewMode = 'timeline' | 'list'

export default function DayPage() {
  const { tasks, loading, error, currentDate, setDate, load, toggle, add, remove } = useDayStore()
  const [showForm, setShowForm] = useState(false)
  const [view, setView] = useState<ViewMode>('timeline')
  const today = todayStr()
  const stripRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load(currentDate)
  }, [currentDate])

  // scroll date strip so active is centered
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [currentDate])

  const dates = buildDateRange(currentDate)

  async function handleAdd(form: {
    title: string
    time_from: string
    time_to: string
    category: string
    priority: number
    notes: string
    repeat_days: string
  }) {
    await add({
      date: currentDate,
      title: form.title.trim(),
      time_from: form.time_from || null,
      time_to: form.time_to || null,
      category: form.category,
      priority: form.priority,
      notes: form.notes || null,
      repeat_days: form.repeat_days ? Number(form.repeat_days) : null,
    })
  }

  const incomplete = tasks.filter((t) => !t.completed)
  const completed = tasks.filter((t) => t.completed)

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg)] border-b border-[var(--color-muted)] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Mein Tag
          </h1>
          <div className="flex items-center gap-2">
            {/* view toggle */}
            <div className="flex bg-[var(--color-muted)] rounded-lg p-0.5">
              {(['timeline', 'list'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    view === v
                      ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-text)]'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  {v === 'timeline' ? '⏱' : '☰'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-[var(--color-primary)] text-white rounded-full w-9 h-9 flex items-center justify-center text-lg font-light hover:opacity-90 transition-opacity"
            >
              +
            </button>
          </div>
        </div>

        {/* Date strip */}
        <div ref={stripRef} className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {dates.map((d) => {
            const { weekday, day } = formatShort(d)
            const isActive = d === currentDate
            const isToday = d === today
            return (
              <button
                key={d}
                data-active={isActive}
                onClick={() => setDate(d)}
                className={`flex flex-col items-center min-w-[48px] py-2 px-1 rounded-xl transition-all flex-shrink-0 ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-muted)]'
                }`}
              >
                <span className="text-xs uppercase tracking-wide">{weekday}</span>
                <span className={`text-base font-semibold ${isToday && !isActive ? 'text-[var(--color-primary)]' : ''}`}>
                  {day}
                </span>
                {isToday && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-0.5" />
                )}
              </button>
            )
          })}
        </div>

        {currentDate !== today && (
          <button
            onClick={() => setDate(today)}
            className="mt-2 text-xs text-[var(--color-primary)] font-medium"
          >
            ← Heute
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} lines={2} />)}
          </div>
        ) : error ? (
          <p className="text-red-400 text-sm text-center mt-10">{error}</p>
        ) : (
          <>
            {tasks.length > 0 && <DayFocus tasks={tasks} />}

            {view === 'timeline' ? (
              <Timeline tasks={tasks} onToggle={toggle} onDelete={remove} />
            ) : (
              <div>
                {tasks.length === 0 && (
                  <EmptyState icon="☀️" message="Keine Aufgaben" sub="Genieße deinen Tag!" />
                )}
                <div className="flex flex-col gap-2">
                  {incomplete.map((t) => (
                    <TaskCard key={t.id} task={t} onToggle={toggle} onDelete={remove} />
                  ))}
                </div>

                {completed.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-[var(--color-text-muted)] mb-2 font-medium uppercase tracking-wide">
                      Erledigt ({completed.length})
                    </p>
                    <div className="flex flex-col gap-2 opacity-60">
                      {completed.map((t) => (
                        <TaskCard key={t.id} task={t} onToggle={toggle} onDelete={remove} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <TaskForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleAdd}
        date={currentDate}
      />
    </div>
  )
}
