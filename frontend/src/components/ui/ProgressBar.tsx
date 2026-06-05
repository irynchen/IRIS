interface Props {
  value: number  // 0–100
  color?: string
  height?: number
}

export default function ProgressBar({ value, color = 'var(--color-primary)', height = 6 }: Props) {
  return (
    <div
      className="w-full bg-[var(--color-muted)] rounded-full overflow-hidden"
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
      />
    </div>
  )
}
