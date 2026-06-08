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

export default function HomePage() {
  const { rooms, categories, tasksByRoom, loading, error, load, markDone, add, update, remove } =
    useHomeStore()
  const [showForm, setShowForm] = useState(false)
  const [editTask, setEditTask] = useState<HomeTask | undefined>()
  const [selectedRoom, setSelectedRoom] = useState<HomeRoom | null>(null)
  const [formDefaultRoom, setFormDefaultRoom] = useState<number | undefined>()
  const [filterCategory, setFilterCategory] = useState<number | null>(null)

  useEffect(() => { load() }, [])

  function openAddForRoom(room: HomeRoom) {
    setEditTask(undefined)
    setFormDefaultRoom(room.id)
    setShowForm(true)
  }

  function openEdit(task: HomeTask) {
    setEditTask(task)
    setFormDefaultRoom(task.room_id)
    setSelectedRoom(null)  // close room detail sheet
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

  // Derive today tasks from tasksByRoom — always in sync, no separate API call needed
  const allTasks = Object.values(tasksByRoom).flat()
  const urgentTasks = allTasks.filter((t) => t.status === 'overdue' || t.status === 'due_soon')
  const filteredTodayTasks = filterCategory
    ? urgentTasks.filter((t) => t.category_id === filterCategory)
    : urgentTasks

  const filteredByRoom = filterCategory
    ? Object.fromEntries(
        Object.entries(tasksByRoom).map(([id, tasks]) => [
          id,
          tasks.filter((t) => t.category_id === filterCategory),
        ])
      )
    : tasksByRoom

  const selectedTasks = selectedRoom ? (filteredByRoom[selectedRoom.id] ?? []) : []

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg)] border-b border-[var(--color-muted)] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Zuhause
          </h1>
          <button
            onClick={() => { setEditTask(undefined); setFormDefaultRoom(rooms[0]?.id); setShowForm(true) }}
            className="bg-[var(--color-primary)] text-white rounded-full w-9 h-9 flex items-center justify-center text-lg font-light hover:opacity-90 transition-opacity"
          >
            +
          </button>
        </div>
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide">
            <button
              onClick={() => setFilterCategory(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterCategory === null
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-muted)] text-[var(--color-text-muted)]'
              }`}
            >
              Alle
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilterCategory(filterCategory === c.id ? null : c.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filterCategory === c.id
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-muted)] text-[var(--color-text-muted)]'
                }`}
              >
                {c.icon} {c.name}
              </button>
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
            <TodayBlock tasks={filteredTodayTasks} onDone={markDone} />

            {rooms.length === 0 ? (
              <EmptyState icon="🏠" message="Keine Räume vorhanden" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {rooms.map((room) => (
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
              onClick={() => { openAddForRoom(selectedRoom) }}
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
