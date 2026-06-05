import { DayTask } from '../../api/day'
import TaskCard from './TaskCard'
import EmptyState from '../ui/EmptyState'

interface Props {
  tasks: DayTask[]
  onToggle: (id: number) => void
  onDelete: (id: number) => void
  onEdit?: (task: DayTask) => void
}

export default function Timeline({ tasks, onToggle, onDelete, onEdit }: Props) {
  const timed = tasks.filter((t) => t.time_from)
  const untimed = tasks.filter((t) => !t.time_from)

  if (tasks.length === 0) {
    return <EmptyState icon="☀️" message="Keine Aufgaben" sub="Entspann dich oder plane etwas Schönes." />
  }

  return (
    <div className="flex flex-col gap-6">
      {timed.length > 0 && (
        <div className="flex flex-col gap-2">
          {timed.map((task) => (
            <div key={task.id} className="flex gap-3 items-start">
              <div className="w-12 flex-shrink-0 text-right">
                <span className="text-xs text-[var(--color-text-muted)] font-mono">
                  {task.time_from?.slice(0, 5)}
                </span>
              </div>
              <div className="flex-1">
                <TaskCard task={task} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />
              </div>
            </div>
          ))}
        </div>
      )}

      {untimed.length > 0 && (
        <div>
          <p className="text-xs text-[var(--color-text-muted)] font-medium mb-2 uppercase tracking-wide">
            Ohne Zeit
          </p>
          <div className="flex flex-col gap-2">
            {untimed.map((task) => (
              <TaskCard key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
