import api from './client'

export type TaskStatus = 'ok' | 'due_soon' | 'overdue'

export interface HomeRoom {
  id: number
  name: string
  icon: string | null
  sort_order: number
}

export interface HomeTask {
  id: number
  room_id: number
  title: string
  frequency_days: number | null
  last_done: string | null
  next_due: string | null
  priority: number
  notes: string | null
  status: TaskStatus
}

export async function fetchRooms(): Promise<HomeRoom[]> {
  const res = await api.get<HomeRoom[]>('/home/rooms')
  return res.data
}

export async function fetchTasks(roomId?: number): Promise<HomeTask[]> {
  const url = roomId ? `/home/tasks?room_id=${roomId}` : '/home/tasks'
  const res = await api.get<HomeTask[]>(url)
  return res.data
}

export async function fetchTodayTasks(): Promise<HomeTask[]> {
  const res = await api.get<HomeTask[]>('/home/today')
  return res.data
}

export async function markDone(taskId: number): Promise<HomeTask> {
  const res = await api.post<HomeTask>(`/home/tasks/${taskId}/done`)
  return res.data
}

export async function createTask(payload: {
  room_id: number
  title: string
  frequency_days?: number | null
  priority?: number
  notes?: string | null
}): Promise<HomeTask> {
  const res = await api.post<HomeTask>('/home/tasks', payload)
  return res.data
}

export async function patchTask(id: number, payload: Partial<HomeTask>): Promise<HomeTask> {
  const res = await api.patch<HomeTask>(`/home/tasks/${id}`, payload)
  return res.data
}

export async function deleteTask(id: number): Promise<void> {
  await api.delete(`/home/tasks/${id}`)
}

export async function fetchOverdueCount(): Promise<number> {
  const res = await api.get<{ count: number }>('/home/overdue-count')
  return res.data.count
}
