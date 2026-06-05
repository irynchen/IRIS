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
  const { rooms, tasksByRoom, todayTasks, loading, error, load, loadToday, markDone, add, update, remove } =
    useHomeStore()
  const [showForm, setShowForm] = useState(false)
  const [editTask, setEditTask] = useState<HomeTask | undefined>()
  const [selectedRoom, setSelectedRoom] = useState<HomeRoom | null>(null)
  const [formDefaultRoom, setFormDefaultRoom] = useState<number | undefined>()

  useEffect(() => {
    load()
    loadToday()
  }, [])

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
  }) {
    if (editTask) {
      // edit mode — PATCH existing task
      await update(editTask.id, editTask.room_id, {
        title: form.title.trim(),
        frequency_days: form.frequency_days ? Number(form.frequency_days) : null,
        last_done: form.last_done || null,
        // next_due will be recalculated server-side via existing patch logic
        next_due: form.last_done && form.frequency_days
          ? new Date(
              new Date(form.last_done + 'T00:00:00').getTime() +
              Number(form.frequency_days) * 86400000
            ).toISOString().slice(0, 10)
          : null,
        priority: form.priority,
      })
      setEditTask(undefined)
    } else {
      // create mode
      await add({
        room_id: form.room_id,
        title: form.title.trim(),
        frequency_days: form.frequency_days ? Number(form.frequency_days) : null,
        last_done: form.last_done || null,
        priority: form.priority,
      })
    }
  }

  const selectedTasks = selectedRoom ? (tasksByRoom[selectedRoom.id] ?? []) : []

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg)] border-b border-[var(--color-muted)] px-4 py-4">
        <div className="flex items-center justify-between">
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
            <TodayBlock tasks={todayTasks} onDone={markDone} />

            {rooms.length === 0 ? (
              <EmptyState icon="🏠" message="Keine Räume vorhanden" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {rooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    tasks={tasksByRoom[room.id] ?? []}
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
        defaultRoomId={formDefaultRoom}
        editTask={editTask}
      />
    </div>
  )
}
