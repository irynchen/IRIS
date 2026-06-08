import { HomeRoom, HomeTask } from '../../api/home'

interface Props {
  tasks: HomeTask[]
  rooms: HomeRoom[]
  onDone: (taskId: number, roomId: number) => void
}

function formatDate(d: string | null): string {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

export default function TodayBlock({ tasks, rooms, onDone }: Props) {
  if (tasks.length === 0) return null

  const roomMap = new Map(rooms.map((r) => [r.id, r]))
  const overdue = tasks.filter((t) => t.status === 'overdue')
  const dueSoon = tasks.filter((t) => t.status === 'due_soon')

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
      <p className="text-sm font-semibold text-amber-800 mb-3">
        {overdue.length > 0 ? '⚠️ Aufmerksamkeit erforderlich' : '📋 Bald fällig'}
      </p>
      <div className="flex flex-col gap-2">
        {[...overdue, ...dueSoon].map((task) => {
          const room = roomMap.get(task.room_id)
          return (
            <div key={task.id} className="flex items-center gap-3">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: task.status === 'overdue' ? '#ef4444' : '#f59e0b' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.title}</p>
                <p className="text-xs text-amber-600">
                  {room && <span className="text-amber-700 font-medium">{room.icon} {room.name} · </span>}
                  {task.next_due
                    ? (task.status === 'overdue' ? 'Fällig seit ' : 'Fällig am ') + formatDate(task.next_due)
                    : 'kein Fälligkeitsdatum'}
                </p>
              </div>
              <button
                onClick={() => onDone(task.id, task.room_id)}
                className="text-xs px-2.5 py-1.5 bg-amber-500 text-white rounded-lg font-medium flex-shrink-0 hover:opacity-80 transition-opacity"
              >
                ✓ Erledigt
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
