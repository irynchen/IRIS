import { create } from 'zustand'
import {
  HomeRoom, HomeTask,
  fetchRooms, fetchTasks, fetchTodayTasks,
  markDone as apiMarkDone, createTask as apiCreate, deleteTask as apiDelete,
} from '../api/home'

interface HomeState {
  rooms: HomeRoom[]
  tasksByRoom: Record<number, HomeTask[]>
  todayTasks: HomeTask[]
  loading: boolean
  error: string | null
  load: () => Promise<void>
  loadToday: () => Promise<void>
  markDone: (taskId: number, roomId: number) => Promise<void>
  add: (payload: Parameters<typeof apiCreate>[0]) => Promise<void>
  remove: (taskId: number, roomId: number) => Promise<void>
}

export const useHomeStore = create<HomeState>((set, get) => ({
  rooms: [],
  tasksByRoom: {},
  todayTasks: [],
  loading: false,
  error: null,

  async load() {
    set({ loading: true, error: null })
    try {
      const [rooms, tasks] = await Promise.all([fetchRooms(), fetchTasks()])
      const byRoom: Record<number, HomeTask[]> = {}
      for (const t of tasks) {
        if (!byRoom[t.room_id]) byRoom[t.room_id] = []
        byRoom[t.room_id].push(t)
      }
      set({ rooms, tasksByRoom: byRoom, loading: false })
    } catch {
      set({ error: 'Fehler beim Laden', loading: false })
    }
  },

  async loadToday() {
    try {
      const tasks = await fetchTodayTasks()
      set({ todayTasks: tasks })
    } catch {
      // non-critical
    }
  },

  async markDone(taskId, roomId) {
    const prev = get().tasksByRoom[roomId] ?? []
    // optimistic: update status + last_done immediately
    const today = new Date().toISOString().slice(0, 10)
    set({
      tasksByRoom: {
        ...get().tasksByRoom,
        [roomId]: prev.map((t) =>
          t.id === taskId ? { ...t, last_done: today, status: 'ok' as const } : t
        ),
      },
    })
    try {
      const updated = await apiMarkDone(taskId)
      set({
        tasksByRoom: {
          ...get().tasksByRoom,
          [roomId]: get().tasksByRoom[roomId].map((t) => t.id === taskId ? updated : t),
        },
      })
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
    } catch {
      set({ tasksByRoom: { ...get().tasksByRoom, [roomId]: prev } })
    }
  },

  async add(payload) {
    const created = await apiCreate(payload)
    const prev = get().tasksByRoom[created.room_id] ?? []
    set({
      tasksByRoom: {
        ...get().tasksByRoom,
        [created.room_id]: [...prev, created],
      },
    })
  },

  async remove(taskId, roomId) {
    const prev = get().tasksByRoom[roomId] ?? []
    set({
      tasksByRoom: {
        ...get().tasksByRoom,
        [roomId]: prev.filter((t) => t.id !== taskId),
      },
    })
    try {
      await apiDelete(taskId)
    } catch {
      set({ tasksByRoom: { ...get().tasksByRoom, [roomId]: prev } })
    }
  },
}))
