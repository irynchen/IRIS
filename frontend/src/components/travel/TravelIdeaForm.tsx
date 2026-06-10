import React, { useEffect, useState } from 'react'
import { TravelIdea, TravelSeason, TravelStatus } from '../../api/travel'
import BottomSheet from '../ui/BottomSheet'

interface FormData {
  title: string
  country: string
  city: string
  budget_min: string
  budget_max: string
  season: TravelSeason | ''
  priority: number
  status: TravelStatus
  notes: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: FormData) => Promise<void>
  editIdea?: TravelIdea
}

const SEASON_OPTIONS: { label: string; value: TravelSeason | '' }[] = [
  { label: 'Egal',     value: 'any' },
  { label: '🌸 Frühling', value: 'spring' },
  { label: '☀️ Sommer',   value: 'summer' },
  { label: '🍂 Herbst',   value: 'autumn' },
  { label: '❄️ Winter',   value: 'winter' },
]

const PRIORITY_OPTIONS = [
  { label: 'Niedrig', value: 1, color: '#6B8F71', bg: '#6B8F7120' },
  { label: 'Mittel',  value: 2, color: '#f59e0b', bg: '#f59e0b20' },
  { label: 'Hoch',    value: 3, color: '#ef4444', bg: '#ef444420' },
]

function emptyForm(): FormData {
  return {
    title: '', country: '', city: '',
    budget_min: '', budget_max: '',
    season: '', priority: 2, status: 'idea', notes: '',
  }
}

export default function TravelIdeaForm({ open, onClose, onSubmit, editIdea }: Props) {
  const isEdit = !!editIdea
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormData>(emptyForm())

  useEffect(() => {
    if (editIdea) {
      setForm({
        title:      editIdea.title,
        country:    editIdea.country ?? '',
        city:       editIdea.city ?? '',
        budget_min: editIdea.budget_min != null ? String(editIdea.budget_min) : '',
        budget_max: editIdea.budget_max != null ? String(editIdea.budget_max) : '',
        season:     editIdea.season ?? '',
        priority:   editIdea.priority,
        status:     editIdea.status,
        notes:      editIdea.notes ?? '',
      })
    } else {
      setForm(emptyForm())
    }
  }, [editIdea, open])

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

  const set = (k: keyof FormData, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }))

  return (
    <BottomSheet
      open={open}
      onClose={() => { setForm(emptyForm()); onClose() }}
      title={isEdit ? 'Reiseidee bearbeiten' : 'Neue Reiseidee'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Titel */}
        <input
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
          placeholder="Ziel oder Reiseidee…"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          autoFocus
          required
        />

        {/* Land & Stadt */}
        <div className="grid grid-cols-2 gap-3">
          <input
            className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
            placeholder="Land"
            value={form.country}
            onChange={(e) => set('country', e.target.value)}
          />
          <input
            className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
            placeholder="Stadt / Region"
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
          />
        </div>

        {/* Budget */}
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Budget (€)</label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min="0"
              className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
              placeholder="von"
              value={form.budget_min}
              onChange={(e) => set('budget_min', e.target.value)}
            />
            <input
              type="number"
              min="0"
              className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
              placeholder="bis"
              value={form.budget_max}
              onChange={(e) => set('budget_max', e.target.value)}
            />
          </div>
        </div>

        {/* Jahreszeit */}
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-2 block">Beste Jahreszeit</label>
          <div className="flex flex-wrap gap-2">
            {SEASON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('season', form.season === opt.value ? '' : opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  form.season === opt.value
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-muted)] text-[var(--color-text-muted)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priorität */}
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-2 block">Priorität</label>
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map((opt) => {
              const active = form.priority === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('priority', opt.value)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                  style={active
                    ? { background: opt.bg, color: opt.color, outline: `1.5px solid ${opt.color}` }
                    : { background: 'var(--color-muted)', color: 'var(--color-text-muted)' }
                  }
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Status (nur im Edit) */}
        {isEdit && (
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Status</label>
            <select
              className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-[var(--color-surface)]"
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
            >
              <option value="idea">💭 Idee</option>
              <option value="planned">📋 Geplant</option>
              <option value="booked">🎫 Gebucht</option>
              <option value="done">✅ Erledigt</option>
            </select>
          </div>
        )}

        {/* Notizen */}
        <textarea
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent resize-none"
          placeholder="Notizen, Tipps, Links…"
          rows={3}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
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
