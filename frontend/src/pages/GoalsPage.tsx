import { useEffect, useRef, useState } from 'react'
import {
  goalsApi, Goal, GoalArea, MonthlyFocus,
  ENERGY_LEVELS, STATUS_META, HORIZON_META,
} from '../api/goals'
import BottomSheet from '../components/ui/BottomSheet'

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  '', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

function currentYear() { return new Date().getFullYear() }
function currentMonth() { return new Date().getMonth() + 1 }

// ── Goal Form ──────────────────────────────────────────────────────────────────

interface GoalFormProps {
  open: boolean
  onClose: () => void
  areas: GoalArea[]
  initial?: Goal | null
  defaultHorizon?: string
  defaultYear?: number
  defaultMonth?: number
  onSaved: (g: Goal) => void
}

function GoalForm({ open, onClose, areas, initial, defaultHorizon = '1_year', defaultYear, defaultMonth, onSaved }: GoalFormProps) {
  const editMode = !!initial
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    area_id: '' as string | number,
    title: '',
    why_important: '',
    progress: 0,
    status: 'active' as Goal['status'],
    energy_level: 'ok',
    deadline: '',
    notes: '',
  })

  useEffect(() => {
    setForm({
      area_id: initial?.area_id ?? '',
      title: initial?.title ?? '',
      why_important: initial?.why_important ?? '',
      progress: initial?.progress ?? 0,
      status: (initial?.status ?? 'active') as Goal['status'],
      energy_level: initial?.energy_level ?? 'ok',
      deadline: initial?.deadline ?? '',
      notes: initial?.notes ?? '',
    })
  }, [initial?.id, open])

  function set(patch: Partial<typeof form>) {
    setForm(f => ({ ...f, ...patch }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const payload: Partial<Goal> = {
        area_id: form.area_id ? Number(form.area_id) : null,
        title: form.title.trim(),
        why_important: form.why_important || null,
        horizon: initial?.horizon ?? defaultHorizon,
        year: initial?.year ?? defaultYear ?? (defaultHorizon === '1_year' ? currentYear() : undefined),
        month: initial?.month ?? defaultMonth ?? (defaultHorizon === 'month' ? currentMonth() : undefined),
        progress: form.progress,
        status: form.status,
        energy_level: form.energy_level,
        deadline: form.deadline || null,
        notes: form.notes || null,
      }
      const saved = editMode
        ? await goalsApi.updateGoal(initial!.id, payload)
        : await goalsApi.createGoal(payload)
      onSaved(saved)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const energyIcon = ENERGY_LEVELS.find(e => e.key === form.energy_level)?.icon ?? '🙂'

  return (
    <BottomSheet open={open} onClose={onClose} title={editMode ? 'Ziel bearbeiten' : 'Neues Ziel'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Area */}
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">Bereich</label>
          <div className="flex flex-wrap gap-1.5">
            {areas.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => set({ area_id: form.area_id === a.id ? '' : a.id })}
                className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                style={form.area_id === a.id
                  ? { backgroundColor: a.color, color: '#fff' }
                  : { backgroundColor: 'var(--color-muted)', color: 'var(--color-text-muted)' }
                }
              >
                {a.icon} {a.name}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <input
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
          placeholder="Was willst du erreichen? *"
          value={form.title}
          onChange={e => set({ title: e.target.value })}
          required autoFocus
        />

        {/* Why */}
        <textarea
          className="w-full p-3 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm resize-none bg-transparent"
          placeholder="Warum ist dieses Ziel wichtig für dich?"
          rows={2}
          value={form.why_important}
          onChange={e => set({ why_important: e.target.value })}
        />

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-[var(--color-text-muted)]">Fortschritt</label>
            <span className="text-xs font-bold text-[var(--color-primary)]">{form.progress}%</span>
          </div>
          <input
            type="range" min={0} max={100} step={5}
            value={form.progress}
            onChange={e => set({ progress: Number(e.target.value) })}
            className="w-full accent-[var(--color-primary)]"
          />
        </div>

        {/* Status + Energy */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">Status</label>
            <div className="flex flex-col gap-1">
              {(Object.entries(STATUS_META) as [Goal['status'], typeof STATUS_META[Goal['status']]][]).map(([k, m]) => (
                <button key={k} type="button" onClick={() => set({ status: k })}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-all ${
                    form.status === k ? 'text-white' : 'bg-[var(--color-muted)] text-[var(--color-text-muted)]'
                  }`}
                  style={form.status === k ? { backgroundColor: m.color } : {}}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">Energie {energyIcon}</label>
            <div className="flex flex-col gap-1">
              {ENERGY_LEVELS.map(e => (
                <button key={e.key} type="button" onClick={() => set({ energy_level: e.key })}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-all ${
                    form.energy_level === e.key
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-muted)] text-[var(--color-text-muted)]'
                  }`}>
                  {e.icon} {e.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Deadline */}
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Deadline (optional)</label>
          <input
            type="date"
            className="w-full p-2.5 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
            value={form.deadline}
            onChange={e => set({ deadline: e.target.value })}
          />
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

// ── Goal Card ──────────────────────────────────────────────────────────────────

interface GoalCardProps {
  goal: Goal
  area?: GoalArea
  onEdit: (g: Goal) => void
  onDelete: (id: number) => void
  onProgressChange: (id: number, p: number) => void
}

function GoalCard({ goal, area, onEdit, onDelete, onProgressChange }: GoalCardProps) {
  const [showWhy, setShowWhy] = useState(false)
  const status = STATUS_META[goal.status]
  const energy = ENERGY_LEVELS.find(e => e.key === goal.energy_level)

  return (
    <div className={`bg-[var(--color-surface)] rounded-2xl shadow-[var(--shadow-card)] overflow-hidden ${
      goal.status === 'done' ? 'opacity-70' : goal.status === 'dropped' ? 'opacity-40' : ''
    }`}>
      {/* Color accent bar */}
      {area && (
        <div className="h-1 w-full" style={{ backgroundColor: area.color }} />
      )}

      <div className="px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              {area && <span className="text-xs">{area.icon}</span>}
              <p className={`text-sm font-medium ${goal.status === 'done' ? 'line-through' : ''}`}>
                {goal.title}
              </p>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex-1 h-1.5 bg-[var(--color-muted)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${goal.progress}%`,
                    backgroundColor: area?.color ?? 'var(--color-primary)',
                  }}
                />
              </div>
              <span className="text-xs font-bold text-[var(--color-text-muted)] w-8 text-right">
                {goal.progress}%
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: status.color + '22', color: status.color }}>
                {status.label}
              </span>
              {energy && <span className="text-xs">{energy.icon}</span>}
              {goal.deadline && (
                <span className="text-xs text-[var(--color-text-muted)]">
                  bis {new Date(goal.deadline + 'T00:00').toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}
                </span>
              )}
              {goal.why_important && (
                <button onClick={() => setShowWhy(s => !s)}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] underline">
                  {showWhy ? 'weniger' : 'warum?'}
                </button>
              )}
            </div>

            {showWhy && goal.why_important && (
              <p className="text-xs text-[var(--color-text-muted)] italic mt-1.5 leading-relaxed">
                "{goal.why_important}"
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex gap-1">
              <button onClick={() => onEdit(goal)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] w-7 h-7 flex items-center justify-center text-sm">
                ✎
              </button>
              <button onClick={() => onDelete(goal.id)}
                className="text-[var(--color-text-muted)] hover:text-red-400 w-7 h-7 flex items-center justify-center">
                ×
              </button>
            </div>
            {/* Quick progress buttons */}
            <div className="flex gap-0.5">
              {[0, 25, 50, 75, 100].map(p => (
                <button key={p} onClick={() => onProgressChange(goal.id, p)}
                  className={`w-5 h-2 rounded-sm transition-all ${
                    goal.progress >= p && p > 0
                      ? 'opacity-100'
                      : goal.progress === 0 && p === 0
                      ? 'opacity-100'
                      : 'opacity-20'
                  }`}
                  style={{ backgroundColor: area?.color ?? 'var(--color-primary)' }}
                  title={`${p}%`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Horizon Card (Vision Tab) ──────────────────────────────────────────────────

function HorizonCard({
  horizon, content, onSave,
}: { horizon: string; content: string | null; onSave: (text: string) => void }) {
  const meta = HORIZON_META[horizon]
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(content ?? '')
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setText(content ?? '') }, [content])
  useEffect(() => { if (editing) taRef.current?.focus() }, [editing])

  function save() {
    onSave(text)
    setEditing(false)
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-[var(--shadow-card)]"
      style={{ backgroundColor: meta.accent, border: `1px solid ${meta.color}33` }}>
      <div className="h-1" style={{ backgroundColor: meta.color }} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-sm" style={{ color: meta.color }}>{meta.label}</p>
          <button onClick={() => setEditing(e => !e)}
            className="text-xs px-2 py-0.5 rounded-full border transition-colors"
            style={{ borderColor: meta.color + '66', color: meta.color }}>
            {editing ? '✕' : '✎ Bearbeiten'}
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-2">{meta.question}</p>

        {editing ? (
          <div>
            <textarea
              ref={taRef}
              className="w-full p-2 rounded-xl border text-sm resize-none bg-white bg-opacity-50 focus:outline-none"
              style={{ borderColor: meta.color + '44' }}
              rows={5}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Schreib frei und ehrlich…"
            />
            <button onClick={save}
              className="mt-2 w-full py-2 rounded-xl text-white text-sm font-medium"
              style={{ backgroundColor: meta.color }}>
              Speichern
            </button>
          </div>
        ) : (
          <div
            className="text-sm leading-relaxed whitespace-pre-wrap cursor-pointer min-h-[40px]"
            onClick={() => setEditing(true)}
          >
            {text
              ? text
              : <span className="text-[var(--color-text-muted)] italic">Noch nichts geschrieben. Tippe um zu beginnen…</span>
            }
          </div>
        )}
      </div>
    </div>
  )
}

// ── Month Tab ─────────────────────────────────────────────────────────────────

function MonthTab({
  focus, monthGoals, areas, onFocusChange, onAddGoal, onEditGoal, onDeleteGoal, onProgressChange,
}: {
  focus: MonthlyFocus | null
  monthGoals: Goal[]
  areas: GoalArea[]
  onFocusChange: (data: Partial<MonthlyFocus>) => void
  onAddGoal: () => void
  onEditGoal: (g: Goal) => void
  onDeleteGoal: (id: number) => void
  onProgressChange: (id: number, p: number) => void
}) {
  const [localFocus, setLocalFocus] = useState<Partial<MonthlyFocus>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocalFocus({
      theme: focus?.theme ?? '',
      goal_1: focus?.goal_1 ?? '',
      goal_2: focus?.goal_2 ?? '',
      goal_3: focus?.goal_3 ?? '',
      reward: focus?.reward ?? '',
    })
  }, [focus?.year, focus?.month])

  function set(patch: Partial<MonthlyFocus>) {
    setLocalFocus(f => ({ ...f, ...patch }))
  }

  async function save() {
    setSaving(true)
    try { await onFocusChange(localFocus) }
    finally { setSaving(false) }
  }

  const month = currentMonth()
  const year = currentYear()

  return (
    <div className="flex flex-col gap-4">
      {/* Month header */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-[var(--shadow-card)] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Monatsplan</p>
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              {MONTH_NAMES[month]} {year}
            </h2>
          </div>
          <button onClick={save} disabled={saving}
            className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-medium disabled:opacity-60">
            {saving ? '…' : 'Speichern'}
          </button>
        </div>

        {/* Theme */}
        <div className="mb-3">
          <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Monatsmotto / Fokus</label>
          <input
            className="w-full p-2.5 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
            placeholder="z.B. Struktur zurückgewinnen und Energie aufbauen"
            value={localFocus.theme ?? ''}
            onChange={e => set({ theme: e.target.value })}
          />
        </div>

        {/* Top 3 */}
        <div className="mb-3">
          <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">Meine 3 Hauptziele</label>
          {[1, 2, 3].map(n => (
            <div key={n} className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">
                {n}
              </span>
              <input
                className="flex-1 p-2 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
                placeholder={`Hauptziel ${n}`}
                value={(localFocus as Record<string, string | null | undefined>)[`goal_${n}`] ?? ''}
                onChange={e => set({ [`goal_${n}`]: e.target.value } as Partial<MonthlyFocus>)}
              />
            </div>
          ))}
        </div>

        {/* Reward */}
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1 block">🎁 Belohnung bei Erreichen</label>
          <input
            className="w-full p-2.5 rounded-xl border border-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm bg-transparent"
            placeholder="Was gönnst du dir wenn du es schaffst?"
            value={localFocus.reward ?? ''}
            onChange={e => set({ reward: e.target.value })}
          />
        </div>
      </div>

      {/* Month goals */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            Monatsziele ({monthGoals.length})
          </p>
          <button onClick={onAddGoal}
            className="text-xs text-[var(--color-primary)] font-medium hover:opacity-80">
            + Ziel
          </button>
        </div>
        {monthGoals.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)] italic text-center py-4">
            Noch keine Monatsziele. Füge konkrete Schritte hinzu.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {monthGoals.map(g => (
              <GoalCard key={g.id} goal={g}
                area={areas.find(a => a.id === g.area_id)}
                onEdit={onEditGoal}
                onDelete={onDeleteGoal}
                onProgressChange={onProgressChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

type Tab = 'vision' | 'goals' | 'month'

export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('goals')
  const [visions, setVisions] = useState<Record<string, string | null>>({})
  const [areas, setAreas] = useState<GoalArea[]>([])
  const [yearGoals, setYearGoals] = useState<Goal[]>([])
  const [monthGoals, setMonthGoals] = useState<Goal[]>([])
  const [monthFocus, setMonthFocus] = useState<MonthlyFocus | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [formHorizon, setFormHorizon] = useState<'1_year' | 'month'>('1_year')

  const year = currentYear()
  const month = currentMonth()

  useEffect(() => {
    goalsApi.getVision().then(setVisions).catch(() => {})
    goalsApi.getAreas().then(setAreas).catch(() => {})
    goalsApi.listGoals({ horizon: '1_year', year }).then(setYearGoals).catch(() => {})
    goalsApi.listGoals({ horizon: 'month', year, month }).then(setMonthGoals).catch(() => {})
    goalsApi.getMonthlyFocus(year, month).then(setMonthFocus).catch(() => {})
  }, [])

  async function handleVisionSave(horizon: string, content: string) {
    await goalsApi.updateVision(horizon, content || null)
    setVisions(v => ({ ...v, [horizon]: content || null }))
  }

  function handleGoalSaved(saved: Goal) {
    if (saved.horizon === 'month') {
      setMonthGoals(prev => {
        const exists = prev.find(g => g.id === saved.id)
        return exists ? prev.map(g => g.id === saved.id ? saved : g) : [...prev, saved]
      })
    } else {
      setYearGoals(prev => {
        const exists = prev.find(g => g.id === saved.id)
        return exists ? prev.map(g => g.id === saved.id ? saved : g) : [...prev, saved]
      })
    }
  }

  async function handleDeleteGoal(id: number) {
    if (!confirm('Ziel löschen?')) return
    await goalsApi.deleteGoal(id)
    setYearGoals(prev => prev.filter(g => g.id !== id))
    setMonthGoals(prev => prev.filter(g => g.id !== id))
  }

  async function handleProgressChange(id: number, progress: number) {
    const updated = await goalsApi.updateGoal(id, { progress })
    handleGoalSaved(updated)
  }

  async function handleFocusChange(data: Partial<MonthlyFocus>) {
    await goalsApi.saveMonthlyFocus(year, month, data)
    setMonthFocus(f => ({ ...(f ?? { year, month }), ...data } as MonthlyFocus))
  }

  // group year goals by area
  const areaIds = [...new Set(yearGoals.map(g => g.area_id))].filter(Boolean) as number[]
  const areaGoals = areaIds.map(id => ({
    area: areas.find(a => a.id === id)!,
    goals: yearGoals.filter(g => g.area_id === id),
  })).filter(g => g.area)
  const noAreaGoals = yearGoals.filter(g => !g.area_id)

  const doneCount = yearGoals.filter(g => g.status === 'done').length
  const avgProgress = yearGoals.length
    ? Math.round(yearGoals.reduce((s, g) => s + g.progress, 0) / yearGoals.length)
    : 0

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg)] border-b border-[var(--color-muted)] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            🧭 Life Compass
          </h1>
          {(activeTab === 'goals' || activeTab === 'month') && (
            <button
              onClick={() => {
                setEditingGoal(null)
                setFormHorizon(activeTab === 'month' ? 'month' : '1_year')
                setShowForm(true)
              }}
              className="bg-[var(--color-primary)] text-white rounded-full w-9 h-9 flex items-center justify-center text-lg font-light hover:opacity-90"
            >
              +
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-[var(--color-muted)] rounded-xl p-1">
          {([
            { key: 'vision', label: '✦ Vision' },
            { key: 'goals', label: `Ziele ${year}` },
            { key: 'month', label: `${MONTH_NAMES[month].slice(0, 3)}.` },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">

        {/* Vision Tab */}
        {activeTab === 'vision' && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-[var(--color-text-muted)] text-center italic">
              Dein persönlicher Nordstern — frei, ehrlich, unveränderlich.
            </p>
            {Object.keys(HORIZON_META).map(h => (
              <HorizonCard
                key={h}
                horizon={h}
                content={visions[h] ?? null}
                onSave={content => handleVisionSave(h, content)}
              />
            ))}
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="flex flex-col gap-4">
            {/* Stats */}
            {yearGoals.length > 0 && (
              <div className="flex gap-3">
                <div className="flex-1 bg-[var(--color-surface)] rounded-xl shadow-[var(--shadow-card)] p-3 text-center">
                  <p className="text-xl font-bold text-[var(--color-primary)]">{yearGoals.length}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Ziele gesamt</p>
                </div>
                <div className="flex-1 bg-[var(--color-surface)] rounded-xl shadow-[var(--shadow-card)] p-3 text-center">
                  <p className="text-xl font-bold text-[var(--color-primary)]">{avgProgress}%</p>
                  <p className="text-xs text-[var(--color-text-muted)]">ø Fortschritt</p>
                </div>
                <div className="flex-1 bg-[var(--color-surface)] rounded-xl shadow-[var(--shadow-card)] p-3 text-center">
                  <p className="text-xl font-bold text-[var(--color-primary)]">{doneCount}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Erreicht</p>
                </div>
              </div>
            )}

            {yearGoals.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">🎯</p>
                <p className="text-sm text-[var(--color-text-muted)] mb-1">Noch keine Jahresziele für {year}</p>
                <p className="text-xs text-[var(--color-text-muted)] italic mb-4">
                  Was willst du dieses Jahr wirklich erreichen?
                </p>
                <button onClick={() => { setEditingGoal(null); setFormHorizon('1_year'); setShowForm(true) }}
                  className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium">
                  Erstes Ziel hinzufügen
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {areaGoals.map(({ area, goals }) => (
                  <div key={area.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{area.icon}</span>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: area.color }}>
                        {area.name}
                      </p>
                      <div className="flex-1 h-px" style={{ backgroundColor: area.color + '44' }} />
                    </div>
                    <div className="flex flex-col gap-2">
                      {goals.map(g => (
                        <GoalCard key={g.id} goal={g} area={area}
                          onEdit={g => { setEditingGoal(g); setFormHorizon('1_year'); setShowForm(true) }}
                          onDelete={handleDeleteGoal}
                          onProgressChange={handleProgressChange}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {noAreaGoals.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {noAreaGoals.map(g => (
                      <GoalCard key={g.id} goal={g}
                        onEdit={g => { setEditingGoal(g); setFormHorizon('1_year'); setShowForm(true) }}
                        onDelete={handleDeleteGoal}
                        onProgressChange={handleProgressChange}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Month Tab */}
        {activeTab === 'month' && (
          <MonthTab
            focus={monthFocus}
            monthGoals={monthGoals}
            areas={areas}
            onFocusChange={handleFocusChange}
            onAddGoal={() => { setEditingGoal(null); setFormHorizon('month'); setShowForm(true) }}
            onEditGoal={g => { setEditingGoal(g); setFormHorizon('month'); setShowForm(true) }}
            onDeleteGoal={handleDeleteGoal}
            onProgressChange={handleProgressChange}
          />
        )}
      </div>

      <GoalForm
        key={editingGoal?.id ?? `new-${formHorizon}`}
        open={showForm}
        onClose={() => setShowForm(false)}
        areas={areas}
        initial={editingGoal}
        defaultHorizon={formHorizon}
        defaultYear={year}
        defaultMonth={month}
        onSaved={handleGoalSaved}
      />
    </div>
  )
}
