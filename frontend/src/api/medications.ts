import api from './client'

export interface Medication {
  id: number
  name: string
  dosage: string | null
  frequency: string | null
  stock_count: number | null
  notes: string | null
  active: boolean
  created_at: string | null
}

export const medicationsApi = {
  list: (): Promise<Medication[]> => api.get('/medications').then(r => r.data),
  create: (data: Partial<Medication>): Promise<Medication> =>
    api.post('/medications', data).then(r => r.data),
  update: (id: number, data: Partial<Medication>): Promise<Medication> =>
    api.patch(`/medications/${id}`, data).then(r => r.data),
  delete: (id: number): Promise<void> =>
    api.delete(`/medications/${id}`).then(r => r.data),
}
