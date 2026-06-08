import api from './client'

export type TaskStatus = 'ok' | 'due_soon' | 'overdue'

export interface AreaInfo {
  id: number
  slug: string
  name: string
  icon: string | null
  color: string | null
  has_rooms: boolean
}

export interface AreaCategory {
  id: number
  name: string
  icon: string | null
  sort_order: number
}

export interface AreaTask {
  id: number
  area_id: number
  category_id: number | null
  room_id: number | null
  title: string
  notes: string | null
  priority: number
  duration: string | null
  energy_level: string | null
  frequency_days: number | null
  last_done: string | null
  next_due: string | null
  status: TaskStatus
}

export async function fetchAreaInfo(slug: string): Promise<AreaInfo> {
  const res = await api.get<AreaInfo>(`/tasks/${slug}/info`)
  return res.data
}

export async function fetchAreaCategories(slug: string): Promise<AreaCategory[]> {
  const res = await api.get<AreaCategory[]>(`/tasks/${slug}/categories`)
  return res.data
}

export async function fetchAreaTasks(slug: string, categoryId?: number): Promise<AreaTask[]> {
  const url = categoryId ? `/tasks/${slug}?category_id=${categoryId}` : `/tasks/${slug}`
  const res = await api.get<AreaTask[]>(url)
  return res.data
}

export async function createAreaTask(slug: string, payload: {
  title: string
  category_id?: number | null
  priority?: number
  notes?: string | null
  duration?: string | null
  energy_level?: string | null
  frequency_days?: number | null
  last_done?: string | null
}): Promise<AreaTask> {
  const res = await api.post<AreaTask>(`/tasks/${slug}`, payload)
  return res.data
}

export async function markAreaTaskDone(slug: string, taskId: number): Promise<AreaTask> {
  const res = await api.post<AreaTask>(`/tasks/${slug}/${taskId}/done`)
  return res.data
}

export async function patchAreaTask(slug: string, taskId: number, payload: Partial<AreaTask>): Promise<AreaTask> {
  const res = await api.patch<AreaTask>(`/tasks/${slug}/${taskId}`, payload)
  return res.data
}

export async function deleteAreaTask(slug: string, taskId: number): Promise<void> {
  await api.delete(`/tasks/${slug}/${taskId}`)
}
