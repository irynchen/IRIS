import { HomeTask } from '../../api/home'

interface Props {
  task: HomeTask
  onDone: () => void
  onDelete: () => void
  onEdit: () => void
}

const STATUS_CONFIG = {
  ok:       { color: 'var(--color-primary)', label: '' },
  due_soon: { color: '#f59e0b',              label: 'bald fällig' },
  overdue:  { color: '#ef4444',              label: 'überfällig' },
}

const PRIORITY_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  3: { label: 'Hoch',    color: '#ef4444', bg: '#ef444418' },
  2: { label: 'Mittel',  color: '#f59e0b', bg: '#f59e0b18' },
  1: { label: 'Niedrig', color: '#6B8F71', bg: '#6B8F7118' },
}

const DURATION_ICON: Record<string, string> = {
  short:  '⚡',
  medium: '🕐',
  long:   '⏳',
}

const ENERGY_ICON: Record<string, string> = {
  low:    '🌿',
  medium: '💛',
  high:   '🔥',
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
  const prio = PRIORITY_CONFIG[task.priority]
  const hasMeta = task.duration || task.energy_level || task.priority !== 2

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[var(--color-muted)] last:border-0">
      {/* Status-Punkt */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
        style={{ backgroundColor: cfg.color }}
      />

      <div className="flex-1 min-w-0">
        {/* Titel + Status-Label */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate">{task.title}</p>
          {cfg.label && (
            <span className="text-xs flex-shrink-0" style={{ color: cfg.color }}>
              {cfg.label}
            </span>
          )}
        </div>

        {/* Meta-Badges */}
        {hasMeta && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {prio && task.priority !== 2 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ color: prio.color, background: prio.bg }}
              >
                {prio.label}
              </span>
            )}
            {task.duration && (
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {DURATION_ICON[task.duration]}
              </span>
            )}
            {task.energy_level && (
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {ENERGY_ICON[task.energy_level]}
              </span>
            )}
          </div>
        )}

        {/* Datumsinfo */}
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
