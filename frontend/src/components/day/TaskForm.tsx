import React, { useState } from 'react'
import { DayTask, CATEGORIES, PRIORITY_COLORS } from '../../api/day'
import BottomSheet from '../ui/BottomSheet'

interface FormData {
  title: string
  date: string
  time_from: string
  time_to: string
  all_day: boolean
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
  initialData?: DayTask
}

const PRIORITY_LABELS: Record<number, string> = { 1: 'Hoch', 2: 'Mittel', 3: 'Niedrig' }
const REPEAT_OPTIONS = [
  { label: 'Nicht', value: '' },
  { label: 'Täglich', value: '1' },
  { label: '3 Tage', value: '3' },
  { label: '1 Woche', value: '7' },
  { label: '2 Wochen', value: '14' },
]

function buildInitial(date: string, initialData?: DayTask): FormData {
  if (initialData) {
    return {
      title: initialData.title,
      date: initialData.date,
      time_from: initialData.time_from ?? '',
      time_to: initialData.time_to ?? '',
      all_day: !initialData.time_from,
      category: initialData.category ?? 'personal',
      priority: initialData.priority,
      notes: initialData.notes ?? '',
      repeat_days: initialData.repeat_days?.toString() ?? '',
    }
  }
  return { title: '', date, time_from: '', time_to: '', all_day: false, category: 'personal', priority: 2, notes: '', repeat_days: '' }
}

export default function TaskForm({ open, onClose, onSubmit, date, initialData }: Props) {
  const editMode = !!initialData
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormData>(() => buildInitial(date, initialData))

  // re-sync when the edited task changes
  React.useEffect(() => {
    setForm(buildInitial(date, initialData))
  }, [initialData?.id, date])

  function set(patch: Partial<FormData>) {
    setForm(f => ({ ...f, ...patch }))
  }

  function reset() {
    setForm(buildInitial(date, undefined))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await onSubmit(form)
      if (!editMode) reset()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={() => { if (!editMode) reset(); onClose() }} title={editMode ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Title */}
        <input
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
          placeholder="Was planst du?"
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          autoFocus
          required
        />

        {/* Date + all-day */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Datum</label>
            <input
              type="date"
              className="w-full p-2.5 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
              value={form.date}
              onChange={(e) => set({ date: e.target.value })}
            />
          </div>
          <div className="flex-shrink-0 mt-5">
            <button
              type="button"
              onClick={() => set({ all_day: !form.all_day, time_from: '', time_to: '' })}
              className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-colors ${
                form.all_day
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                  : 'border-[var(--color-muted)] text-[var(--color-text-muted)]'
              }`}
            >
              Ganztätig
            </button>
          </div>
        </div>

        {/* Time fields — hidden when all-day */}
        {!form.all_day && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Von</label>
              <input
                type="time"
                className="w-full p-2.5 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
                value={form.time_from}
                onChange={(e) => set({ time_from: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Bis</label>
              <input
                type="time"
                className="w-full p-2.5 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
                value={form.time_to}
                onChange={(e) => set({ time_to: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Category */}
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-2 block">Kategorie</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                type="button"
                onClick={() => set({ category: key })}
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

        {/* Priority */}
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-2 block">Priorität</label>
          <div className="flex gap-2">
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set({ priority: p })}
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

        {/* Repeat */}
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-2 block">Wiederholen</label>
          <div className="flex flex-wrap gap-2">
            {REPEAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set({ repeat_days: opt.value })}
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

        {/* Notes */}
        <textarea
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm resize-none bg-transparent"
          placeholder="Notizen (optional)"
          rows={2}
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { if (!editMode) reset(); onClose() }}
            className="flex-1 py-3 rounded-xl border border-[var(--color-muted)] text-sm font-medium"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium disabled:opacity-60 transition-opacity"
          >
            {saving ? '…' : editMode ? 'Speichern' : 'Hinzufügen'}
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}
