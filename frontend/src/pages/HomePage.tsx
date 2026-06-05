import React, { useEffect, useState } from 'react'
import api from '../api/client'
import Card from '../components/ui/Card'
import LoadingSpinner from '../components/ui/LoadingSpinner'

interface Room {
  id: number
  name: string
  icon: string | null
  sort_order: number
}

interface Task {
  id: number
  room_id: number
  title: string
  frequency_days: number | null
  last_done: string | null
  next_due: string | null
  priority: number
  notes: string | null
}

const TODAY = new Date().toISOString().slice(0, 10)

function isOverdue(task: Task): boolean {
  return !!task.next_due && task.next_due < TODAY
}

function cleanlinessProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 100
  const ok = tasks.filter((t) => !isOverdue(t)).length
  return Math.round((ok / tasks.length) * 100)
}

function formatLastDone(dateStr: string | null): string {
  if (!dateStr) return 'noch nie'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

export default function HomePage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [tasksByRoom, setTasksByRoom] = useState<Record<number, Task[]>>({})
  const [openRoomId, setOpenRoomId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddTask, setShowAddTask] = useState(false)
  const [addForm, setAddForm] = useState({ room_id: 0, title: '', frequency_days: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [roomsRes, tasksRes] = await Promise.all([
        api.get<Room[]>('/home/rooms'),
        api.get<Task[]>('/home/tasks'),
      ])
      setRooms(roomsRes.data)
      const byRoom: Record<number, Task[]> = {}
      for (const t of tasksRes.data) {
        if (!byRoom[t.room_id]) byRoom[t.room_id] = []
        byRoom[t.room_id].push(t)
      }
      setTasksByRoom(byRoom)
    } catch {
      setError('Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function markDone(task: Task) {
    try {
      const res = await api.patch<Task>(`/home/tasks/${task.id}`, { last_done: TODAY })
      setTasksByRoom((prev) => ({
        ...prev,
        [task.room_id]: prev[task.room_id].map((t) => (t.id === task.id ? res.data : t)),
      }))
    } catch {
      // silently fail
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.title.trim() || !addForm.room_id) return
    setSaving(true)
    try {
      const res = await api.post<Task>('/home/tasks', {
        room_id: addForm.room_id,
        title: addForm.title.trim(),
        frequency_days: addForm.frequency_days ? Number(addForm.frequency_days) : null,
      })
      setTasksByRoom((prev) => ({
        ...prev,
        [res.data.room_id]: [...(prev[res.data.room_id] ?? []), res.data],
      }))
      setShowAddTask(false)
      setAddForm({ room_id: 0, title: '', frequency_days: '' })
    } catch {
      setError('Fehler beim Hinzufügen')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTask(task: Task) {
    try {
      await api.delete(`/home/tasks/${task.id}`)
      setTasksByRoom((prev) => ({
        ...prev,
        [task.room_id]: prev[task.room_id].filter((t) => t.id !== task.id),
      }))
    } catch {
      // silently fail
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <LoadingSpinner size={36} />
      </div>
    )
  }

  if (error) {
    return <p className="text-red-400 text-center p-8">{error}</p>
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Zuhause
        </h1>
        <button
          onClick={() => { setShowAddTask(true); setAddForm({ ...addForm, room_id: rooms[0]?.id ?? 0 }) }}
          className="bg-[var(--color-primary)] text-white rounded-full w-10 h-10 flex items-center justify-center text-xl font-light hover:opacity-90 transition-opacity"
          aria-label="Aufgabe hinzufügen"
        >
          +
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {rooms.map((room) => {
          const tasks = tasksByRoom[room.id] ?? []
          const progress = cleanlinessProgress(tasks)
          const overdueTasks = tasks.filter(isOverdue)
          const isOpen = openRoomId === room.id

          return (
            <Card key={room.id} onClick={() => setOpenRoomId(isOpen ? null : room.id)}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{room.icon ?? '🏠'}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{room.name}</p>
                    <span className="text-xs text-[var(--color-text-muted)]">{progress}%</span>
                  </div>
                  <div className="w-full bg-[var(--color-muted)] rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: progress === 100 ? 'var(--color-primary)' : 'var(--color-secondary)',
                      }}
                    />
                  </div>
                  {overdueTasks.length > 0 && (
                    <p className="text-xs text-amber-500 mt-1">
                      {overdueTasks.length} überfällig
                    </p>
                  )}
                </div>
                <span className="text-[var(--color-text-muted)] text-sm">{isOpen ? '▾' : '›'}</span>
              </div>

              {isOpen && (
                <div className="mt-4 border-t border-[var(--color-muted)] pt-3 flex flex-col gap-2">
                  {tasks.length === 0 && (
                    <p className="text-xs text-[var(--color-text-muted)] text-center py-2">
                      Noch keine Aufgaben
                    </p>
                  )}
                  {tasks.map((task) => {
                    const overdue = isOverdue(task)
                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 py-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${overdue ? 'text-amber-600' : ''}`}>
                            {task.title}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            Zuletzt: {formatLastDone(task.last_done)}
                            {task.frequency_days ? ` · alle ${task.frequency_days} Tage` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => markDone(task)}
                          className="text-xs px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
                        >
                          Erledigt heute
                        </button>
                        <button
                          onClick={() => deleteTask(task)}
                          className="text-[var(--color-text-muted)] hover:text-red-400 transition-colors w-6 h-6 flex items-center justify-center text-lg"
                          aria-label="Löschen"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Add task modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Putzaufgabe hinzufügen
            </h2>
            <form onSubmit={addTask} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Raum</label>
                <select
                  className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-white"
                  value={addForm.room_id}
                  onChange={(e) => setAddForm({ ...addForm, room_id: Number(e.target.value) })}
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.icon} {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm"
                placeholder="Aufgabe (z.B. Boden wischen)"
                value={addForm.title}
                onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                autoFocus
                required
              />
              <input
                type="number"
                className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm"
                placeholder="Wiederholung in Tagen (optional)"
                value={addForm.frequency_days}
                min={1}
                onChange={(e) => setAddForm({ ...addForm, frequency_days: e.target.value })}
              />
              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="flex-1 py-3 rounded-xl border border-[var(--color-muted)] text-sm font-medium"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium disabled:opacity-60"
                >
                  {saving ? 'Speichern...' : 'Hinzufügen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
