import { useEffect, useState } from 'react'
import { HomeTask, fetchTodayTasks } from '../../api/home'

export default function HomeWidget() {
  const [tasks, setTasks] = useState<HomeTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTodayTasks()
      .then(setTasks)
      .finally(() => setLoading(false))
  }, [])

  const overdueCount = tasks.filter((t) => t.status === 'overdue').length
  const visible = tasks.slice(0, 3)

  if (loading) {
    return (
      <div className="animate-pulse space-y-1.5">
        <div className="h-3 bg-[var(--color-muted)] rounded-full w-1/2" />
        <div className="h-3 bg-[var(--color-muted)] rounded-full w-3/4" />
      </div>
    )
  }

  if (tasks.length === 0) {
    return <p className="text-xs text-[var(--color-primary)] font-medium">Alles sauber! ✨</p>
  }

  return (
    <div>
      {overdueCount > 0 && (
        <p className="text-xs text-red-500 font-medium mb-1.5">{overdueCount} überfällig</p>
      )}
      <div className="flex flex-col gap-1">
        {visible.map((t) => (
          <div key={t.id} className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: t.status === 'overdue' ? '#ef4444' : '#f59e0b' }}
            />
            <p className="text-xs text-[var(--color-text-muted)] truncate">{t.title}</p>
          </div>
        ))}
        {tasks.length > 3 && (
          <p className="text-xs text-[var(--color-text-muted)]">+{tasks.length - 3} weitere</p>
        )}
      </div>
    </div>
  )
}
