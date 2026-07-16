import api from './client'

export type SessionMode = 'crisis' | 'importance' | 'transurfing' | 'pendulum'

export interface PsychSession {
  id: number
  mode: SessionMode
  title: string | null
  data: Record<string, unknown>
  created_at: string
}

export interface PsychItem {
  id: number
  type: string
  data: Record<string, unknown>
  active: boolean
  created_at: string
}

export const psychApi = {
  // Sessions
  getSessions: (mode?: string): Promise<PsychSession[]> =>
    api.get('/psychology/sessions', { params: mode ? { mode } : {} }).then((r) => r.data),

  createSession: (mode: string, title: string | null, data: Record<string, unknown>): Promise<PsychSession> =>
    api.post('/psychology/sessions', { mode, title, data }).then((r) => r.data),

  updateSession: (id: number, mode: string, title: string | null, data: Record<string, unknown>): Promise<PsychSession> =>
    api.patch(`/psychology/sessions/${id}`, { mode, title, data }).then((r) => r.data),

  deleteSession: (id: number): Promise<void> =>
    api.delete(`/psychology/sessions/${id}`),

  // Items
  getItems: (type?: string): Promise<PsychItem[]> =>
    api.get('/psychology/items', { params: type ? { type } : {} }).then((r) => r.data),

  createItem: (type: string, data: Record<string, unknown>): Promise<PsychItem> =>
    api.post('/psychology/items', { type, data }).then((r) => r.data),

  updateItem: (id: number, patch: { data?: Record<string, unknown>; active?: boolean }): Promise<PsychItem> =>
    api.patch(`/psychology/items/${id}`, patch).then((r) => r.data),

  deleteItem: (id: number): Promise<void> =>
    api.delete(`/psychology/items/${id}`),

  // Claude analysis
  analyze: (situation: string, importance: number, what_remains: string): Promise<{ text: string }> =>
    api.post('/psychology/analyze', { situation, importance, what_remains }).then((r) => r.data),

  generateAffirmations: (): Promise<{ affirmations: string[] }> =>
    api.post('/psychology/generate-affirmations').then((r) => r.data),
}
