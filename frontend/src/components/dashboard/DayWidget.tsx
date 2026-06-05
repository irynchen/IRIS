import { useEffect, useState } from 'react'
import { DayTask, fetchTasks, CATEGORIES } from '../../api/day'
import ProgressBar from '../ui/ProgressBar'

export default function DayWidget() {
  const [tasks, setTasks] = useState<DayTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    fetchTasks(today)
      .then(setTasks)
      .finally(() => setLoading(false))
  }, [])

  const total = tasks.length
  const done = tasks.filter((t) => t.completed).length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  const next = tasks.find((t) => !t.completed)
  const cat = next ? CATEGORIES[next.category ?? ''] : null

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-2 bg-[var(--color-muted)] rounded-full mb-2" />
        <div className="h-3 bg-[var(--color-muted)] rounded-full w-2/3" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-[var(--color-text-muted)]">Heute</span>
        <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
          {done}/{total}
        </span>
      </div>
      <ProgressBar value={pct} color={pct === 100 ? 'var(--color-primary)' : 'var(--color-secondary)'} height={4} />
      {next && (
        <div className="flex items-center gap-1.5 mt-2">
          {cat && <span className="text-sm">{cat.icon}</span>}
          <p className="text-xs text-[var(--color-text-muted)] truncate">{next.title}</p>
        </div>
      )}
      {total === 0 && <p className="text-xs text-[var(--color-text-muted)] mt-2">Keine Aufgaben heute</p>}
      {total > 0 && done === total && (
        <p className="text-xs text-[var(--color-primary)] font-medium mt-2">Alles erledigt! 🎉</p>
      )}
    </div>
  )
}
