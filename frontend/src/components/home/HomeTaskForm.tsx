import React, { useState } from 'react'
import { HomeRoom } from '../../api/home'
import BottomSheet from '../ui/BottomSheet'

interface FormData {
  room_id: number
  title: string
  frequency_days: string
  last_done: string
  priority: number
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: FormData) => Promise<void>
  rooms: HomeRoom[]
  defaultRoomId?: number
}

const FREQ_OPTIONS = [
  { label: 'Kein', value: '' },
  { label: 'Täglich', value: '1' },
  { label: '3 Tage', value: '3' },
  { label: '1 Woche', value: '7' },
  { label: '2 Wochen', value: '14' },
  { label: '1 Monat', value: '30' },
]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function HomeTaskForm({ open, onClose, onSubmit, rooms, defaultRoomId }: Props) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormData>({
    room_id: defaultRoomId ?? rooms[0]?.id ?? 0,
    title: '',
    frequency_days: '7',
    last_done: todayStr(),
    priority: 2,
  })

  function reset() {
    setForm({
      room_id: defaultRoomId ?? rooms[0]?.id ?? 0,
      title: '',
      frequency_days: '7',
      last_done: todayStr(),
      priority: 2,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await onSubmit(form)
      reset()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={() => { reset(); onClose() }} title="Aufgabe hinzufügen">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Raum</label>
          <select
            className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-[var(--color-surface)]"
            value={form.room_id}
            onChange={(e) => setForm({ ...form, room_id: Number(e.target.value) })}
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.icon} {r.name}
              </option>
            ))}
          </select>
        </div>

        <input
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
          placeholder="Aufgabenbeschreibung..."
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          autoFocus
          required
        />

        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-2 block">Wiederholung</label>
          <div className="flex flex-wrap gap-2">
            {FREQ_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, frequency_days: opt.value })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  form.frequency_days === opt.value
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-muted)] text-[var(--color-text-muted)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {form.frequency_days && (
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">
              Zuletzt erledigt
              <span className="ml-1 text-[var(--color-text-muted)] font-normal">
                → nächste Fälligkeit wird berechnet
              </span>
            </label>
            <input
              type="date"
              max={todayStr()}
              className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
              value={form.last_done}
              onChange={(e) => setForm({ ...form, last_done: e.target.value })}
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { reset(); onClose() }}
            className="flex-1 py-3 rounded-xl border border-[var(--color-muted)] text-sm font-medium"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium disabled:opacity-60"
          >
            {saving ? '…' : 'Hinzufügen'}
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}
