import React, { useEffect, useState } from 'react'
import { AreaTask, AreaCategory } from '../../api/tasks'
import BottomSheet from '../ui/BottomSheet'

interface FormData {
  title: string
  category_id: number | null
  priority: number
  notes: string | null
  duration: string | null
  energy_level: string | null
  frequency_days: string
  last_done: string
  next_due: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: FormData) => Promise<void>
  categories: AreaCategory[]
  editTask?: AreaTask
}

const FREQ_OPTIONS = [
  { label: 'Kein',     value: '' },
  { label: '1 Woche',  value: '7' },
  { label: '2 Wochen', value: '14' },
  { label: '1 Monat',  value: '30' },
  { label: '3 Monate', value: '90' },
  { label: '6 Monate', value: '180' },
  { label: '1 Jahr',   value: '365' },
]

const PRIORITY_OPTIONS = [
  { label: 'Niedrig', value: 1, color: '#6B8F71', bg: '#6B8F7120' },
  { label: 'Mittel',  value: 2, color: '#f59e0b', bg: '#f59e0b20' },
  { label: 'Hoch',    value: 3, color: '#ef4444', bg: '#ef444420' },
]

const DURATION_OPTIONS = [
  { label: '⚡ 15 min', value: 'short' },
  { label: '⏱ 30 min', value: 'short30' },
  { label: '🕐 1 Std',  value: 'medium' },
  { label: '⏳ 2 Std',  value: 'long' },
  { label: '⌛ 3 Std',  value: 'very_long' },
]

const ENERGY_OPTIONS = [
  { label: '🌿 Niedrig', value: 'low' },
  { label: '💛 Mittel',  value: 'medium' },
  { label: '🔥 Hoch',    value: 'high' },
]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function calcNextDue(lastDone: string, freqDays: string): string {
  if (!lastDone || !freqDays) return ''
  const d = new Date(lastDone + 'T00:00:00')
  d.setDate(d.getDate() + Number(freqDays))
  return d.toISOString().slice(0, 10)
}

function emptyForm(): FormData {
  return {
    title: '',
    category_id: null,
    priority: 2,
    notes: null,
    duration: null,
    energy_level: null,
    frequency_days: '',
    last_done: todayStr(),
    next_due: '',
  }
}

function PillGroup<T extends string | number>({
  label, options, value, onChange,
}: {
  label: string
  options: { label: string; value: T; color?: string; bg?: string }[]
  value: T | null
  onChange: (v: T | null) => void
}) {
  return (
    <div>
      <label className="text-xs text-[var(--color-text-muted)] mb-2 block">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange(active ? null : opt.value)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={
                active && opt.color
                  ? { background: opt.bg, color: opt.color, outline: `1.5px solid ${opt.color}` }
                  : active
                  ? { background: 'var(--color-primary)', color: '#fff' }
                  : { background: 'var(--color-muted)', color: 'var(--color-text-muted)' }
              }
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function AreaTaskForm({ open, onClose, onSubmit, categories, editTask }: Props) {
  const isEdit = !!editTask
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormData>(emptyForm())
  const [nextDueManual, setNextDueManual] = useState(false)

  useEffect(() => {
    if (editTask) {
      setNextDueManual(true)
      setForm({
        title:         editTask.title,
        category_id:   editTask.category_id ?? null,
        priority:      editTask.priority,
        notes:         editTask.notes ?? null,
        duration:      editTask.duration ?? null,
        energy_level:  editTask.energy_level ?? null,
        frequency_days:editTask.frequency_days ? String(editTask.frequency_days) : '',
        last_done:     editTask.last_done ?? '',
        next_due:      editTask.next_due ?? '',
      })
    } else {
      setNextDueManual(false)
      setForm(emptyForm())
    }
  }, [editTask, open])

  function handleFreqChange(val: string) {
    const next = nextDueManual ? form.next_due : calcNextDue(form.last_done, val)
    setForm((f) => ({ ...f, frequency_days: val, next_due: next }))
  }

  function handleLastDoneChange(val: string) {
    const next = nextDueManual ? form.next_due : calcNextDue(val, form.frequency_days)
    setForm((f) => ({ ...f, last_done: val, next_due: next }))
  }

  function handleNextDueChange(val: string) {
    setNextDueManual(true)
    setForm((f) => ({ ...f, next_due: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await onSubmit(form)
      if (!isEdit) setForm(emptyForm())
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => { setForm(emptyForm()); onClose() }}
      title={isEdit ? 'Aufgabe bearbeiten' : 'Aufgabe hinzufügen'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        <input
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
          placeholder="Beschreibung…"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          autoFocus
          required
        />

        <PillGroup
          label="Priorität"
          options={PRIORITY_OPTIONS}
          value={form.priority}
          onChange={(v) => setForm({ ...form, priority: v ?? 2 })}
        />

        {categories.length > 0 && (
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Kategorie</label>
            <select
              className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-[var(--color-surface)]"
              value={form.category_id ?? ''}
              onChange={(e) => setForm({ ...form, category_id: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">— keine Kategorie —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-2 block">Wiederholung</label>
          <div className="flex flex-wrap gap-2">
            {FREQ_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleFreqChange(opt.value)}
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

        {/* Daten nebeneinander */}
        <div className="grid grid-cols-2 gap-3">
          {form.frequency_days && (
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Zuletzt erledigt</label>
              <input
                type="date"
                max={todayStr()}
                className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
                value={form.last_done}
                onChange={(e) => handleLastDoneChange(e.target.value)}
              />
            </div>
          )}
          <div className={form.frequency_days ? '' : 'col-span-2'}>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">
              Nächste Fälligkeit
              {nextDueManual && form.frequency_days && (
                <button
                  type="button"
                  className="ml-2 text-[var(--color-primary)] underline text-[10px]"
                  onClick={() => {
                    setNextDueManual(false)
                    setForm((f) => ({ ...f, next_due: calcNextDue(f.last_done, f.frequency_days) }))
                  }}
                >neu berechnen</button>
              )}
            </label>
            <input
              type="date"
              className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
              value={form.next_due}
              onChange={(e) => handleNextDueChange(e.target.value)}
            />
          </div>
        </div>

        <PillGroup
          label="Geschätzte Dauer"
          options={DURATION_OPTIONS}
          value={form.duration}
          onChange={(v) => setForm({ ...form, duration: v })}
        />

        <PillGroup
          label="Energiebedarf"
          options={ENERGY_OPTIONS}
          value={form.energy_level}
          onChange={(v) => setForm({ ...form, energy_level: v })}
        />

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => { setForm(emptyForm()); onClose() }}
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
      </form>
    </BottomSheet>
  )
}
