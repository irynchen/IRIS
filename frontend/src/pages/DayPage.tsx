import React, { useEffect, useState } from 'react'
import api from '../api/client'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'

interface DayTask {
  id: number
  date: string
  time_from: string | null
  time_to: string | null
  title: string
  category: string | null
  priority: number
  completed: boolean
  notes: string | null
}

interface NewTaskForm {
  title: string
  time_from: string
  time_to: string
  category: string
  priority: number
  notes: string
}

const CATEGORIES = ['work', 'health', 'home', 'learning', 'rest', 'food']

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatDisplayDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function DayPage() {
  const [currentDate, setCurrentDate] = useState(dateStr(new Date()))
  const [tasks, setTasks] = useState<DayTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<NewTaskForm>({
    title: '',
    time_from: '',
    time_to: '',
    category: 'work',
    priority: 2,
    notes: '',
  })

  async function loadTasks(date: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<DayTask[]>(`/day/plans?date=${date}`)
      setTasks(res.data)
    } catch {
      setError('Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks(currentDate)
  }, [currentDate])

  function shiftDate(days: number) {
    const d = new Date(currentDate + 'T00:00:00')
    d.setDate(d.getDate() + days)
    setCurrentDate(dateStr(d))
  }

  async function toggleComplete(task: DayTask) {
    try {
      await api.patch(`/day/plans/${task.id}`, { completed: !task.completed })
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
      )
    } catch {
      // silently fail
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const payload = {
        date: currentDate,
        title: form.title.trim(),
        time_from: form.time_from || null,
        time_to: form.time_to || null,
        category: form.category,
        priority: form.priority,
        notes: form.notes || null,
      }
      const res = await api.post<DayTask>('/day/plans', payload)
      setTasks((prev) => [...prev, res.data].sort((a, b) => (a.time_from ?? '').localeCompare(b.time_from ?? '')))
      setShowModal(false)
      setForm({ title: '', time_from: '', time_to: '', category: 'work', priority: 2, notes: '' })
    } catch {
      setError('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTask(id: number) {
    try {
      await api.delete(`/day/plans/${id}`)
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch {
      // silently fail
    }
  }

  const incomplete = tasks.filter((t) => !t.completed)
  const completed = tasks.filter((t) => t.completed)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Mein Tag
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[var(--color-primary)] text-white rounded-full w-10 h-10 flex items-center justify-center text-xl font-light hover:opacity-90 transition-opacity"
          aria-label="Aufgabe hinzufügen"
        >
          +
        </button>
      </div>

      {/* Date switcher */}
      <div className="flex items-center justify-between mb-6 bg-[var(--color-surface)] rounded-xl p-3 shadow-[var(--shadow-card)]">
        <button
          onClick={() => shiftDate(-1)}
          className="w-10 h-10 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-sm font-medium capitalize">{formatDisplayDate(currentDate)}</p>
          {currentDate === dateStr(new Date()) && (
            <span className="text-xs text-[var(--color-primary)]">Heute</span>
          )}
        </div>
        <button
          onClick={() => shiftDate(1)}
          className="w-10 h-10 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          ›
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner size={32} />
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm text-center">{error}</p>
      ) : (
        <>
          {tasks.length === 0 && (
            <div className="text-center py-10 text-[var(--color-text-muted)]">
              <p className="text-4xl mb-3">☀️</p>
              <p className="text-sm">Noch keine Aufgaben für diesen Tag</p>
            </div>
          )}

          {/* Incomplete tasks */}
          <div className="flex flex-col gap-2 mb-4">
            {incomplete.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={toggleComplete} onDelete={deleteTask} />
            ))}
          </div>

          {/* Completed tasks */}
          {completed.length > 0 && (
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-2 font-medium">
                Erledigt ({completed.length})
              </p>
              <div className="flex flex-col gap-2 opacity-60">
                {completed.map((task) => (
                  <TaskItem key={task.id} task={task} onToggle={toggleComplete} onDelete={deleteTask} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add task modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Neue Aufgabe
            </h2>
            <form onSubmit={addTask} className="flex flex-col gap-3">
              <input
                className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm"
                placeholder="Aufgabe beschreiben..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                autoFocus
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Von</label>
                  <input
                    type="time"
                    className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm"
                    value={form.time_from}
                    onChange={(e) => setForm({ ...form, time_from: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Bis</label>
                  <input
                    type="time"
                    className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm"
                    value={form.time_to}
                    onChange={(e) => setForm({ ...form, time_to: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Kategorie</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setForm({ ...form, category: cat })}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        form.category === cat
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-[var(--color-muted)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Priorität</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm({ ...form, priority: p })}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                        form.priority === p
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'bg-[var(--color-muted)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {p === 1 ? 'Hoch' : p === 2 ? 'Mittel' : 'Niedrig'}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm resize-none"
                placeholder="Notizen (optional)"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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

function TaskItem({
  task,
  onToggle,
  onDelete,
}: {
  task: DayTask
  onToggle: (t: DayTask) => void
  onDelete: (id: number) => void
}) {
  const PRIORITY_DOT: Record<number, string> = {
    1: 'bg-red-400',
    2: 'bg-amber-400',
    3: 'bg-gray-300',
  }

  return (
    <Card className="flex items-center gap-3 min-h-[56px]">
      <button
        onClick={() => onToggle(task)}
        className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          task.completed
            ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
            : 'border-[var(--color-muted)] hover:border-[var(--color-primary)]'
        }`}
        aria-label={task.completed ? 'Als offen markieren' : 'Als erledigt markieren'}
      >
        {task.completed && <span className="text-white text-xs">✓</span>}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-[var(--color-text-muted)]' : ''}`}>
          {task.title}
        </p>
        {(task.time_from || task.category) && (
          <div className="flex items-center gap-2 mt-0.5">
            {task.time_from && (
              <span className="text-xs text-[var(--color-text-muted)]">
                {task.time_from.slice(0, 5)}{task.time_to ? ` – ${task.time_to.slice(0, 5)}` : ''}
              </span>
            )}
            {task.category && <Badge label={task.category} variant="category" />}
          </div>
        )}
      </div>

      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority] ?? 'bg-gray-300'}`} />

      <button
        onClick={() => onDelete(task.id)}
        className="text-[var(--color-text-muted)] hover:text-red-400 transition-colors text-lg w-8 h-8 flex items-center justify-center"
        aria-label="Löschen"
      >
        ×
      </button>
    </Card>
  )
}
