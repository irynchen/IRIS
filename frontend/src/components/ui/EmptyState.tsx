interface Props {
  icon?: string
  message: string
  sub?: string
}

export default function EmptyState({ icon = '✨', message, sub }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-sm font-medium text-[var(--color-text)]">{message}</p>
      {sub && <p className="text-xs text-[var(--color-text-muted)] mt-1">{sub}</p>}
    </div>
  )
}
