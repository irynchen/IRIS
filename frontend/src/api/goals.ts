import api from './client'

export interface GoalArea {
  id: number
  name: string
  icon: string
  color: string
  sort_order: number
}

export interface Goal {
  id: number
  area_id: number | null
  title: string
  description: string | null
  why_important: string | null
  horizon: string
  year: number | null
  month: number | null
  progress: number
  status: 'active' | 'paused' | 'done' | 'dropped'
  energy_level: string
  deadline: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MonthlyFocus {
  year: number
  month: number
  theme: string | null
  goal_1: string | null
  goal_2: string | null
  goal_3: string | null
  reward: string | null
  review: string | null
}

export const goalsApi = {
  getVision: (): Promise<Record<string, string | null>> =>
    api.get('/goals/vision').then(r => r.data),
  updateVision: (horizon: string, content: string | null): Promise<void> =>
    api.put(`/goals/vision/${horizon}`, { content }).then(r => r.data),

  getAreas: (): Promise<GoalArea[]> =>
    api.get('/goals/areas').then(r => r.data),

  listGoals: (params?: { horizon?: string; year?: number; month?: number }): Promise<Goal[]> =>
    api.get('/goals', { params }).then(r => r.data),
  createGoal: (data: Partial<Goal>): Promise<Goal> =>
    api.post('/goals', data).then(r => r.data),
  updateGoal: (id: number, data: Partial<Goal>): Promise<Goal> =>
    api.patch(`/goals/${id}`, data).then(r => r.data),
  deleteGoal: (id: number): Promise<void> =>
    api.delete(`/goals/${id}`).then(r => r.data),

  getMonthlyFocus: (year: number, month: number): Promise<MonthlyFocus> =>
    api.get(`/goals/monthly-focus/${year}/${month}`).then(r => r.data),
  saveMonthlyFocus: (year: number, month: number, data: Partial<MonthlyFocus>): Promise<void> =>
    api.put(`/goals/monthly-focus/${year}/${month}`, data).then(r => r.data),
}

export const ENERGY_LEVELS = [
  { key: 'inspired', icon: '🔥', label: 'Inspirierend' },
  { key: 'ok',       icon: '🙂', label: 'OK' },
  { key: 'dragging', icon: '😐', label: 'Träge' },
  { key: 'heavy',    icon: '🧱', label: 'Schwer' },
  { key: 'frozen',   icon: '❄️', label: 'Eingefroren' },
]

export const STATUS_META = {
  active:  { label: 'Aktiv',      color: '#6B8F71' },
  paused:  { label: 'Pause',      color: '#C4A882' },
  done:    { label: 'Erreicht',   color: '#4A7FA5' },
  dropped: { label: 'Aufgegeben', color: '#9ca3af' },
}

export const HORIZON_META: Record<string, { label: string; question: string; color: string; accent: string }> = {
  '10_years': {
    label: 'In 10 Jahren',
    question: 'Wie lebe ich? Wie fühle ich mich? Wer bin ich geworden?',
    color: '#6B8F71',
    accent: 'rgba(107,143,113,0.12)',
  },
  '5_years': {
    label: 'In 5 Jahren',
    question: 'Wie sieht mein konkreter Alltag aus? Was habe ich aufgebaut?',
    color: '#4A7FA5',
    accent: 'rgba(74,127,165,0.12)',
  },
  '3_years': {
    label: 'In 3 Jahren',
    question: 'Welche großen Veränderungen habe ich angestoßen?',
    color: '#C4A882',
    accent: 'rgba(196,168,130,0.15)',
  },
}
