import { useEffect, useState } from 'react'
import { useBPStore } from '../../../store/bpStore'
import { useHealthStore } from '../../../store/healthStore'
import { bpApi } from '../../../api/bp'
import BPChart from '../BPChart'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function nowLocalInput(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
  }
}

function statusIcon(status?: string | null) {
  if (status === 'high') return '🔴'
  if (status === 'elevated') return '🟡'
  if (status === 'normal') return '🟢'
  return ''
}

const EXPORT_PERIODS = [
  { label: '30 Tage', days: 30 },
  { label: '90 Tage', days: 90 },
  { label: 'Alles', days: null },
]

export default function BloodPressureTab() {
  const { readings, fetchReadings, addReading, removeReading, isLoading } = useBPStore()
  const { todayRecord, updateRecord } = useHealthStore()

  const [measuredAt, setMeasuredAt] = useState(nowLocalInput())
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [pulse, setPulse] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [exportDays, setExportDays] = useState<number | null>(90)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchReadings()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!systolic || !diastolic) return
    await addReading({
      measured_at: measuredAt,
      systolic: parseInt(systolic),
      diastolic: parseInt(diastolic),
      pulse: pulse ? parseInt(pulse) : null,
      notes: notes || null,
    })
    setSystolic('')
    setDiastolic('')
    setPulse('')
    setNotes('')
    setMeasuredAt(nowLocalInput())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const to = new Date().toISOString().slice(0, 10)
      const from = exportDays
        ? new Date(Date.now() - exportDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : undefined
      await bpApi.exportPdf(from, to)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-3 bg-[var(--color-surface)] rounded-2xl p-4 shadow-[var(--shadow-card)]">
        <p className="font-medium">💊 Neue Messung</p>
        <input
          type="datetime-local"
          value={measuredAt}
          onChange={e => setMeasuredAt(e.target.value)}
          className="w-full border border-[var(--color-muted)] rounded-lg p-2 bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
        />
        <div className="flex items-center gap-2">
          <input
            type="number" inputMode="numeric" placeholder="120" required
            value={systolic} onChange={e => setSystolic(e.target.value)}
            className="w-16 text-center text-lg font-semibold border border-[var(--color-muted)] rounded-lg p-2 bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
          />
          <span className="text-[var(--color-text-muted)] font-bold">/</span>
          <input
            type="number" inputMode="numeric" placeholder="80" required
            value={diastolic} onChange={e => setDiastolic(e.target.value)}
            className="w-16 text-center text-lg font-semibold border border-[var(--color-muted)] rounded-lg p-2 bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
          />
          <span className="text-xs text-[var(--color-text-muted)] ml-1">Puls</span>
          <input
            type="number" inputMode="numeric" placeholder="72"
            value={pulse} onChange={e => setPulse(e.target.value)}
            className="w-14 text-center border border-[var(--color-muted)] rounded-lg p-2 bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <input
          type="text" placeholder="Notiz (optional)"
          value={notes} onChange={e => setNotes(e.target.value)}
          className="w-full border border-[var(--color-muted)] rounded-lg p-2 text-sm bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={todayRecord?.medication_taken ?? false}
            onChange={e => updateRecord(new Date().toISOString().slice(0, 10), { medication_taken: e.target.checked })}
            className="w-4 h-4 accent-[var(--color-primary)]"
          />
          <span className="text-sm">Medikament heute eingenommen</span>
        </label>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-2xl text-white font-semibold transition-all active:scale-[0.98] bg-[var(--color-primary)] hover:brightness-95 disabled:opacity-50"
        >
          {saved ? '✅ Gespeichert!' : isLoading ? 'Wird gespeichert…' : 'Messung speichern'}
        </button>
      </form>

      <div className="bg-[var(--color-surface)] rounded-2xl p-4 shadow-[var(--shadow-card)]">
        <p className="font-medium mb-3">📊 Verlauf</p>
        <BPChart />
      </div>

      <div className="bg-[var(--color-surface)] rounded-2xl p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium">📋 Alle Messungen</p>
        </div>
        <div className="flex gap-2 mb-3 flex-wrap">
          {EXPORT_PERIODS.map(p => (
            <button
              key={p.label}
              onClick={() => setExportDays(p.days)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                exportDays === p.days
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'border-[var(--color-muted)] text-[var(--color-text-muted)]'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-3 py-1 rounded-full text-xs border border-[var(--color-accent)] text-[var(--color-accent)] disabled:opacity-50 ml-auto"
          >
            {exporting ? 'Erstelle PDF…' : '📄 Als PDF exportieren'}
          </button>
        </div>

        {readings.length === 0 ? (
          <p className="text-center text-sm text-[var(--color-text-muted)] py-8">Noch keine Messungen erfasst.</p>
        ) : (
          <div className="space-y-2">
            {readings.map(r => {
              const { date, time } = formatDateTime(r.measured_at)
              return (
                <div key={r.id} className="flex items-center justify-between border-b border-[var(--color-muted)] pb-2 last:border-0">
                  <div>
                    <p className="text-sm">{date} · {time}</p>
                    <p className="text-lg font-semibold">
                      {r.systolic}/{r.diastolic} {statusIcon(r.status)}
                      {r.pulse != null && <span className="text-sm text-[var(--color-text-muted)] font-normal ml-2">Puls {r.pulse}</span>}
                    </p>
                    {r.notes && <p className="text-xs text-[var(--color-text-muted)]">{r.notes}</p>}
                  </div>
                  <button
                    onClick={() => removeReading(r.id)}
                    className="text-[var(--color-text-muted)] hover:text-red-500 text-sm p-2"
                  >
                    🗑
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
