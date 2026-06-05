import React, { useEffect, useState } from 'react'
import { HomeRoom, HomeTask } from '../../api/home'
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
  editTask?: HomeTask   // if set → edit mode
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

function emptyForm(defaultRoomId?: number, rooms?: HomeRoom[]): FormData {
  return {
    room_id: defaultRoomId ?? rooms?.[0]?.id ?? 0,
    title: '',
    frequency_days: '7',
    last_done: todayStr(),
    priority: 2,
  }
}

export default function HomeTaskForm({ open, onClose, onSubmit, rooms, defaultRoomId, editTask }: Props) {
  const isEdit = !!editTask
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormData>(emptyForm(defaultRoomId, rooms))

  // sync form when editTask changes
  useEffect(() => {
    if (editTask) {
      setForm({
        room_id: editTask.room_id,
        title: editTask.title,
        frequency_days: editTask.frequency_days ? String(editTask.frequency_days) : '',
        last_done: editTask.last_done ?? '',
        priority: editTask.priority,
      })
    } else {
      setForm(emptyForm(defaultRoomId, rooms))
    }
  }, [editTask, open])

  function reset() {
    setForm(emptyForm(defaultRoomId, rooms))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await onSubmit(form)
      if (!isEdit) reset()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    // clear last_done so task is treated as never done
    setSaving(true)
    try {
      await onSubmit({ ...form, last_done: '' })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => { reset(); onClose() }}
      title={isEdit ? 'Aufgabe bearbeiten' : 'Aufgabe hinzufügen'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isEdit && (
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
        )}

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
            </label>
            <input
              type="date"
              max={todayStr()}
              className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
              value={form.last_done}
              onChange={(e) => setForm({ ...form, last_done: e.target.value })}
            />
            {form.last_done && form.frequency_days && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                → nächste Fälligkeit:{' '}
                {new Date(
                  new Date(form.last_done + 'T00:00:00').getTime() +
                    Number(form.frequency_days) * 86400000
                ).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}
              </p>
            )}
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
            {saving ? '…' : isEdit ? 'Speichern' : 'Hinzufügen'}
          </button>
        </div>

        {isEdit && editTask?.last_done && (
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="w-full py-2.5 text-sm text-amber-600 border border-amber-200 rounded-xl hover:bg-amber-50 transition-colors"
          >
            ↺ Als nicht erledigt markieren
          </button>
        )}
      </form>
    </BottomSheet>
  )
}
