import api from './client'

export interface CalendarEvent {
  id: string
  type: 'day_plan' | 'task' | 'appointment'
  date: string
  time_from: string | null
  time_to: string | null
  title: string
  color: string
  area_icon: string | null
  area_slug: string | null
  priority: number | null
  completed: boolean | null
  source_id: number
}

export function fetchCalendarEvents(from: string, to: string): Promise<CalendarEvent[]> {
  return api.get(`/calendar/events?from=${from}&to=${to}`).then((r) => r.data)
}
