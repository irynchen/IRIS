import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SmartTask, SmartDayResponse, fetchSmartDay, markSmartTaskDone } from '../../api/dashboard'

const SLOT_ORDER = ['overdue', 'important', 'quick', 'low_energy']

function formatDue(d: string | null): string {
  if (!d) return ''
  const date = new Date(d + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return `seit ${Math.abs(diff)} Tag${Math.abs(diff) === 1 ? '' : 'en'}`
  if (diff === 0) return 'heute'
  if (diff === 1) return 'morgen'
  return `in ${diff} Tagen`
}

export default function SmartDay() {
  const [data,    setData]    = useState<SmartDayResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [done,    setDone]    = useState<Set<number>>(new Set())
  const navigate = useNavigate()

  useEffect(() => {
    fetchSmartDay()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  async function handleDone(task: SmartTask) {
    setDone((prev) => new Set(prev).add(task.id))
    try { await markSmartTaskDone(task) } catch { /* optimistic */ }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map((i) => (
          <div key={i} className="h-14 bg-[var(--color-muted)] rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data || data.tasks.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-3xl mb-2">✨</p>
        <p className="text-sm text-[var(--color-text-muted)]">Keine dringenden Aufgaben</p>
      </div>
    )
  }

  // group by slot in defined order
  const bySlot = new Map<string, SmartTask[]>()
  for (const s of SLOT_ORDER) bySlot.set(s, [])
  for (const t of data.tasks) {
    bySlot.get(t.slot)?.push(t)
  }

  const visibleTasks = data.tasks.filter((t) => !done.has(t.id))

  return (
    <div className="flex flex-col gap-1.5">
      {SLOT_ORDER.flatMap((slot) => {
        const tasks = (bySlot.get(slot) ?? []).filter((t) => !done.has(t.id))
        return tasks.map((task, i) => {
          const isFirstInSlot = i === 0
          return (
            <div
              key={task.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-muted)] hover:border-[var(--color-primary)] transition-colors group"
            >
              {/* Slot icon — only for first in group */}
              <span className="text-base w-5 text-center flex-shrink-0">
                {isFirstInSlot ? task.slot_icon : ''}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.title}</p>
                <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                  {isFirstInSlot && (
                    <span className="text-[var(--color-primary)] font-medium mr-1.5">
                      {task.slot_label}
                    </span>
                  )}
                  <span
                    className="cursor-pointer hover:text-[var(--color-accent)] transition-colors"
                    onClick={() => navigate(`/${task.area_slug}`)}
                  >
                    {task.area_icon} {task.area_name}
                  </span>
                  {task.next_due && (
                    <span className="ml-1.5 text-amber-500">{formatDue(task.next_due)}</span>
                  )}
                </p>
              </div>

              {/* Edit button */}
              <button
                onClick={() => navigate(`/${task.area_slug}?edit=${task.id}`)}
                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
                title="Bearbeiten"
              >✏️</button>

              {/* Done button */}
              <button
                onClick={() => handleDone(task)}
                className="flex-shrink-0 w-7 h-7 rounded-lg border border-[var(--color-muted)] flex items-center justify-center text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-primary)] hover:text-white hover:border-[var(--color-primary)] transition-all"
                title="Erledigt"
              >✓</button>
            </div>
          )
        })
      })}

      {/* Health nudge */}
      {data && !data.health_logged_today && (
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-green-200 bg-green-50 cursor-pointer hover:border-green-400 transition-colors mt-1"
          onClick={() => navigate('/health')}
        >
          <span className="text-base w-5 text-center flex-shrink-0">💚</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Gesundheitsdaten eintragen</p>
            <p className="text-[11px] text-green-600">Heute noch nicht protokolliert</p>
          </div>
          <span className="text-green-400 text-xs">→</span>
        </div>
      )}

      {/* Overdue total hint */}
      {data.overdue_total > visibleTasks.filter((t) => t.slot === 'overdue').length + (done.size > 0 ? 0 : 0) && (
        <button
          onClick={() => navigate('/home')}
          className="text-xs text-[var(--color-text-muted)] text-center py-1.5 hover:text-[var(--color-primary)] transition-colors"
        >
          {data.overdue_total} überfällige Aufgaben gesamt → Zuhause
        </button>
      )}
    </div>
  )
}
