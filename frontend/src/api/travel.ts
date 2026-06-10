import api from './client'

export type TravelStatus = 'idea' | 'planned' | 'booked' | 'done'
export type TravelSeason = 'spring' | 'summer' | 'autumn' | 'winter' | 'any'

export interface TravelIdea {
  id: number
  title: string
  country: string | null
  city: string | null
  budget_min: number | null
  budget_max: number | null
  season: TravelSeason | null
  priority: number
  status: TravelStatus
  notes: string | null
  created_at: string
}

export async function fetchIdeas(status?: TravelStatus): Promise<TravelIdea[]> {
  const url = status ? `/travel/ideas?status=${status}` : '/travel/ideas'
  const res = await api.get<TravelIdea[]>(url)
  return res.data
}

export async function createIdea(payload: Omit<TravelIdea, 'id' | 'created_at'>): Promise<TravelIdea> {
  const res = await api.post<TravelIdea>('/travel/ideas', payload)
  return res.data
}

export async function patchIdea(id: number, payload: Partial<TravelIdea>): Promise<TravelIdea> {
  const res = await api.patch<TravelIdea>(`/travel/ideas/${id}`, payload)
  return res.data
}

export async function deleteIdea(id: number): Promise<void> {
  await api.delete(`/travel/ideas/${id}`)
}
