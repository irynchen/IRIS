interface ScaleInputProps {
  value: number | null
  onChange: (v: number) => void
  min?: number
  max?: number
  colorize?: boolean
}

export default function ScaleInput({ value, onChange, min = 1, max = 10, colorize = false }: ScaleInputProps) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => i + min)

  function color(n: number) {
    if (!colorize) return ''
    const ratio = (n - min) / (max - min)
    if (ratio <= 0.3) return 'bg-[var(--color-primary)] text-white'
    if (ratio <= 0.6) return 'bg-[var(--color-secondary)] text-white'
    return 'bg-red-400 text-white'
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {steps.map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          className={`w-8 h-8 rounded-full text-sm font-medium border transition-all
            ${value === n
              ? colorize ? color(n) : 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
              : 'bg-[var(--color-muted)] text-[var(--color-text-muted)] border-transparent hover:border-[var(--color-primary)]'
            }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
