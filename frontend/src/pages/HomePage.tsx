import { useEffect, useState } from 'react'
import { useHomeStore } from '../store/homeStore'
import { HomeRoom, HomeTask } from '../api/home'
import RoomCard from '../components/home/RoomCard'
import HomeTaskItem from '../components/home/HomeTaskItem'
import HomeTaskForm from '../components/home/HomeTaskForm'
import TodayBlock from '../components/home/TodayBlock'
import SkeletonCard from '../components/ui/SkeletonCard'
import EmptyState from '../components/ui/EmptyState'
import BottomSheet from '../components/ui/BottomSheet'

const SELECT_CLS =
  'flex-1 min-w-[calc(33%-6px)] text-xs py-1.5 px-2 rounded-lg ' +
  'border border-[var(--color-muted)] bg-[var(--color-surface)] ' +
  'text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] ' +
  'appearance-none cursor-pointer'

export default function HomePage() {
  const { rooms, categories, tasksByRoom, loading, error, load, markDone, add, update, remove } =
    useHomeStore()

  const [showForm,       setShowForm]       = useState(false)
  const [editTask,       setEditTask]       = useState<HomeTask | undefined>()
  const [selectedRoom,   setSelectedRoom]   = useState<HomeRoom | null>(null)
  const [formDefaultRoom,setFormDefaultRoom]= useState<number | undefined>()

  // Filters
  const [fCategory, setFCategory] = useState<number | null>(null)
  const [fPriority, setFPriority] = useState<number | null>(null)
  const [fDuration, setFDuration] = useState<string | null>(null)
  const [fEnergy,   setFEnergy]   = useState<string | null>(null)
  const [fRoom,     setFRoom]     = useState<number | null>(null)

  const hasFilter = fCategory || fPriority || fDuration || fEnergy || fRoom

  useEffect(() => { load() }, [])

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

  function openAddForRoom(room: HomeRoom) {
    setEditTask(undefined)
    setFormDefaultRoom(room.id)
    setShowForm(true)
  }

  function openEdit(task: HomeTask) {
    setEditTask(task)
    setFormDefaultRoom(task.room_id)
    setSelectedRoom(null)
    setShowForm(true)
  }

  async function handleFormSubmit(form: {
    room_id: number
    title: string
    frequency_days: string
    last_done: string
    priority: number
    category_id: number | null
    duration: string | null
    energy_level: string | null
  }) {
    if (editTask) {
      await update(editTask.id, editTask.room_id, {
        title: form.title.trim(),
        frequency_days: form.frequency_days ? Number(form.frequency_days) : null,
        last_done: form.last_done || null,
        priority: form.priority,
        category_id: form.category_id,
        duration: form.duration,
        energy_level: form.energy_level,
      })
      setEditTask(undefined)
    } else {
      await add({
        room_id: form.room_id,
        title: form.title.trim(),
        frequency_days: form.frequency_days ? Number(form.frequency_days) : null,
        last_done: form.last_done || null,
        priority: form.priority,
        category_id: form.category_id,
        duration: form.duration,
        energy_level: form.energy_level,
      })
    }
  }

  // Derived urgent tasks — always in sync with tasksByRoom
  const allTasks    = Object.values(tasksByRoom).flat()
  const urgentTasks = applyFilters(allTasks.filter((t) => t.status === 'overdue' || t.status === 'due_soon'))

  // Filtered room tasks
  const filteredByRoom = Object.fromEntries(
    Object.entries(tasksByRoom)
      .filter(([roomId]) => !fRoom || Number(roomId) === fRoom)
      .map(([id, tasks]) => [id, applyFilters(tasks)])
  )

  const selectedTasks = selectedRoom ? (applyFilters(tasksByRoom[selectedRoom.id] ?? [])) : []

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg)] border-b border-[var(--color-muted)] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Zuhause
          </h1>
          <div className="flex items-center gap-2">
            {hasFilter && (
              <button
                onClick={() => { setFCategory(null); setFPriority(null); setFDuration(null); setFEnergy(null); setFRoom(null) }}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
              >
                ✕ Filter
              </button>
            )}
            <button
              onClick={() => { setEditTask(undefined); setFormDefaultRoom(rooms[0]?.id); setShowForm(true) }}
              className="bg-[var(--color-primary)] text-white rounded-full w-9 h-9 flex items-center justify-center text-lg font-light hover:opacity-90 transition-opacity"
            >
              +
            </button>
          </div>
        </div>

        {/* Filter-Dropdowns */}
        <div className="flex flex-wrap gap-1.5">
          {/* Kategorie */}
          <select
            className={SELECT_CLS}
            value={fCategory ?? ''}
            onChange={(e) => setFCategory(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Kategorie</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>

          {/* Raum */}
          <select
            className={SELECT_CLS}
            value={fRoom ?? ''}
            onChange={(e) => setFRoom(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Raum</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
            ))}
          </select>

          {/* Priorität */}
          <select
            className={SELECT_CLS}
            value={fPriority ?? ''}
            onChange={(e) => setFPriority(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Priorität</option>
            <option value="3">🔴 Hoch</option>
            <option value="2">🟡 Mittel</option>
            <option value="1">🟢 Niedrig</option>
          </select>

          {/* Dauer */}
          <select
            className={SELECT_CLS}
            value={fDuration ?? ''}
            onChange={(e) => setFDuration(e.target.value || null)}
          >
            <option value="">Dauer</option>
            <option value="short">⚡ Kurz (15 min)</option>
            <option value="medium">🕐 Mittel (1 Std)</option>
            <option value="long">⏳ Lang (2 Std)</option>
          </select>

          {/* Energiebedarf */}
          <select
            className={SELECT_CLS}
            value={fEnergy ?? ''}
            onChange={(e) => setFEnergy(e.target.value || null)}
          >
            <option value="">Energie</option>
            <option value="low">🌿 Niedrig</option>
            <option value="medium">💛 Mittel</option>
            <option value="high">🔥 Hoch</option>
          </select>
        </div>
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
            <TodayBlock tasks={urgentTasks} rooms={rooms} onDone={markDone} />

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
