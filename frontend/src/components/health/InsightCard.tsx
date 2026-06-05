import { HealthInsight } from '../../api/health'

const SEVERITY_STYLES: Record<string, string> = {
  success: 'border-[var(--color-primary)] bg-green-50',
  warning: 'border-amber-400 bg-amber-50',
  info: 'border-[var(--color-accent)] bg-blue-50',
}

const SEVERITY_ICONS: Record<string, string> = {
  success: '✅',
  warning: '⚠️',
  info: 'ℹ️',
}

interface InsightCardProps {
  insight: HealthInsight
}

export default function InsightCard({ insight }: InsightCardProps) {
  const style = SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.info
  const icon = SEVERITY_ICONS[insight.severity] ?? '💡'

  return (
    <div className={`rounded-2xl border-l-4 p-4 ${style}`}>
      <div className="flex items-start gap-2 mb-1">
        <span>{icon}</span>
        <p className="font-semibold text-sm text-[var(--color-text)]">{insight.title}</p>
      </div>
      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{insight.message}</p>
      {insight.data?.optimal_min != null && (
        <div className="mt-2">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Optimaler Bereich</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">{insight.data.optimal_min.toLocaleString('de-DE')}</span>
            <div className="flex-1 h-2 bg-[var(--color-muted)] rounded-full">
              <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: '60%' }} />
            </div>
            <span className="text-xs font-medium">{insight.data.optimal_max.toLocaleString('de-DE')}</span>
          </div>
        </div>
      )}
    </div>
  )
}
