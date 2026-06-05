import ScaleInput from '../ui/ScaleInput'

interface SleepSectionProps {
  hours: string
  quality: number | null
  notes: string
  onChange: (field: string, val: string | number | null) => void
}

export default function SleepSection({ hours, quality, notes, onChange }: SleepSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="number"
          inputMode="decimal"
          placeholder="7.5"
          value={hours}
          onChange={e => onChange('sleep_hours', e.target.value)}
          className="w-20 text-center text-xl font-semibold border border-[var(--color-muted)] rounded-xl p-2 bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
        />
        <span className="text-[var(--color-text-muted)]">Stunden</span>
        {hours && (
          <span className={`text-sm font-medium ${parseFloat(hours) >= 7 ? 'text-[var(--color-primary)]' : 'text-orange-400'}`}>
            {parseFloat(hours) >= 7 ? '😴 Gut' : '⚠️ Wenig'}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-[var(--color-text-muted)] mb-2">Qualität</p>
        <ScaleInput
          value={quality}
          onChange={v => onChange('sleep_quality', v || null)}
          min={1}
          max={10}
        />
      </div>
      <textarea
        placeholder="Bemerkungen zum Schlaf..."
        value={notes}
        onChange={e => onChange('sleep_notes', e.target.value)}
        rows={2}
        className="w-full border border-[var(--color-muted)] rounded-xl p-2 text-sm bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
      />
    </div>
  )
}
