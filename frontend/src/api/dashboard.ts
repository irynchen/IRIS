import api from './client'

export interface SmartTask {
  id: number
  title: string
  area_name: string
  area_icon: string | null
  area_slug: string
  room_id: number | null
  next_due: string | null
  priority: number
  duration: string | null
  energy_level: string | null
  slot: string
  slot_label: string
  slot_icon: string
}

export interface SmartDayResponse {
  tasks: SmartTask[]
  health_logged_today: boolean
  overdue_total: number
}

export async function fetchSmartDay(): Promise<SmartDayResponse> {
  const res = await api.get<SmartDayResponse>('/dashboard/smart')
  return res.data
}

export async function markSmartTaskDone(task: SmartTask): Promise<void> {
  if (task.area_slug === 'home') {
    await api.post(`/home/tasks/${task.id}/done`)
  } else {
    await api.post(`/tasks/${task.area_slug}/${task.id}/done`)
  }
}
