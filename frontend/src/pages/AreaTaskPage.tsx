import { useEffect, useState, useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import {
  AreaInfo, AreaCategory, AreaTask,
  fetchAreaInfo, fetchAreaCategories, fetchAreaTasks,
  createAreaTask, markAreaTaskDone, patchAreaTask, deleteAreaTask,
} from '../api/tasks'
import BottomSheet from '../components/ui/BottomSheet'
import SkeletonCard from '../components/ui/SkeletonCard'
import EmptyState from '../components/ui/EmptyState'
import AreaTaskForm from '../components/area/AreaTaskForm'

const STATUS_CONFIG = {
  ok:       { color: 'var(--color-primary)', label: '' },
  due_soon: { color: '#f59e0b',              label: 'bald fällig' },
  overdue:  { color: '#ef4444',              label: 'überfällig' },
}

const PRIORITY_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  3: { label: 'Hoch',    color: '#ef4444', bg: '#ef444418' },
  1: { label: 'Niedrig', color: '#6B8F71', bg: '#6B8F7118' },
}

const DURATION_ICON: Record<string, string> = { short: '⚡', short30: '⏱', medium: '🕐', long: '⏳', very_long: '⌛' }
const ENERGY_ICON:   Record<string, string> = { low: '🌿', medium: '💛', high: '🔥' }

function formatDate(d: string | null) {
  if (!d) return 'noch nie'
  return new Date(d + 'T00:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

export default function AreaTaskPage() {
  const location = useLocation()
  const slug = location.pathname.slice(1)
  const [searchParams, setSearchParams] = useSearchParams()
  const [areaInfo, setAreaInfo] = useState<AreaInfo | null>(null)
  const [categories, setCategories] = useState<AreaCategory[]>([])
  const [tasks, setTasks] = useState<AreaTask[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editTask, setEditTask] = useState<AreaTask | undefined>()

  const load = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const [info, cats, t] = await Promise.all([
        fetchAreaInfo(slug),
        fetchAreaCategories(slug),
        fetchAreaTasks(slug),
      ])
      setAreaInfo(info)
      setCategories(cats)
      setTasks(t)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { load() }, [load])

  // Auto-open edit form if ?edit=ID is in URL
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (!editId || loading) return
    const task = tasks.find((t) => t.id === Number(editId))
    if (task) {
      setEditTask(task)
      setShowForm(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, loading, tasks])

  const displayed = filterCat
    ? tasks.filter((t) => t.category_id === filterCat)
    : tasks

  async function handleDone(task: AreaTask) {
    if (!slug) return
    const updated = await markAreaTaskDone(slug, task.id)
    setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t))
    if (navigator.vibrate) navigator.vibrate(50)
  }

  async function handleDelete(task: AreaTask) {
    if (!slug) return
    setTasks((prev) => prev.filter((t) => t.id !== task.id))
    try { await deleteAreaTask(slug, task.id) } catch { load() }
  }

  async function handleFormSubmit(form: {
    title: string
    category_id: number | null
    priority: number
    notes: string | null
    duration: string | null
    energy_level: string | null
    frequency_days: string
    last_done: string
    next_due: string
  }) {
    if (!slug) return
    const payload = {
      title: form.title.trim(),
      category_id: form.category_id,
      priority: form.priority,
      notes: form.notes || null,
      duration: form.duration,
      energy_level: form.energy_level,
      frequency_days: form.frequency_days ? Number(form.frequency_days) : null,
      last_done: form.last_done || null,
      next_due: form.next_due || null,
    }
    if (editTask) {
      const updated = await patchAreaTask(slug, editTask.id, payload)
      setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t))
      setEditTask(undefined)
    } else {
      const created = await createAreaTask(slug, payload)
      setTasks((prev) => [...prev, created])
    }
  }

  // group by category
  const grouped: { cat: AreaCategory | null; items: AreaTask[] }[] = []
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const catOrder = [...categories.map((c) => c.id), null]
  for (const catId of catOrder) {
    const items = displayed.filter((t) => t.category_id === catId || (catId === null && !t.category_id))
    if (items.length > 0) {
      grouped.push({ cat: catId != null ? catMap.get(catId)! : null, items })
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg)] border-b border-[var(--color-muted)] px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {areaInfo ? `${areaInfo.icon ?? ''} ${areaInfo.name}` : '…'}
          </h1>
          <button
            onClick={() => { setEditTask(undefined); setShowForm(true) }}
            className="bg-[var(--color-primary)] text-white rounded-full w-9 h-9 flex items-center justify-center text-lg font-light hover:opacity-90 transition-opacity"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <SkeletonCard key={i} lines={2} />)}</div>
        ) : (
          <>
            {/* Kategorien-Filter */}
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-4">
                <button
                  onClick={() => setFilterCat(null)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filterCat === null
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-muted)] text-[var(--color-text-muted)]'
                  }`}
                >
                  Alle
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setFilterCat(filterCat === c.id ? null : c.id)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      filterCat === c.id
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-muted)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {c.icon} {c.name}
                  </button>
                ))}
              </div>
            )}

            {/* Task-Liste */}
            {grouped.length === 0 ? (
              <EmptyState icon={areaInfo?.icon ?? '📋'} message="Noch keine Aufgaben" sub="Tippe auf + um eine hinzuzufügen" />
            ) : (
              <div className="flex flex-col gap-4">
                {grouped.map(({ cat, items }) => (
                  <div key={cat?.id ?? 'uncategorized'} className="bg-[var(--color-surface)] rounded-2xl p-4">
                    {cat && (
                      <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
                        {cat.icon} {cat.name}
                      </h3>
                    )}
                    {items.map((task) => {
                      const cfg = STATUS_CONFIG[task.status]
                      const prio = PRIORITY_CONFIG[task.priority]
                      return (
                        <div key={task.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--color-muted)] last:border-0">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium truncate">{task.title}</p>
                              {cfg.label && <span className="text-xs flex-shrink-0" style={{ color: cfg.color }}>{cfg.label}</span>}
                            </div>
                            {(prio || task.duration || task.energy_level) && (
                              <div className="flex items-center gap-1.5 mt-1">
                                {prio && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                    style={{ color: prio.color, background: prio.bg }}>
                                    {prio.label}
                                  </span>
                                )}
                                {task.duration && <span className="text-[10px]">{DURATION_ICON[task.duration]}</span>}
                                {task.energy_level && <span className="text-[10px]">{ENERGY_ICON[task.energy_level]}</span>}
                              </div>
                            )}
                            {(task.last_done || task.frequency_days) && (
                              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                {task.last_done ? `Zuletzt: ${formatDate(task.last_done)}` : ''}
                                {task.frequency_days ? ` · alle ${task.frequency_days} Tage` : ''}
                                {task.next_due ? ` · nächste: ${formatDate(task.next_due)}` : ''}
                              </p>
                            )}
                          </div>
                          {task.frequency_days && (
                            <button
                              onClick={() => handleDone(task)}
                              className="text-xs px-3 py-1.5 rounded-lg text-white font-medium flex-shrink-0"
                              style={{ backgroundColor: 'var(--color-primary)' }}
                            >
                              ✓
                            </button>
                          )}
                          <button
                            onClick={() => { setEditTask(task); setShowForm(true) }}
                            className="text-[var(--color-text-muted)] w-7 h-7 flex items-center justify-center text-sm"
                          >✏️</button>
                          <button
                            onClick={() => handleDelete(task)}
                            className="text-[var(--color-text-muted)] hover:text-red-400 w-7 h-7 flex items-center justify-center text-lg"
                          >×</button>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <AreaTaskForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditTask(undefined) }}
        onSubmit={handleFormSubmit}
        categories={categories}
        editTask={editTask}
      />
    </div>
  )
}
