import { create } from 'zustand'
import {
  healthApi,
  HealthRecord,
  HealthRecordCreate,
  HealthStats,
  HealthInsight,
  HealthGoal,
} from '../api/health'

interface HealthState {
  todayRecord: HealthRecord | null
  records: HealthRecord[]
  stats: HealthStats | null
  insights: HealthInsight[]
  goals: HealthGoal[]
  isLoading: boolean
  error: string | null

  fetchToday: () => Promise<void>
  fetchRecords: (from: string, to: string) => Promise<void>
  fetchStats: (days?: number) => Promise<void>
  fetchInsights: () => Promise<void>
  fetchGoals: () => Promise<void>
  saveRecord: (data: HealthRecordCreate) => Promise<void>
  updateRecord: (date: string, data: Partial<HealthRecordCreate>) => Promise<void>
}

export const useHealthStore = create<HealthState>((set, get) => ({
  todayRecord: null,
  records: [],
  stats: null,
  insights: [],
  goals: [],
  isLoading: false,
  error: null,

  async fetchToday() {
    set({ isLoading: true, error: null })
    try {
      const rec = await healthApi.getToday()
      set({ todayRecord: rec, isLoading: false })
    } catch {
      set({ error: 'Fehler beim Laden', isLoading: false })
    }
  },

  async fetchRecords(from, to) {
    set({ isLoading: true, error: null })
    try {
      const recs = await healthApi.getRecords(from, to)
      set({ records: recs, isLoading: false })
    } catch {
      set({ error: 'Fehler beim Laden', isLoading: false })
    }
  },

  async fetchStats(days = 30) {
    try {
      const stats = await healthApi.getStats(days)
      set({ stats })
    } catch {
      // silent
    }
  },

  async fetchInsights() {
    try {
      const insights = await healthApi.getInsights()
      set({ insights })
    } catch {
      // silent
    }
  },

  async fetchGoals() {
    try {
      const goals = await healthApi.getGoals()
      set({ goals })
    } catch {
      // silent
    }
  },

  async saveRecord(data) {
    set({ isLoading: true, error: null })
    try {
      const saved = await healthApi.saveRecord(data)
      set({ todayRecord: saved, isLoading: false })
      // refresh records list if loaded
      const { records } = get()
      if (records.length > 0) {
        const idx = records.findIndex(r => r.date === saved.date)
        if (idx >= 0) {
          const updated = [...records]
          updated[idx] = saved
          set({ records: updated })
        } else {
          set({ records: [saved, ...records] })
        }
      }
    } catch {
      set({ error: 'Fehler beim Speichern', isLoading: false })
      throw new Error('Fehler beim Speichern')
    }
  },

  async updateRecord(date, data) {
    try {
      const updated = await healthApi.patchRecord(date, data)
      if (!updated) return
      const { records, todayRecord } = get()
      if (todayRecord?.date === date) set({ todayRecord: updated })
      const idx = records.findIndex(r => r.date === date)
      if (idx >= 0) {
        const newRecs = [...records]
        newRecs[idx] = updated
        set({ records: newRecs })
      }
    } catch {
      // silent
    }
  },
}))
