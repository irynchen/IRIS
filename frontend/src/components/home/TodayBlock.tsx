import { useState } from 'react'
import { HomeRoom, HomeTask, HomeCategory } from '../../api/home'

interface Props {
  tasks: HomeTask[]
  rooms: HomeRoom[]
  categories: HomeCategory[]
  onDone: (taskId: number, roomId: number) => void
  onEdit: (task: HomeTask) => void
}

type SortKey = 'due' | 'priority' | 'room' | 'category' | 'duration' | 'energy'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'due',      label: 'Frist' },
  { value: 'priority', label: 'Priorität' },
  { value: 'room',     label: 'Raum' },
  { value: 'category', label: 'Kategorie' },
  { value: 'duration', label: 'Dauer' },
  { value: 'energy',   label: 'Energie' },
]

const DURATION_ORDER: Record<string, number> = { short: 0, short30: 1, medium: 2, long: 3, very_long: 4 }
const ENERGY_ORDER:   Record<string, number> = { low: 0, medium: 1, high: 2 }
const INITIAL_LIMIT = 5

function formatDate(d: string | null): string {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

function sortTasks(
  tasks: HomeTask[], key: SortKey,
  roomMap: Map<number, HomeRoom>, catMap: Map<number, HomeCategory>,
): HomeTask[] {
  return [...tasks].sort((a, b) => {
    switch (key) {
      case 'due':
        if (!a.next_due && !b.next_due) return 0
        if (!a.next_due) return 1
        if (!b.next_due) return -1
        return a.next_due < b.next_due ? -1 : 1
      case 'priority':
        return b.priority - a.priority
      case 'room': {
        const ra = roomMap.get(a.room_id)?.name ?? ''
        const rb = roomMap.get(b.room_id)?.name ?? ''
        return ra.localeCompare(rb, 'de')
      }
      case 'category': {
        const ca = catMap.get(a.category_id ?? -1)?.name ?? 'zzz'
        const cb = catMap.get(b.category_id ?? -1)?.name ?? 'zzz'
        return ca.localeCompare(cb, 'de')
      }
      case 'duration': {
        const da = a.duration ? (DURATION_ORDER[a.duration] ?? 99) : 99
        const db = b.duration ? (DURATION_ORDER[b.duration] ?? 99) : 99
        return da - db
      }
      case 'energy': {
        const ea = a.energy_level ? (ENERGY_ORDER[a.energy_level] ?? 99) : 99
        const eb = b.energy_level ? (ENERGY_ORDER[b.energy_level] ?? 99) : 99
        return ea - eb
      }
      default: return 0
    }
  })
}

export default function TodayBlock({ tasks, rooms, categories, onDone, onEdit }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [expanded,  setExpanded]  = useState(false)
  const [sortKey,   setSortKey]   = useState<SortKey>('due')

  if (tasks.length === 0) return null

  const roomMap = new Map(rooms.map((r) => [r.id, r]))
  const catMap  = new Map(categories.map((c) => [c.id, c]))
  const overdue = tasks.filter((t) => t.status === 'overdue')
  const dueSoon = tasks.filter((t) => t.status === 'due_soon')
  const ordered = sortTasks([...overdue, ...dueSoon], sortKey, roomMap, catMap)
  const visible = expanded ? ordered : ordered.slice(0, INITIAL_LIMIT)
  const hidden  = ordered.length - INITIAL_LIMIT

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl mb-4 overflow-hidden">

      {/* Header — click to collapse */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        onClick={() => setCollapsed((v) => !v)}
      >
        <p className="text-sm font-semibold text-amber-800">
          {overdue.length > 0 ? '⚠️ Aufmerksamkeit erforderlich' : '📋 Bald fällig'}
          <span className="ml-2 font-normal text-amber-600">({tasks.length})</span>
        </p>
        <div className="flex items-center gap-2">
          {!collapsed && (
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] py-1 px-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 focus:outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
          <span className="text-amber-500 text-xs font-bold">{collapsed ? '▸' : '▾'}</span>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="flex flex-col gap-2">
            {visible.map((task) => {
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
                    onClick={() => onEdit(task)}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] w-7 h-7 flex items-center justify-center text-sm flex-shrink-0 transition-colors"
                  >✏️</button>
                  <button
                    onClick={() => onDone(task.id, task.room_id)}
                    className="text-xs px-2.5 py-1.5 bg-amber-500 text-white rounded-lg font-medium flex-shrink-0 hover:opacity-80 transition-opacity"
                  >✓ Erledigt</button>
                </div>
              )
            })}
          </div>

          {!expanded && hidden > 0 && (
            <button onClick={() => setExpanded(true)} className="mt-3 w-full py-1.5 text-xs text-amber-700 font-medium hover:text-amber-900 transition-colors">
              + {hidden} weitere anzeigen
            </button>
          )}
          {expanded && ordered.length > INITIAL_LIMIT && (
            <button onClick={() => setExpanded(false)} className="mt-3 w-full py-1.5 text-xs text-amber-700 font-medium hover:text-amber-900 transition-colors">
              ↑ Weniger anzeigen
            </button>
          )}
        </div>
      )}
    </div>
  )
}
