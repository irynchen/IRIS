interface WeightSectionProps {
  value: string
  onChange: (v: string) => void
  prevWeight?: number | null
  goal?: number
}

export default function WeightSection({ value, onChange, prevWeight, goal = 75 }: WeightSectionProps) {
  const current = parseFloat(value)
  const delta = (!isNaN(current) && prevWeight != null) ? current - prevWeight : null
  const toGoal = !isNaN(current) ? current - goal : null
  const progress = !isNaN(current) && toGoal != null
    ? Math.max(0, Math.min(100, ((current - goal) / (current - goal + 0.01)) * 100))
    : null

  // progress bar: how far from goal (start ~90, goal 75)
  const startWeight = 90
  const progressPct = !isNaN(current)
    ? Math.max(0, Math.min(100, Math.round(((startWeight - current) / (startWeight - goal)) * 100)))
    : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <input
          type="number"
          inputMode="decimal"
          placeholder="82.4"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-28 text-center text-2xl font-semibold border border-[var(--color-muted)] rounded-xl p-2 bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
        />
        <span className="text-[var(--color-text-muted)]">kg</span>
        {delta != null && (
          <span className={`text-sm font-semibold ${delta <= 0 ? 'text-[var(--color-primary)]' : 'text-red-400'}`}>
            {delta > 0 ? '+' : ''}{delta.toFixed(1)} kg
          </span>
        )}
      </div>
      {!isNaN(current) && toGoal != null && (
        <div>
          <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1">
            <span>Zum Ziel: {toGoal > 0 ? `noch ${toGoal.toFixed(1)} kg` : '✅ Erreicht!'}</span>
            <span>Ziel: {goal} kg</span>
          </div>
          <div className="h-2 bg-[var(--color-muted)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--color-primary)] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
