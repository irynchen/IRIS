import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Doctor, Appointment, doctorsApi } from '../api/doctors'
import BottomSheet from '../components/ui/BottomSheet'

const STATUS_LABEL: Record<string, string> = {
  planned: 'Geplant',
  done: 'Erledigt',
  cancelled: 'Abgesagt',
}
const STATUS_COLOR: Record<string, string> = {
  planned: 'text-[var(--color-accent)]',
  done: 'text-[var(--color-primary)]',
  cancelled: 'text-[var(--color-text-muted)] line-through',
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('de-DE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ── Doctor form ────────────────────────────────────────────────────────────────
interface DoctorFormProps {
  open: boolean
  onClose: () => void
  initial?: Doctor | null
  onSaved: (d: Doctor) => void
}

function DoctorForm({ open, onClose, initial, onSaved }: DoctorFormProps) {
  const editMode = !!initial
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', specialty: '', phone: '', email: '', address: '', notes: '',
  })

  useEffect(() => {
    setForm({
      name: initial?.name ?? '',
      specialty: initial?.specialty ?? '',
      phone: initial?.phone ?? '',
      email: initial?.email ?? '',
      address: initial?.address ?? '',
      notes: initial?.notes ?? '',
    })
  }, [initial?.id, open])

  function set(patch: Partial<typeof form>) {
    setForm(f => ({ ...f, ...patch }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        specialty: form.specialty || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        notes: form.notes || null,
      }
      const saved = editMode
        ? await doctorsApi.update(initial!.id, payload)
        : await doctorsApi.create(payload)
      onSaved(saved)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={editMode ? 'Arzt bearbeiten' : 'Neuer Arzt'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
          placeholder="Name *"
          value={form.name}
          onChange={e => set({ name: e.target.value })}
          required autoFocus
        />
        <input
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
          placeholder="Fachgebiet (z.B. Kardiologie)"
          value={form.specialty}
          onChange={e => set({ specialty: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            className="p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
            placeholder="Telefon"
            type="tel"
            value={form.phone}
            onChange={e => set({ phone: e.target.value })}
          />
          <input
            className="p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
            placeholder="E-Mail"
            type="email"
            value={form.email}
            onChange={e => set({ email: e.target.value })}
          />
        </div>
        <input
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
          placeholder="Adresse"
          value={form.address}
          onChange={e => set({ address: e.target.value })}
        />
        <textarea
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm resize-none bg-transparent"
          placeholder="Notizen"
          rows={2}
          value={form.notes}
          onChange={e => set({ notes: e.target.value })}
        />
        <div className="flex gap-3 mt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[var(--color-muted)] text-sm font-medium">
            Abbrechen
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium disabled:opacity-60">
            {saving ? '…' : editMode ? 'Speichern' : 'Hinzufügen'}
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}

// ── Appointment form ───────────────────────────────────────────────────────────
interface ApptFormProps {
  open: boolean
  onClose: () => void
  doctorId: number
  initial?: Appointment | null
  onSaved: (a: Appointment) => void
}

function AppointmentForm({ open, onClose, doctorId, initial, onSaved }: ApptFormProps) {
  const editMode = !!initial
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: '',
    reason: '',
    notes: '',
    status: 'planned' as 'planned' | 'done' | 'cancelled',
  })

  useEffect(() => {
    setForm({
      date: initial?.date ?? new Date().toISOString().slice(0, 10),
      time: initial?.time ?? '',
      reason: initial?.reason ?? '',
      notes: initial?.notes ?? '',
      status: (initial?.status ?? 'planned') as 'planned' | 'done' | 'cancelled',
    })
  }, [initial?.id, open])

  function set(patch: Partial<typeof form>) {
    setForm(f => ({ ...f, ...patch }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.date) return
    setSaving(true)
    try {
      const payload = {
        date: form.date,
        time: form.time || null,
        reason: form.reason || null,
        notes: form.notes || null,
        status: form.status,
      }
      const saved = editMode
        ? await doctorsApi.updateAppointment(initial!.id, payload)
        : await doctorsApi.createAppointment(doctorId, payload)
      onSaved(saved)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={editMode ? 'Termin bearbeiten' : 'Neuer Termin'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Datum *</label>
            <input
              type="date"
              className="w-full p-2.5 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
              value={form.date}
              onChange={e => set({ date: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Uhrzeit</label>
            <input
              type="time"
              className="w-full p-2.5 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
              value={form.time}
              onChange={e => set({ time: e.target.value })}
            />
          </div>
        </div>
        <input
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
          placeholder="Grund / Beschreibung"
          value={form.reason}
          onChange={e => set({ reason: e.target.value })}
        />
        <textarea
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm resize-none bg-transparent"
          placeholder="Notizen"
          rows={2}
          value={form.notes}
          onChange={e => set({ notes: e.target.value })}
        />
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-2 block">Status</label>
          <div className="flex gap-2">
            {(['planned', 'done', 'cancelled'] as const).map(s => (
              <button key={s} type="button" onClick={() => set({ status: s })}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                  form.status === s
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-muted)] text-[var(--color-text-muted)]'
                }`}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 mt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[var(--color-muted)] text-sm font-medium">
            Abbrechen
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium disabled:opacity-60">
            {saving ? '…' : editMode ? 'Speichern' : 'Hinzufügen'}
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}

// ── Doctor card ────────────────────────────────────────────────────────────────
interface DoctorCardProps {
  doctor: Doctor
  onEdit: (d: Doctor) => void
  onDelete: (id: number) => void
  onAddAppt: (d: Doctor) => void
  onEditAppt: (a: Appointment) => void
  onDeleteAppt: (id: number) => void
}

function DoctorCard({ doctor, onEdit, onDelete, onAddAppt, onEditAppt, onDeleteAppt }: DoctorCardProps) {
  const [expanded, setExpanded] = useState(false)
  const upcoming = (doctor.appointments ?? [])
    .filter(a => a.status === 'planned')
    .sort((a, b) => a.date.localeCompare(b.date))
  const past = (doctor.appointments ?? [])
    .filter(a => a.status !== 'planned')
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3" onClick={() => setExpanded(e => !e)}>
        <div className="w-10 h-10 rounded-full bg-[var(--color-muted)] flex items-center justify-center text-lg flex-shrink-0">
          🩺
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{doctor.name}</p>
          {doctor.specialty && (
            <p className="text-xs text-[var(--color-text-muted)]">{doctor.specialty}</p>
          )}
          {upcoming.length > 0 && (
            <p className="text-xs text-[var(--color-accent)] mt-0.5 font-medium">
              Nächster Termin: {formatDate(upcoming[0].date)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); onEdit(doctor) }}
            className="text-[var(--color-text-muted)] text-sm px-2 py-1 hover:text-[var(--color-primary)]">
            ✎
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(doctor.id) }}
            className="text-[var(--color-text-muted)] text-sm px-2 py-1 hover:text-red-400">
            ×
          </button>
          <span className="text-[var(--color-text-muted)] text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--color-muted)] px-4 py-3">
          {/* Contact info */}
          {(doctor.phone || doctor.email || doctor.address) && (
            <div className="flex flex-col gap-1 mb-3 text-xs text-[var(--color-text-muted)]">
              {doctor.phone && (
                <a href={`tel:${doctor.phone}`} className="flex items-center gap-1 hover:text-[var(--color-primary)]">
                  📞 {doctor.phone}
                </a>
              )}
              {doctor.email && (
                <a href={`mailto:${doctor.email}`} className="flex items-center gap-1 hover:text-[var(--color-primary)]">
                  ✉ {doctor.email}
                </a>
              )}
              {doctor.address && (
                <span className="flex items-center gap-1">📍 {doctor.address}</span>
              )}
            </div>
          )}
          {doctor.notes && (
            <p className="text-xs text-[var(--color-text-muted)] mb-3 italic">{doctor.notes}</p>
          )}

          {/* Appointments */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Termine</p>
            <button
              onClick={() => onAddAppt(doctor)}
              className="text-xs text-[var(--color-primary)] font-medium hover:opacity-80"
            >
              + Termin
            </button>
          </div>

          {upcoming.length === 0 && past.length === 0 && (
            <p className="text-xs text-[var(--color-text-muted)] italic">Noch keine Termine</p>
          )}

          <div className="flex flex-col gap-1.5">
            {upcoming.map(a => (
              <div key={a.id} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] flex-shrink-0" />
                <span className="font-medium">{formatDate(a.date)}</span>
                {a.time && <span className="text-[var(--color-text-muted)]">{a.time}</span>}
                {a.reason && <span className="text-[var(--color-text-muted)] truncate flex-1">{a.reason}</span>}
                <button onClick={() => onEditAppt(a)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] px-1">✎</button>
                <button onClick={() => onDeleteAppt(a.id)}
                  className="text-[var(--color-text-muted)] hover:text-red-400 px-1">×</button>
              </div>
            ))}
            {past.map(a => (
              <div key={a.id} className={`flex items-center gap-2 text-xs opacity-50`}>
                <span className="w-2 h-2 rounded-full bg-[var(--color-muted)] flex-shrink-0" />
                <span className={STATUS_COLOR[a.status]}>{formatDate(a.date)}</span>
                {a.time && <span>{a.time}</span>}
                {a.reason && <span className="truncate flex-1">{a.reason}</span>}
                <span className="text-[var(--color-text-muted)]">{STATUS_LABEL[a.status]}</span>
                <button onClick={() => onEditAppt(a)}
                  className="hover:text-[var(--color-primary)] px-1">✎</button>
                <button onClick={() => onDeleteAppt(a.id)}
                  className="hover:text-red-400 px-1">×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function DoctorsPage() {
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [showDoctorForm, setShowDoctorForm] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [showApptForm, setShowApptForm] = useState(false)
  const [apptDoctorId, setApptDoctorId] = useState<number | null>(null)
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null)

  useEffect(() => { loadDoctors() }, [])

  async function loadDoctors() {
    setLoading(true)
    try {
      const list = await doctorsApi.list()
      // load appointments for each doctor
      const withAppts = await Promise.all(
        list.map(d => doctorsApi.get(d.id))
      )
      setDoctors(withAppts)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  function handleDoctorSaved(saved: Doctor) {
    // reload to get appointments
    doctorsApi.get(saved.id).then(d => {
      setDoctors(prev => {
        const exists = prev.find(x => x.id === d.id)
        return exists
          ? prev.map(x => x.id === d.id ? d : x)
          : [...prev, d]
      })
    })
  }

  async function handleDeleteDoctor(id: number) {
    if (!confirm('Arzt löschen?')) return
    await doctorsApi.delete(id)
    setDoctors(prev => prev.filter(d => d.id !== id))
  }

  function handleAddAppt(doctor: Doctor) {
    setApptDoctorId(doctor.id)
    setEditingAppt(null)
    setShowApptForm(true)
  }

  function handleEditAppt(appt: Appointment) {
    setApptDoctorId(appt.doctor_id)
    setEditingAppt(appt)
    setShowApptForm(true)
  }

  function handleApptSaved(saved: Appointment) {
    setDoctors(prev => prev.map(d => {
      if (d.id !== saved.doctor_id) return d
      const appts = d.appointments ?? []
      const exists = appts.find(a => a.id === saved.id)
      return {
        ...d,
        appointments: exists
          ? appts.map(a => a.id === saved.id ? saved : a)
          : [...appts, saved],
      }
    }))
  }

  async function handleDeleteAppt(id: number) {
    await doctorsApi.deleteAppointment(id)
    setDoctors(prev => prev.map(d => ({
      ...d,
      appointments: (d.appointments ?? []).filter(a => a.id !== id),
    })))
  }

  const upcoming = doctors
    .flatMap(d => (d.appointments ?? [])
      .filter(a => a.status === 'planned' && a.date >= new Date().toISOString().slice(0, 10))
      .map(a => ({ ...a, doctorName: d.name }))
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg)] border-b border-[var(--color-muted)] px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate('/health')}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-sm">
            ← Gesundheit
          </button>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Meine Ärzte
          </h1>
          <button
            onClick={() => { setEditingDoctor(null); setShowDoctorForm(true) }}
            className="bg-[var(--color-primary)] text-white rounded-full w-9 h-9 flex items-center justify-center text-lg font-light hover:opacity-90"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full flex flex-col gap-4">
        {/* Upcoming appointments */}
        {upcoming.length > 0 && (
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-[var(--shadow-card)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
              Nächste Termine
            </p>
            {upcoming.map(a => (
              <div key={a.id} className="flex items-center gap-3 py-1.5 border-b border-[var(--color-muted)] last:border-0">
                <span className="text-lg">📅</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{formatDate(a.date)}{a.time ? ` – ${a.time}` : ''}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {a.doctorName}{a.reason ? ` · ${a.reason}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Doctor list */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-[var(--color-surface)] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <p className="text-4xl mb-3">🩺</p>
            <p className="text-sm">Noch keine Ärzte eingetragen</p>
            <button
              onClick={() => setShowDoctorForm(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium"
            >
              Arzt hinzufügen
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {doctors.map(d => (
              <DoctorCard
                key={d.id}
                doctor={d}
                onEdit={doc => { setEditingDoctor(doc); setShowDoctorForm(true) }}
                onDelete={handleDeleteDoctor}
                onAddAppt={handleAddAppt}
                onEditAppt={handleEditAppt}
                onDeleteAppt={handleDeleteAppt}
              />
            ))}
          </div>
        )}
      </div>

      <DoctorForm
        open={showDoctorForm}
        onClose={() => setShowDoctorForm(false)}
        initial={editingDoctor}
        onSaved={handleDoctorSaved}
      />
      <AppointmentForm
        open={showApptForm}
        onClose={() => setShowApptForm(false)}
        doctorId={apptDoctorId ?? 0}
        initial={editingAppt}
        onSaved={handleApptSaved}
      />
    </div>
  )
}
