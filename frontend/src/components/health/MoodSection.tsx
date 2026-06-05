import ScaleInput from '../ui/ScaleInput'

interface MoodSectionProps {
  mood: number | null
  energy: number | null
  anxiety: number | null
  onChange: (field: string, val: number | null) => void
}

export default function MoodSection({ mood, energy, anxiety, onChange }: MoodSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-[var(--color-text-muted)]">Stimmung 😔 → 😊</p>
          {mood != null && <span className="text-xs font-semibold">{mood}/10</span>}
        </div>
        <ScaleInput value={mood} onChange={v => onChange('mood', v || null)} min={1} max={10} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-[var(--color-text-muted)]">Energie 🪫 → ⚡</p>
          {energy != null && <span className="text-xs font-semibold">{energy}/10</span>}
        </div>
        <ScaleInput value={energy} onChange={v => onChange('energy', v || null)} min={1} max={10} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-[var(--color-text-muted)]">Angst / Anspannung</p>
          {anxiety != null && <span className="text-xs font-semibold">{anxiety}/10</span>}
        </div>
        <ScaleInput value={anxiety} onChange={v => onChange('anxiety', v || null)} min={0} max={10} colorize />
      </div>
    </div>
  )
}
