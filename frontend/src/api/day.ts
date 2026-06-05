import api from './client'

export interface DayTask {
  id: number
  date: string
  time_from: string | null
  time_to: string | null
  title: string
  category: string | null
  priority: number
  completed: boolean
  notes: string | null
  repeat_days: number | null
  parent_id: number | null
  created_at: string | null
}

export interface DayStats {
  total: number
  done: number
}

export const CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  work:     { label: 'Arbeit',     icon: '💼', color: '#4A7FA5' },
  health:   { label: 'Gesundheit', icon: '💚', color: '#6B8F71' },
  home:     { label: 'Zuhause',    icon: '🏡', color: '#C4A882' },
  learning: { label: 'Lernen',     icon: '📚', color: '#8B7BA8' },
  rest:     { label: 'Erholung',   icon: '🌿', color: '#7EB5A6' },
  food:     { label: 'Essen',      icon: '🥗', color: '#D4956A' },
  personal: { label: 'Persönlich', icon: '✨', color: '#A8956B' },
}

export const PRIORITY_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#f59e0b',
  3: '#9ca3af',
}

export async function fetchTasks(date: string): Promise<DayTask[]> {
  const res = await api.get<DayTask[]>(`/day/plans?date=${date}`)
  return res.data
}

export async function fetchStats(date: string): Promise<DayStats> {
  const res = await api.get<DayStats>(`/day/stats?date=${date}`)
  return res.data
}

export async function createTask(payload: Partial<DayTask>): Promise<DayTask> {
  const res = await api.post<DayTask>('/day/plans', payload)
  return res.data
}

export async function patchTask(id: number, payload: Partial<DayTask>): Promise<DayTask> {
  const res = await api.patch<DayTask>(`/day/plans/${id}`, payload)
  return res.data
}

export async function deleteTask(id: number): Promise<void> {
  await api.delete(`/day/plans/${id}`)
}
