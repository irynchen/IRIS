import api from './client'

export interface BPReading {
  id: number
  measured_at: string
  systolic: number
  diastolic: number
  pulse?: number | null
  notes?: string | null
  status?: 'normal' | 'elevated' | 'high' | null
}

export type BPReadingCreate = Omit<BPReading, 'id' | 'status'>

export interface BPStats {
  period_days: number
  count: number
  avg_systolic?: number | null
  avg_diastolic?: number | null
  latest?: BPReading | null
}

export const bpApi = {
  list: (from?: string, to?: string, limit?: number) =>
    api.get<BPReading[]>('/health/bp/readings', { params: { from, to, limit } }).then(r => r.data),
  create: (data: BPReadingCreate) =>
    api.post<BPReading>('/health/bp/readings', data).then(r => r.data),
  update: (id: number, data: Partial<BPReadingCreate>) =>
    api.patch<BPReading>(`/health/bp/readings/${id}`, data).then(r => r.data),
  remove: (id: number) =>
    api.delete(`/health/bp/readings/${id}`).then(r => r.data),
  getStats: (days = 30) =>
    api.get<BPStats>('/health/bp/stats', { params: { days } }).then(r => r.data),
  async exportPdf(from?: string, to?: string) {
    const res = await api.get('/health/bp/export/pdf', {
      params: { from, to },
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `blutdruck_${from ?? 'alle'}_${to ?? 'alle'}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  },
}
