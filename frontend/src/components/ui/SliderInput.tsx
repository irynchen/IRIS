interface SliderInputProps {
  value: number | null
  onChange: (v: number) => void
  min?: number
  max?: number
  label?: string
}

export default function SliderInput({ value, onChange, min = 0, max = 10, label }: SliderInputProps) {
  const val = value ?? min
  const pct = ((val - min) / (max - min)) * 100

  function trackColor() {
    if (pct <= 30) return '#6B8F71'
    if (pct <= 60) return '#C4A882'
    return '#ef4444'
  }

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        value={val}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${trackColor()} ${pct}%, var(--color-muted) ${pct}%)`,
        }}
      />
      <span className="text-sm font-semibold w-8 text-center text-[var(--color-text)]">
        {label ?? `${val}/${max}`}
      </span>
    </div>
  )
}
