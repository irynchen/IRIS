import api from './client'

export interface HealthRecord {
  id: number
  date: string
  weight_kg?: number | null
  bp_morning_systolic?: number | null
  bp_morning_diastolic?: number | null
  pulse_morning?: number | null
  bp_evening_systolic?: number | null
  bp_evening_diastolic?: number | null
  pulse_evening?: number | null
  medication_taken: boolean
  medication_notes?: string | null
  sleep_hours?: number | null
  sleep_quality?: number | null
  sleep_notes?: string | null
  knee_pain?: number | null
  knee_swelling?: string | null
  knee_exercises_done: boolean
  steps?: number | null
  mood?: number | null
  energy?: number | null
  anxiety?: number | null
  notes?: string | null
  created_at?: string | null
  updated_at?: string | null
  weight_delta?: number | null
  bp_status?: string | null
}

export type HealthRecordCreate = Omit<HealthRecord, 'id' | 'created_at' | 'updated_at' | 'weight_delta' | 'bp_status'>

export interface HealthStats {
  period_days: number
  weight_start?: number | null
  weight_current?: number | null
  weight_delta?: number | null
  weight_goal: number
  weight_to_goal?: number | null
  bp_avg_systolic?: number | null
  bp_avg_diastolic?: number | null
  sleep_avg_hours?: number | null
  sleep_avg_quality?: number | null
  knee_avg_pain?: number | null
  steps_avg?: number | null
  mood_avg?: number | null
  records_count: number
  streak: number
}

export interface HealthInsight {
  type: string
  severity: 'info' | 'warning' | 'success'
  title: string
  message: string
  data?: Record<string, number> | null
}

export interface HealthGoal {
  id: number
  key: string
  target_value?: number | null
  target_value2?: number | null
  unit?: string | null
}

export const healthApi = {
  getToday: () => api.get<HealthRecord | null>('/health/records/today').then(r => r.data),
  getByDate: (date: string) => api.get<HealthRecord | null>(`/health/records/${date}`).then(r => r.data),
  getRecords: (from: string, to: string) =>
    api.get<HealthRecord[]>('/health/records', { params: { from, to } }).then(r => r.data),
  getStats: (days = 30) =>
    api.get<HealthStats>('/health/stats', { params: { days } }).then(r => r.data),
  getInsights: () => api.get<HealthInsight[]>('/health/insights').then(r => r.data),
  getChartWeight: (days = 90) =>
    api.get<{ date: string; weight: number }[]>('/health/chart/weight', { params: { days } }).then(r => r.data),
  getChartKnee: (days = 30) =>
    api.get('/health/chart/knee', { params: { days } }).then(r => r.data),
  getChartMood: (days = 30) =>
    api.get('/health/chart/mood', { params: { days } }).then(r => r.data),
  saveRecord: (data: HealthRecordCreate) =>
    api.post<HealthRecord>('/health/records', data).then(r => r.data),
  patchRecord: (date: string, data: Partial<HealthRecordCreate>) =>
    api.patch<HealthRecord>(`/health/records/${date}`, data).then(r => r.data),
  getGoals: () => api.get<HealthGoal[]>('/health/goals').then(r => r.data),
  updateGoal: (key: string, target_value: number) =>
    api.patch(`/health/goals/${key}`, { target_value }).then(r => r.data),
}
