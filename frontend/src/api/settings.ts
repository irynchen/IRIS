import api from './client'

export interface AppSettings {
  anthropic_api_key: string
  anthropic_api_key_set: boolean
  notify_hour: string
}

export const settingsApi = {
  get: (): Promise<AppSettings> => api.get('/settings').then((r) => r.data),
  update: (data: Partial<Record<string, string>>): Promise<void> => api.put('/settings', data),
}
