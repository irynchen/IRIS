import SliderInput from '../ui/SliderInput'

const SWELLING_OPTIONS = [
  { key: 'none', label: 'Kein' },
  { key: 'mild', label: 'Leicht' },
  { key: 'moderate', label: 'Mittel' },
  { key: 'severe', label: 'Stark' },
]

interface KneeSectionProps {
  pain: number | null
  swelling: string
  exercisesDone: boolean
  steps: string
  onChange: (field: string, val: number | string | boolean | null) => void
}

export default function KneeSection({ pain, swelling, exercisesDone, steps, onChange }: KneeSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[var(--color-text-muted)] mb-2">Schmerz (0 = kein, 10 = stark)</p>
        <SliderInput value={pain} onChange={v => onChange('knee_pain', v)} min={0} max={10} />
      </div>
      <div>
        <p className="text-xs text-[var(--color-text-muted)] mb-2">Schwellung</p>
        <div className="flex gap-2 flex-wrap">
          {SWELLING_OPTIONS.map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange('knee_swelling', swelling === opt.key ? '' : opt.key)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                swelling === opt.key
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                  : 'bg-[var(--color-muted)] text-[var(--color-text-muted)] border-transparent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Schritte</p>
          <input
            type="number"
            inputMode="numeric"
            placeholder="6000"
            value={steps}
            onChange={e => onChange('steps', e.target.value)}
            className="w-full border border-[var(--color-muted)] rounded-xl p-2 text-lg font-semibold text-center bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer mt-4">
          <input
            type="checkbox"
            checked={exercisesDone}
            onChange={e => onChange('knee_exercises_done', e.target.checked)}
            className="w-4 h-4 accent-[var(--color-primary)]"
          />
          <span className="text-sm">Übungen</span>
        </label>
      </div>
    </div>
  )
}
