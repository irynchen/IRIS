import { create } from 'zustand'
import { bpApi, BPReading, BPReadingCreate, BPStats } from '../api/bp'

interface BPState {
  readings: BPReading[]
  stats: BPStats | null
  isLoading: boolean
  error: string | null

  fetchReadings: (from?: string, to?: string) => Promise<void>
  fetchStats: (days?: number) => Promise<void>
  addReading: (data: BPReadingCreate) => Promise<void>
  removeReading: (id: number) => Promise<void>
}

export const useBPStore = create<BPState>((set, get) => ({
  readings: [],
  stats: null,
  isLoading: false,
  error: null,

  async fetchReadings(from, to) {
    set({ isLoading: true, error: null })
    try {
      const readings = await bpApi.list(from, to)
      set({ readings, isLoading: false })
    } catch {
      set({ error: 'Fehler beim Laden', isLoading: false })
    }
  },

  async fetchStats(days = 30) {
    try {
      const stats = await bpApi.getStats(days)
      set({ stats })
    } catch {
      // silent
    }
  },

  async addReading(data) {
    set({ isLoading: true, error: null })
    try {
      const saved = await bpApi.create(data)
      set({ readings: [saved, ...get().readings], isLoading: false })
    } catch {
      set({ error: 'Fehler beim Speichern', isLoading: false })
      throw new Error('Fehler beim Speichern')
    }
  },

  async removeReading(id) {
    try {
      await bpApi.remove(id)
      set({ readings: get().readings.filter(r => r.id !== id) })
    } catch {
      // silent
    }
  },
}))
