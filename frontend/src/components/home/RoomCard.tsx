import { HomeRoom, HomeTask } from '../../api/home'
import ProgressBar from '../ui/ProgressBar'

interface Props {
  room: HomeRoom
  tasks: HomeTask[]
  onClick: () => void
}

function roomProgress(tasks: HomeTask[]): number {
  if (tasks.length === 0) return 100
  const ok = tasks.filter((t) => t.status === 'ok').length
  return Math.round((ok / tasks.length) * 100)
}

export default function RoomCard({ room, tasks, onClick }: Props) {
  const pct = roomProgress(tasks)
  const overdueCount = tasks.filter((t) => t.status === 'overdue').length
  const dueSoonCount = tasks.filter((t) => t.status === 'due_soon').length

  let statusColor = 'var(--color-primary)'
  if (overdueCount > 0) statusColor = '#ef4444'
  else if (dueSoonCount > 0) statusColor = '#f59e0b'

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[var(--color-surface)] rounded-2xl p-4 shadow-[var(--shadow-card)] hover:shadow-md transition-shadow active:scale-95"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{room.icon ?? '🏠'}</span>
        <span className="text-xs font-semibold" style={{ color: statusColor }}>
          {pct}%
        </span>
      </div>

      <p className="text-sm font-medium mb-2">{room.name}</p>

      <ProgressBar value={pct} color={statusColor} height={4} />

      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-[var(--color-text-muted)]">{tasks.length} Aufgaben</span>
        {overdueCount > 0 && (
          <span className="text-xs text-red-500 font-medium">{overdueCount} überfällig</span>
        )}
        {overdueCount === 0 && dueSoonCount > 0 && (
          <span className="text-xs text-amber-500 font-medium">{dueSoonCount} bald fällig</span>
        )}
      </div>
    </button>
  )
}
