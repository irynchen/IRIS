import React, { useEffect, useState } from 'react'
import { HomeRoom, HomeTask, HomeCategory } from '../../api/home'
import BottomSheet from '../ui/BottomSheet'

interface FormData {
  room_id: number
  title: string
  frequency_days: string
  last_done: string
  priority: number
  category_id: number | null
  duration: string | null
  energy_level: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: FormData) => Promise<void>
  rooms: HomeRoom[]
  categories: HomeCategory[]
  defaultRoomId?: number
  editTask?: HomeTask
}

const FREQ_OPTIONS = [
  { label: 'Kein',     value: '' },
  { label: 'Täglich',  value: '1' },
  { label: '3 Tage',   value: '3' },
  { label: '1 Woche',  value: '7' },
  { label: '2 Wochen', value: '14' },
  { label: '1 Monat',  value: '30' },
  { label: '3 Monate', value: '90' },
  { label: '6 Monate', value: '180' },
]

const PRIORITY_OPTIONS = [
  { label: 'Niedrig', value: 1, color: '#6B8F71', bg: '#6B8F7120' },
  { label: 'Mittel',  value: 2, color: '#f59e0b', bg: '#f59e0b20' },
  { label: 'Hoch',    value: 3, color: '#ef4444', bg: '#ef444420' },
]

const DURATION_OPTIONS = [
  { label: '⚡ 15 min', value: 'short' },
  { label: '🕐 1 Std',  value: 'medium' },
  { label: '⏳ 2 Std',  value: 'long' },
]

const ENERGY_OPTIONS = [
  { label: '🌿 Niedrig', value: 'low' },
  { label: '💛 Mittel',  value: 'medium' },
  { label: '🔥 Hoch',    value: 'high' },
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
    category_id: null,
    duration: null,
    energy_level: null,
  }
}

function PillGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
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

export default function HomeTaskForm({
  open, onClose, onSubmit, rooms, categories, defaultRoomId, editTask,
}: Props) {
  const isEdit = !!editTask
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormData>(emptyForm(defaultRoomId, rooms))

  useEffect(() => {
    if (editTask) {
      setForm({
        room_id: editTask.room_id,
        title: editTask.title,
        frequency_days: editTask.frequency_days ? String(editTask.frequency_days) : '',
        last_done: editTask.last_done ?? '',
        priority: editTask.priority,
        category_id: editTask.category_id ?? null,
        duration: editTask.duration ?? null,
        energy_level: editTask.energy_level ?? null,
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

        {/* Raum — nur beim Erstellen */}
        {!isEdit && (
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Raum</label>
            <select
              className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-[var(--color-surface)]"
              value={form.room_id}
              onChange={(e) => setForm({ ...form, room_id: Number(e.target.value) })}
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Titel */}
        <input
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
          placeholder="Aufgabenbeschreibung..."
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          autoFocus
          required
        />

        {/* Priorität */}
        <PillGroup
          label="Priorität"
          options={PRIORITY_OPTIONS}
          value={form.priority}
          onChange={(v) => setForm({ ...form, priority: v ?? 2 })}
        />

        {/* Kategorie */}
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

        {/* Wiederholung */}
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

        {/* Zuletzt erledigt */}
        {form.frequency_days && (
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Zuletzt erledigt</label>
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

        {/* Dauer */}
        <PillGroup
          label="Geschätzte Dauer"
          options={DURATION_OPTIONS}
          value={form.duration}
          onChange={(v) => setForm({ ...form, duration: v })}
        />

        {/* Energiebedarf */}
        <PillGroup
          label="Energiebedarf"
          options={ENERGY_OPTIONS}
          value={form.energy_level}
          onChange={(v) => setForm({ ...form, energy_level: v })}
        />

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
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
