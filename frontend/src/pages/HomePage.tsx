import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useHomeStore } from '../store/homeStore'
import { HomeRoom, HomeTask } from '../api/home'
import RoomCard from '../components/home/RoomCard'
import HomeTaskItem from '../components/home/HomeTaskItem'
import HomeTaskForm from '../components/home/HomeTaskForm'
import TodayBlock from '../components/home/TodayBlock'
import SkeletonCard from '../components/ui/SkeletonCard'
import EmptyState from '../components/ui/EmptyState'
import BottomSheet from '../components/ui/BottomSheet'

const STORAGE_KEY = 'iris_home_presets'

interface FilterPreset {
  name: string
  fCategory: number | null
  fPriority: number | null
  fDuration: string | null
  fEnergy: string | null
  fRoom: number | null
}

function loadPresets(): FilterPreset[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}
function savePresets(p: FilterPreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

const SELECT_CLS =
  'flex-1 min-w-[calc(33%-6px)] text-xs py-1.5 px-2 rounded-lg ' +
  'border border-[var(--color-muted)] bg-[var(--color-surface)] ' +
  'text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] ' +
  'appearance-none cursor-pointer'

export default function HomePage() {
  const { rooms, categories, tasksByRoom, loading, error, load, markDone, add, update, remove } =
    useHomeStore()

  const [showForm,        setShowForm]        = useState(false)
  const [editTask,        setEditTask]        = useState<HomeTask | undefined>()
  const [selectedRoom,    setSelectedRoom]    = useState<HomeRoom | null>(null)
  const [formDefaultRoom, setFormDefaultRoom] = useState<number | undefined>()

  // Filters
  const [fCategory, setFCategory] = useState<number | null>(null)
  const [fPriority, setFPriority] = useState<number | null>(null)
  const [fDuration, setFDuration] = useState<string | null>(null)
  const [fEnergy,   setFEnergy]   = useState<string | null>(null)
  const [fRoom,     setFRoom]     = useState<number | null>(null)

  // Presets
  const [presets,      setPresets]      = useState<FilterPreset[]>(loadPresets)
  const [savingPreset, setSavingPreset] = useState(false)
  const [presetName,   setPresetName]   = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  const hasFilter = !!(fCategory || fPriority || fDuration || fEnergy || fRoom)

  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => { load() }, [])

  // Auto-open edit form if ?edit=ID is in URL
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (!editId || loading) return
    const allTasks = Object.values(tasksByRoom).flat()
    const task = allTasks.find((t) => t.id === Number(editId))
    if (task) {
      openEdit(task)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, loading, tasksByRoom])
  useEffect(() => { if (savingPreset) nameInputRef.current?.focus() }, [savingPreset])

  function applyFilters(tasks: HomeTask[]): HomeTask[] {
    return tasks.filter((t) => {
      if (fCategory && t.category_id  !== fCategory) return false
      if (fPriority && t.priority     !== fPriority) return false
      if (fDuration && t.duration     !== fDuration) return false
      if (fEnergy   && t.energy_level !== fEnergy)   return false
      if (fRoom     && t.room_id      !== fRoom)      return false
      return true
    })
  }

  function resetFilters() {
    setFCategory(null); setFPriority(null)
    setFDuration(null); setFEnergy(null); setFRoom(null)
  }

  function applyPreset(p: FilterPreset) {
    setFCategory(p.fCategory); setFPriority(p.fPriority)
    setFDuration(p.fDuration); setFEnergy(p.fEnergy); setFRoom(p.fRoom)
  }

  function deletePreset(name: string) {
    const next = presets.filter((p) => p.name !== name)
    setPresets(next); savePresets(next)
  }

  function confirmSavePreset() {
    const name = presetName.trim()
    if (!name) return
    const next = [
      ...presets.filter((p) => p.name !== name),
      { name, fCategory, fPriority, fDuration, fEnergy, fRoom },
    ]
    setPresets(next); savePresets(next)
    setPresetName(''); setSavingPreset(false)
  }

  function openAddForRoom(room: HomeRoom) {
    setEditTask(undefined); setFormDefaultRoom(room.id); setShowForm(true)
  }

  function openEdit(task: HomeTask) {
    setEditTask(task); setFormDefaultRoom(task.room_id)
    setSelectedRoom(null); setShowForm(true)
  }

  async function handleFormSubmit(form: {
    room_id: number; title: string; frequency_days: string
    last_done: string; next_due: string; priority: number
    category_id: number | null; duration: string | null; energy_level: string | null
  }) {
    const payload = {
      room_id: form.room_id,
      title: form.title.trim(),
      frequency_days: form.frequency_days ? Number(form.frequency_days) : null,
      last_done: form.last_done || null,
      next_due: form.next_due || null,
      priority: form.priority,
      category_id: form.category_id,
      duration: form.duration,
      energy_level: form.energy_level,
    }
    if (editTask) {
      await update(editTask.id, editTask.room_id, payload)
      setEditTask(undefined)
    } else {
      await add(payload)
    }
  }

  const allTasks    = Object.values(tasksByRoom).flat()
  const urgentTasks = applyFilters(allTasks.filter((t) => t.status === 'overdue' || t.status === 'due_soon'))

  const filteredByRoom = Object.fromEntries(
    Object.entries(tasksByRoom)
      .filter(([roomId]) => !fRoom || Number(roomId) === fRoom)
      .map(([id, tasks]) => [id, applyFilters(tasks)])
  )

  const selectedTasks = selectedRoom ? applyFilters(tasksByRoom[selectedRoom.id] ?? []) : []

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg)] border-b border-[var(--color-muted)] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Zuhause</h1>
          <button
            onClick={() => { setEditTask(undefined); setFormDefaultRoom(rooms[0]?.id); setShowForm(true) }}
            className="bg-[var(--color-primary)] text-white rounded-full w-9 h-9 flex items-center justify-center text-lg font-light hover:opacity-90 transition-opacity"
          >+</button>
        </div>

        {/* Filter-Dropdowns */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <select className={SELECT_CLS} value={fCategory ?? ''} onChange={(e) => setFCategory(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Kategorie</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>

          <select className={SELECT_CLS} value={fRoom ?? ''} onChange={(e) => setFRoom(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Raum</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
          </select>

          <select className={SELECT_CLS} value={fPriority ?? ''} onChange={(e) => setFPriority(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Priorität</option>
            <option value="3">🔴 Hoch</option>
            <option value="2">🟡 Mittel</option>
            <option value="1">🟢 Niedrig</option>
          </select>

          <select className={SELECT_CLS} value={fDuration ?? ''} onChange={(e) => setFDuration(e.target.value || null)}>
            <option value="">Dauer</option>
            <option value="short">⚡ 15 min</option>
            <option value="short30">⏱ 30 min</option>
            <option value="medium">🕐 1 Std</option>
            <option value="long">⏳ 2 Std</option>
            <option value="very_long">⌛ 3 Std</option>
          </select>

          <select className={SELECT_CLS} value={fEnergy ?? ''} onChange={(e) => setFEnergy(e.target.value || null)}>
            <option value="">Energie</option>
            <option value="low">🌿 Niedrig</option>
            <option value="medium">💛 Mittel</option>
            <option value="high">🔥 Hoch</option>
          </select>

          {/* Speichern */}
          {hasFilter && !savingPreset && (
            <button
              onClick={() => setSavingPreset(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-all"
              title="Filter als Preset speichern"
            >
              💾
            </button>
          )}

          {/* Reset */}
          <button
            onClick={resetFilters}
            disabled={!hasFilter}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              hasFilter
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white'
                : 'border-[var(--color-muted)] text-[var(--color-text-muted)] opacity-40 cursor-default'
            }`}
          >
            ↺ Zurücksetzen
          </button>
        </div>

        {/* Preset-Name-Eingabe */}
        {savingPreset && (
          <div className="flex gap-2 mt-2">
            <input
              ref={nameInputRef}
              className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-[var(--color-accent)] focus:outline-none bg-transparent"
              placeholder="Preset-Name (z.B. Bad, Küche heute…)"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmSavePreset(); if (e.key === 'Escape') setSavingPreset(false) }}
            />
            <button
              onClick={confirmSavePreset}
              disabled={!presetName.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-accent)] text-white disabled:opacity-40"
            >Speichern</button>
            <button
              onClick={() => { setSavingPreset(false); setPresetName('') }}
              className="px-3 py-1.5 rounded-lg text-xs border border-[var(--color-muted)] text-[var(--color-text-muted)]"
            >×</button>
          </div>
        )}

        {/* Gespeicherte Presets */}
        {presets.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-2">
            {presets.map((p) => (
              <span key={p.name} className="flex items-center gap-1 bg-[var(--color-muted)] rounded-full pl-3 pr-1 py-1">
                <button
                  onClick={() => applyPreset(p)}
                  className="text-xs text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
                >
                  {p.name}
                </button>
                <button
                  onClick={() => deletePreset(p.name)}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-50 transition-colors text-xs leading-none"
                >×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} lines={3} />)}
          </div>
        ) : error ? (
          <p className="text-red-400 text-sm text-center mt-10">{error}</p>
        ) : (
          <>
            <TodayBlock tasks={urgentTasks} rooms={rooms} categories={categories} onDone={markDone} onEdit={openEdit} />

            {rooms.length === 0 ? (
              <EmptyState icon="🏠" message="Keine Räume vorhanden" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {rooms
                  .filter((r) => !fRoom || r.id === fRoom)
                  .map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      tasks={filteredByRoom[room.id] ?? []}
                      onClick={() => setSelectedRoom(room)}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Room detail sheet */}
      <BottomSheet
        open={selectedRoom !== null}
        onClose={() => setSelectedRoom(null)}
        title={selectedRoom ? `${selectedRoom.icon ?? ''} ${selectedRoom.name}` : undefined}
      >
        {selectedRoom && (
          <div>
            {selectedTasks.length === 0 ? (
              <EmptyState icon="✨" message="Keine Aufgaben" sub="Alles sauber hier!" />
            ) : (
              <div className="max-h-[50vh] overflow-y-auto -mx-2 px-2">
                {selectedTasks.map((task) => (
                  <HomeTaskItem
                    key={task.id}
                    task={task}
                    onDone={() => markDone(task.id, task.room_id)}
                    onEdit={() => openEdit(task)}
                    onDelete={() => remove(task.id, task.room_id)}
                  />
                ))}
              </div>
            )}
            <button
              onClick={() => openAddForRoom(selectedRoom)}
              className="mt-4 w-full py-2.5 border-2 border-dashed border-[var(--color-muted)] rounded-xl text-sm text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
            >
              + Aufgabe hinzufügen
            </button>
          </div>
        )}
      </BottomSheet>

      {/* Add / Edit form */}
      <HomeTaskForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditTask(undefined) }}
        onSubmit={handleFormSubmit}
        rooms={rooms}
        categories={categories}
        defaultRoomId={formDefaultRoom}
        editTask={editTask}
      />
    </div>
  )
}
