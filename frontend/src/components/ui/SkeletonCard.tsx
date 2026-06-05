export default function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-2xl p-4 shadow-[var(--shadow-card)] animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-[var(--color-muted)] rounded-full mb-2 last:mb-0"
          style={{ width: i === 0 ? '60%' : '85%' }}
        />
      ))}
    </div>
  )
}
