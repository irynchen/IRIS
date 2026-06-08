import { create } from 'zustand'
import {
  HomeRoom, HomeTask, HomeCategory,
  fetchRooms, fetchTasks, fetchTodayTasks, fetchCategories,
  markDone as apiMarkDone, createTask as apiCreate, patchTask as apiPatch, deleteTask as apiDelete,
} from '../api/home'

interface HomeState {
  rooms: HomeRoom[]
  categories: HomeCategory[]
  tasksByRoom: Record<number, HomeTask[]>
  todayTasks: HomeTask[]
  loading: boolean
  error: string | null
  load: () => Promise<void>
  loadToday: () => Promise<void>
  markDone: (taskId: number, roomId: number) => Promise<void>
  add: (payload: Parameters<typeof apiCreate>[0]) => Promise<void>
  update: (taskId: number, roomId: number, payload: Partial<HomeTask>) => Promise<void>
  remove: (taskId: number, roomId: number) => Promise<void>
}

export const useHomeStore = create<HomeState>((set, get) => ({
  rooms: [],
  categories: [],
  tasksByRoom: {},
  todayTasks: [],
  loading: false,
  error: null,

  async load() {
    set({ loading: true, error: null })
    try {
      const [rooms, tasks, categories] = await Promise.all([
        fetchRooms(),
        fetchTasks(),
        fetchCategories(),
      ])
      const byRoom: Record<number, HomeTask[]> = {}
      for (const t of tasks) {
        if (!byRoom[t.room_id]) byRoom[t.room_id] = []
        byRoom[t.room_id].push(t)
      }
      set({ rooms, tasksByRoom: byRoom, categories, loading: false })
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
        todayTasks: get().todayTasks.filter((t) => t.id !== taskId),
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

  async update(taskId, roomId, payload) {
    const prev = get().tasksByRoom[roomId] ?? []
    try {
      const updated = await apiPatch(taskId, payload)
      const newRoomId = updated.room_id
      const byRoom = { ...get().tasksByRoom }

      if (newRoomId !== roomId) {
        // Task moved to a different room
        byRoom[roomId] = prev.filter((t) => t.id !== taskId)
        byRoom[newRoomId] = [...(byRoom[newRoomId] ?? []), updated]
      } else {
        byRoom[roomId] = prev.map((t) => t.id === taskId ? updated : t)
      }

      set({
        tasksByRoom: byRoom,
        todayTasks: get().todayTasks.map((t) => t.id === taskId ? updated : t),
      })
    } catch {
      // leave state as-is on error
    }
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
