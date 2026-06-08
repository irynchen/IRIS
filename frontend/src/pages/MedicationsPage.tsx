import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Medication, medicationsApi } from '../api/medications'
import BottomSheet from '../components/ui/BottomSheet'

// ── Form ───────────────────────────────────────────────────────────────────────
interface MedFormProps {
  open: boolean
  onClose: () => void
  initial?: Medication | null
  onSaved: (m: Medication) => void
}

function MedForm({ open, onClose, initial, onSaved }: MedFormProps) {
  const editMode = !!initial
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', dosage: '', frequency: '', stock_count: '', notes: '', active: true,
  })

  useEffect(() => {
    setForm({
      name: initial?.name ?? '',
      dosage: initial?.dosage ?? '',
      frequency: initial?.frequency ?? '',
      stock_count: initial?.stock_count?.toString() ?? '',
      notes: initial?.notes ?? '',
      active: initial?.active ?? true,
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
        dosage: form.dosage || null,
        frequency: form.frequency || null,
        stock_count: form.stock_count ? parseInt(form.stock_count) : null,
        notes: form.notes || null,
        active: form.active,
      }
      const saved = editMode
        ? await medicationsApi.update(initial!.id, payload)
        : await medicationsApi.create(payload)
      onSaved(saved)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={editMode ? 'Medikament bearbeiten' : 'Neues Medikament'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
          placeholder="Name * (z.B. Ibuprofen)"
          value={form.name}
          onChange={e => set({ name: e.target.value })}
          required autoFocus
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            className="p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
            placeholder="Dosierung (z.B. 400mg)"
            value={form.dosage}
            onChange={e => set({ dosage: e.target.value })}
          />
          <input
            className="p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
            placeholder="Häufigkeit (z.B. 1×/Tag)"
            value={form.frequency}
            onChange={e => set({ frequency: e.target.value })}
          />
        </div>
        <input
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
          placeholder="Vorrat (Anzahl Tabletten/Packungen)"
          type="number"
          min="0"
          value={form.stock_count}
          onChange={e => set({ stock_count: e.target.value })}
        />
        <textarea
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm resize-none bg-transparent"
          placeholder="Notizen (z.B. mit dem Essen einnehmen)"
          rows={2}
          value={form.notes}
          onChange={e => set({ notes: e.target.value })}
        />
        <div className="flex items-center gap-3">
          <label className="text-sm text-[var(--color-text-muted)]">Aktiv</label>
          <button
            type="button"
            onClick={() => set({ active: !form.active })}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              form.active ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-muted)]'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              form.active ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
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

// ── Medication card ────────────────────────────────────────────────────────────
interface MedCardProps {
  med: Medication
  onEdit: (m: Medication) => void
  onDelete: (id: number) => void
  onToggleActive: (id: number, active: boolean) => void
}

function MedCard({ med, onEdit, onDelete, onToggleActive }: MedCardProps) {
  const stockLow = med.stock_count !== null && med.stock_count <= 7

  return (
    <div className={`bg-[var(--color-surface)] rounded-2xl shadow-[var(--shadow-card)] px-4 py-3 flex items-start gap-3 ${
      !med.active ? 'opacity-50' : ''
    }`}>
      <div className="w-10 h-10 rounded-full bg-[var(--color-muted)] flex items-center justify-center text-lg flex-shrink-0">
        💊
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{med.name}</p>
          {!med.active && (
            <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-muted)] px-2 py-0.5 rounded-full">
              Inaktiv
            </span>
          )}
        </div>
        {med.dosage && (
          <p className="text-xs text-[var(--color-text-muted)]">{med.dosage}</p>
        )}
        {med.frequency && (
          <p className="text-xs text-[var(--color-accent)]">{med.frequency}</p>
        )}
        {med.stock_count !== null && (
          <p className={`text-xs font-medium mt-0.5 ${stockLow ? 'text-red-400' : 'text-[var(--color-text-muted)]'}`}>
            Vorrat: {med.stock_count} {stockLow ? '⚠ Bald aufgebraucht!' : ''}
          </p>
        )}
        {med.notes && (
          <p className="text-xs text-[var(--color-text-muted)] italic mt-0.5">{med.notes}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(med)}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] w-8 h-8 flex items-center justify-center">
            ✎
          </button>
          <button onClick={() => onDelete(med.id)}
            className="text-[var(--color-text-muted)] hover:text-red-400 w-8 h-8 flex items-center justify-center text-lg">
            ×
          </button>
        </div>
        <button
          onClick={() => onToggleActive(med.id, !med.active)}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            med.active ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-muted)]'
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            med.active ? 'translate-x-4' : 'translate-x-0'
          }`} />
        </button>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function MedicationsPage() {
  const navigate = useNavigate()
  const [meds, setMeds] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Medication | null>(null)

  useEffect(() => { loadMeds() }, [])

  async function loadMeds() {
    setLoading(true)
    try {
      setMeds(await medicationsApi.list())
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  function handleSaved(saved: Medication) {
    setMeds(prev => {
      const exists = prev.find(m => m.id === saved.id)
      return exists ? prev.map(m => m.id === saved.id ? saved : m) : [...prev, saved]
    })
  }

  async function handleDelete(id: number) {
    if (!confirm('Medikament löschen?')) return
    await medicationsApi.delete(id)
    setMeds(prev => prev.filter(m => m.id !== id))
  }

  async function handleToggleActive(id: number, active: boolean) {
    const updated = await medicationsApi.update(id, { active })
    setMeds(prev => prev.map(m => m.id === id ? updated : m))
  }

  const active = meds.filter(m => m.active)
  const inactive = meds.filter(m => !m.active)

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
            Medikamente
          </h1>
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            className="bg-[var(--color-primary)] text-white rounded-full w-9 h-9 flex items-center justify-center text-lg font-light hover:opacity-90"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-[var(--color-surface)] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : meds.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <p className="text-4xl mb-3">💊</p>
            <p className="text-sm">Noch keine Medikamente eingetragen</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium"
            >
              Medikament hinzufügen
            </button>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                  Aktiv ({active.length})
                </p>
                <div className="flex flex-col gap-2">
                  {active.map(m => (
                    <MedCard
                      key={m.id}
                      med={m}
                      onEdit={med => { setEditing(med); setShowForm(true) }}
                      onDelete={handleDelete}
                      onToggleActive={handleToggleActive}
                    />
                  ))}
                </div>
              </div>
            )}
            {inactive.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                  Inaktiv ({inactive.length})
                </p>
                <div className="flex flex-col gap-2">
                  {inactive.map(m => (
                    <MedCard
                      key={m.id}
                      med={m}
                      onEdit={med => { setEditing(med); setShowForm(true) }}
                      onDelete={handleDelete}
                      onToggleActive={handleToggleActive}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <MedForm
        open={showForm}
        onClose={() => setShowForm(false)}
        initial={editing}
        onSaved={handleSaved}
      />
    </div>
  )
}
