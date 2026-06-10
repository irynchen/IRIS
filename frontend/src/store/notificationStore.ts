import { create } from 'zustand'
import api from '../api/client'

interface Counts {
  overdue: number
  due_today: number
  total: number
}

interface NotificationStore {
  counts: Counts
  loading: boolean
  fetch: () => Promise<void>
  startPolling: () => () => void
}

const EMPTY: Counts = { overdue: 0, due_today: 0, total: 0 }
const POLL_MS = 10 * 60 * 1000 // 10 minutes

export const useNotificationStore = create<NotificationStore>((set) => ({
  counts: EMPTY,
  loading: false,

  fetch: async () => {
    try {
      const { data } = await api.get<Counts>('/notifications/counts')
      set({ counts: data })
    } catch {
      // silently ignore — badge just stays at 0
    }
  },

  startPolling: () => {
    const store = useNotificationStore.getState()
    store.fetch()
    const id = setInterval(() => useNotificationStore.getState().fetch(), POLL_MS)
    return () => clearInterval(id)
  },
}))
