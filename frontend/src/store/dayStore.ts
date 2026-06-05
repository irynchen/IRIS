import { create } from 'zustand'
import { DayTask, fetchTasks, patchTask, deleteTask as apiDelete, createTask } from '../api/day'

interface DayState {
  tasks: DayTask[]
  loading: boolean
  error: string | null
  currentDate: string
  setDate: (date: string) => void
  load: (date: string) => Promise<void>
  toggle: (id: number) => Promise<void>
  add: (payload: Partial<DayTask>) => Promise<DayTask>
  remove: (id: number) => Promise<void>
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export const useDayStore = create<DayState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  currentDate: todayStr(),

  setDate(date) {
    set({ currentDate: date })
  },

  async load(date) {
    set({ loading: true, error: null })
    try {
      const tasks = await fetchTasks(date)
      set({ tasks, loading: false })
    } catch {
      set({ error: 'Fehler beim Laden', loading: false })
    }
  },

  async toggle(id) {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    // optimistic update
    set({ tasks: get().tasks.map((t) => t.id === id ? { ...t, completed: !t.completed } : t) })
    try {
      const updated = await patchTask(id, { completed: !task.completed })
      set({ tasks: get().tasks.map((t) => t.id === id ? updated : t) })
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
    } catch {
      // rollback
      set({ tasks: get().tasks.map((t) => t.id === id ? task : t) })
    }
  },

  async add(payload) {
    const created = await createTask(payload)
    set((state) => ({
      tasks: [...state.tasks, created].sort((a, b) =>
        (a.time_from ?? '￿').localeCompare(b.time_from ?? '￿')
      ),
    }))
    return created
  },

  async remove(id) {
    const prev = get().tasks
    set({ tasks: prev.filter((t) => t.id !== id) })
    try {
      await apiDelete(id)
    } catch {
      set({ tasks: prev })
    }
  },
}))
