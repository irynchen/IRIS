import { DayTask, CATEGORIES } from '../../api/day'
import ProgressBar from '../ui/ProgressBar'

interface Props {
  tasks: DayTask[]
}

export default function DayFocus({ tasks }: Props) {
  const total = tasks.length
  const done = tasks.filter((t) => t.completed).length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  const next = tasks.find((t) => !t.completed && t.time_from)
  const cat = next ? CATEGORIES[next.category ?? ''] : null

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl p-4 shadow-[var(--shadow-card)] mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
          Fortschritt
        </span>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
          {done}/{total}
        </span>
      </div>
      <ProgressBar
        value={pct}
        color={pct === 100 ? 'var(--color-primary)' : 'var(--color-secondary)'}
      />

      {next && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">Nächstes:</span>
          {cat && <span className="text-sm">{cat.icon}</span>}
          <span className="text-sm font-medium truncate">{next.title}</span>
          {next.time_from && (
            <span className="text-xs text-[var(--color-text-muted)] ml-auto flex-shrink-0">
              {next.time_from.slice(0, 5)}
            </span>
          )}
        </div>
      )}

      {total > 0 && done === total && (
        <p className="text-sm text-[var(--color-primary)] font-medium mt-2 text-center">
          Alles erledigt! 🎉
        </p>
      )}
    </div>
  )
}
