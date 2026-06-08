import api from './client'

export interface Doctor {
  id: number
  name: string
  specialty: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string | null
  appointments?: Appointment[]
}

export interface Appointment {
  id: number
  doctor_id: number
  date: string
  time: string | null
  reason: string | null
  notes: string | null
  status: 'planned' | 'done' | 'cancelled'
  created_at: string | null
}

export const doctorsApi = {
  list: (): Promise<Doctor[]> => api.get('/doctors').then(r => r.data),
  get: (id: number): Promise<Doctor> => api.get(`/doctors/${id}`).then(r => r.data),
  create: (data: Partial<Doctor>): Promise<Doctor> =>
    api.post('/doctors', data).then(r => r.data),
  update: (id: number, data: Partial<Doctor>): Promise<Doctor> =>
    api.patch(`/doctors/${id}`, data).then(r => r.data),
  delete: (id: number): Promise<void> =>
    api.delete(`/doctors/${id}`).then(r => r.data),

  createAppointment: (doctorId: number, data: Partial<Appointment>): Promise<Appointment> =>
    api.post(`/doctors/${doctorId}/appointments`, data).then(r => r.data),
  updateAppointment: (apptId: number, data: Partial<Appointment>): Promise<Appointment> =>
    api.patch(`/doctors/appointments/${apptId}`, data).then(r => r.data),
  deleteAppointment: (apptId: number): Promise<void> =>
    api.delete(`/doctors/appointments/${apptId}`).then(r => r.data),
}
