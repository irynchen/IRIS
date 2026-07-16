import api from './client'

export interface RecurringEvent {
  id: number
  title: string
  weekdays: number[]   // 0=Mo…6=So
  time_from: string | null
  time_to: string | null
  color: string
  active: boolean
}

export const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export const COLOR_OPTIONS = [
  { label: 'Lila',   value: '#9B7EBD' },
  { label: 'Grün',   value: '#6B8F71' },
  { label: 'Blau',   value: '#4A7FA5' },
  { label: 'Orange', value: '#D4956A' },
  { label: 'Rosa',   value: '#D4697C' },
  { label: 'Braun',  value: '#8B7355' },
]

export function fetchRecurring(): Promise<RecurringEvent[]> {
  return api.get('/recurring').then(r => r.data)
}
export function createRecurring(data: Omit<RecurringEvent, 'id' | 'active'>): Promise<RecurringEvent> {
  return api.post('/recurring', data).then(r => r.data)
}
export function deleteRecurring(id: number): Promise<void> {
  return api.delete(`/recurring/${id}`)
}
