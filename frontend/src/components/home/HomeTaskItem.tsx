import { HomeTask } from '../../api/home'

interface Props {
  task: HomeTask
  onDone: () => void
  onDelete: () => void
  onEdit: () => void
}

const STATUS_CONFIG = {
  ok:       { color: 'var(--color-primary)', dot: '●', label: '' },
  due_soon: { color: '#f59e0b',              dot: '●', label: 'bald fällig' },
  overdue:  { color: '#ef4444',              dot: '●', label: 'überfällig' },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'noch nie'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
  })
}

export default function HomeTaskItem({ task, onDone, onDelete, onEdit }: Props) {
  const cfg = STATUS_CONFIG[task.status]

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[var(--color-muted)] last:border-0">
      <div
        className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
        style={{ backgroundColor: cfg.color }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{task.title}</p>
          {cfg.label && (
            <span className="text-xs flex-shrink-0" style={{ color: cfg.color }}>
              {cfg.label}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Zuletzt: {formatDate(task.last_done)}
          {task.frequency_days ? ` · alle ${task.frequency_days} Tage` : ''}
          {task.next_due ? ` · nächste: ${formatDate(task.next_due)}` : ''}
        </p>
      </div>

      <button
        onClick={onDone}
        className="text-xs px-3 py-1.5 rounded-lg text-white font-medium transition-opacity hover:opacity-80 flex-shrink-0"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        ✓ Heute
      </button>

      <button
        onClick={onEdit}
        className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] w-7 h-7 flex items-center justify-center text-sm transition-colors"
        title="Bearbeiten"
      >
        ✏️
      </button>

      <button
        onClick={onDelete}
        className="text-[var(--color-text-muted)] hover:text-red-400 w-7 h-7 flex items-center justify-center text-lg transition-colors"
      >
        ×
      </button>
    </div>
  )
}
