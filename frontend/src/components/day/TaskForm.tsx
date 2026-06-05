import React, { useState } from 'react'
import { CATEGORIES, PRIORITY_COLORS } from '../../api/day'
import BottomSheet from '../ui/BottomSheet'

interface FormData {
  title: string
  time_from: string
  time_to: string
  category: string
  priority: number
  notes: string
  repeat_days: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: FormData) => Promise<void>
  date: string
}

const PRIORITY_LABELS: Record<number, string> = { 1: 'Hoch', 2: 'Mittel', 3: 'Niedrig' }
const REPEAT_OPTIONS = [
  { label: 'Nicht', value: '' },
  { label: 'Täglich', value: '1' },
  { label: '3 Tage', value: '3' },
  { label: '1 Woche', value: '7' },
  { label: '2 Wochen', value: '14' },
]

export default function TaskForm({ open, onClose, onSubmit, date }: Props) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormData>({
    title: '',
    time_from: '',
    time_to: '',
    category: 'personal',
    priority: 2,
    notes: '',
    repeat_days: '',
  })

  function reset() {
    setForm({ title: '', time_from: '', time_to: '', category: 'personal', priority: 2, notes: '', repeat_days: '' })
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
    <BottomSheet open={open} onClose={() => { reset(); onClose() }} title="Neue Aufgabe">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
          placeholder="Was planst du?"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          autoFocus
          required
        />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Von</label>
            <input
              type="time"
              className="w-full p-2.5 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
              value={form.time_from}
              onChange={(e) => setForm({ ...form, time_from: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Bis</label>
            <input
              type="time"
              className="w-full p-2.5 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
              value={form.time_to}
              onChange={(e) => setForm({ ...form, time_to: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-2 block">Kategorie</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm({ ...form, category: key })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={
                  form.category === key
                    ? { backgroundColor: cat.color, color: '#fff' }
                    : { backgroundColor: 'var(--color-muted)', color: 'var(--color-text-muted)' }
                }
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-2 block">Priorität</label>
          <div className="flex gap-2">
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setForm({ ...form, priority: p })}
                className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                style={
                  form.priority === p
                    ? { backgroundColor: PRIORITY_COLORS[p], color: '#fff' }
                    : { backgroundColor: 'var(--color-muted)', color: 'var(--color-text-muted)' }
                }
              >
                {PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-2 block">Wiederholen</label>
          <div className="flex flex-wrap gap-2">
            {REPEAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, repeat_days: opt.value })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  form.repeat_days === opt.value
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-muted)] text-[var(--color-text-muted)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm resize-none bg-transparent"
          placeholder="Notizen (optional)"
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />

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
            className="flex-1 py-3 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium disabled:opacity-60 transition-opacity"
          >
            {saving ? '…' : 'Hinzufügen'}
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}
