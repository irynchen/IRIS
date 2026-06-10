import { useEffect, useState } from 'react'
import { TravelIdea, TravelStatus, fetchIdeas, createIdea, patchIdea, deleteIdea } from '../api/travel'
import TravelIdeaForm from '../components/travel/TravelIdeaForm'

const STATUS_CONFIG: Record<TravelStatus, { label: string; icon: string; color: string; bg: string }> = {
  idea:    { label: 'Idee',    icon: '💭', color: '#6B7280', bg: '#6B728015' },
  planned: { label: 'Geplant', icon: '📋', color: '#4A7FA5', bg: '#4A7FA515' },
  booked:  { label: 'Gebucht', icon: '🎫', color: '#f59e0b', bg: '#f59e0b15' },
  done:    { label: 'Erledigt',icon: '✅', color: '#6B8F71', bg: '#6B8F7115' },
}

const STATUS_ORDER: TravelStatus[] = ['idea', 'planned', 'booked', 'done']

const SEASON_LABEL: Record<string, string> = {
  spring: '🌸 Frühling',
  summer: '☀️ Sommer',
  autumn: '🍂 Herbst',
  winter: '❄️ Winter',
  any:    'Jederzeit',
}

const PRIORITY_DOT: Record<number, string> = { 1: '#6B8F71', 2: '#f59e0b', 3: '#ef4444' }

function formatBudget(min: number | null, max: number | null): string | null {
  if (!min && !max) return null
  if (min && max) return `${min.toLocaleString('de-DE')} – ${max.toLocaleString('de-DE')} €`
  if (min) return `ab ${min.toLocaleString('de-DE')} €`
  return `bis ${max!.toLocaleString('de-DE')} €`
}

export default function TravelPage() {
  const [ideas, setIdeas] = useState<TravelIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<TravelStatus | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editIdea, setEditIdea] = useState<TravelIdea | undefined>()

  async function load() {
    setLoading(true)
    try { setIdeas(await fetchIdeas()) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const displayed = filterStatus ? ideas.filter((i) => i.status === filterStatus) : ideas

  // group by status
  const grouped = STATUS_ORDER
    .map((s) => ({ status: s, items: displayed.filter((i) => i.status === s) }))
    .filter((g) => g.items.length > 0)

  async function handleAdvance(idea: TravelIdea) {
    const idx = STATUS_ORDER.indexOf(idea.status)
    if (idx >= STATUS_ORDER.length - 1) return
    const nextStatus = STATUS_ORDER[idx + 1]
    const updated = await patchIdea(idea.id, { status: nextStatus })
    setIdeas((prev) => prev.map((i) => i.id === updated.id ? updated : i))
  }

  async function handleDelete(idea: TravelIdea) {
    setIdeas((prev) => prev.filter((i) => i.id !== idea.id))
    try { await deleteIdea(idea.id) } catch { load() }
  }

  async function handleFormSubmit(form: {
    title: string; country: string; city: string
    budget_min: string; budget_max: string
    season: string; priority: number; status: TravelStatus; notes: string
  }) {
    const payload = {
      title:      form.title.trim(),
      country:    form.country.trim() || null,
      city:       form.city.trim() || null,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      season:     (form.season || null) as any,
      priority:   form.priority,
      status:     form.status,
      notes:      form.notes.trim() || null,
    }
    if (editIdea) {
      const updated = await patchIdea(editIdea.id, payload)
      setIdeas((prev) => prev.map((i) => i.id === updated.id ? updated : i))
      setEditIdea(undefined)
    } else {
      const created = await createIdea(payload)
      setIdeas((prev) => [created, ...prev])
    }
  }

  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = ideas.filter((i) => i.status === s).length
    return acc
  }, {} as Record<TravelStatus, number>)

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg)] border-b border-[var(--color-muted)] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            ✈️ Reisen
          </h1>
          <button
            onClick={() => { setEditIdea(undefined); setShowForm(true) }}
            className="bg-[var(--color-primary)] text-white rounded-full w-9 h-9 flex items-center justify-center text-lg font-light hover:opacity-90 transition-opacity"
          >
            +
          </button>
        </div>

        {/* Status-Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterStatus(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterStatus === null
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-muted)] text-[var(--color-text-muted)]'
            }`}
          >
            Alle ({ideas.length})
          </button>
          {STATUS_ORDER.map((s) => {
            const cfg = STATUS_CONFIG[s]
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? null : s)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filterStatus === s
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-muted)] text-[var(--color-text-muted)]'
                }`}
              >
                {cfg.icon} {cfg.label} {counts[s] > 0 ? `(${counts[s]})` : ''}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-[var(--color-muted)] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
            <span className="text-5xl">🗺️</span>
            <p className="text-[var(--color-text-muted)]" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem' }}>
              {filterStatus ? 'Keine Einträge in diesem Status' : 'Noch keine Reiseideen'}
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">Tippe auf + um eine Idee hinzuzufügen</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map(({ status, items }) => {
              const cfg = STATUS_CONFIG[status]
              return (
                <div key={status}>
                  {!filterStatus && (
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-2 px-1"
                      style={{ color: cfg.color }}>
                      {cfg.icon} {cfg.label}
                    </h2>
                  )}
                  <div className="flex flex-col gap-3">
                    {items.map((idea) => {
                      const budget = formatBudget(idea.budget_min, idea.budget_max)
                      const isLast = STATUS_ORDER.indexOf(idea.status) >= STATUS_ORDER.length - 1
                      return (
                        <div
                          key={idea.id}
                          className="rounded-2xl p-4 border"
                          style={{ background: cfg.bg, borderColor: cfg.color + '30' }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
                                  style={{ backgroundColor: PRIORITY_DOT[idea.priority] }}
                                />
                                <p className="font-semibold text-sm leading-snug">{idea.title}</p>
                              </div>
                              {(idea.country || idea.city) && (
                                <p className="text-xs text-[var(--color-text-muted)] mt-1 ml-4">
                                  📍 {[idea.city, idea.country].filter(Boolean).join(', ')}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2 ml-4">
                                {budget && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-text-muted)]">
                                    💶 {budget}
                                  </span>
                                )}
                                {idea.season && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-text-muted)]">
                                    {SEASON_LABEL[idea.season]}
                                  </span>
                                )}
                              </div>
                              {idea.notes && (
                                <p className="text-xs text-[var(--color-text-muted)] mt-2 ml-4 line-clamp-2">
                                  {idea.notes}
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => { setEditIdea(idea); setShowForm(true) }}
                                className="w-7 h-7 flex items-center justify-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
                              >✏️</button>
                              <button
                                onClick={() => handleDelete(idea)}
                                className="w-7 h-7 flex items-center justify-center text-lg text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
                              >×</button>
                            </div>
                          </div>

                          {/* Advance button */}
                          {!isLast && (
                            <button
                              onClick={() => handleAdvance(idea)}
                              className="mt-3 w-full py-1.5 rounded-xl text-xs font-medium border transition-colors hover:opacity-80"
                              style={{ borderColor: cfg.color + '60', color: cfg.color }}
                            >
                              → {STATUS_CONFIG[STATUS_ORDER[STATUS_ORDER.indexOf(idea.status) + 1]].label}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <TravelIdeaForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditIdea(undefined) }}
        onSubmit={handleFormSubmit}
        editIdea={editIdea}
      />
    </div>
  )
}
