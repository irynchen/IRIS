import { HealthRecord } from '../../api/health'

interface HistoryCardProps {
  record: HealthRecord
  onClick?: () => void
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })
}

function cardBorder(record: HealthRecord) {
  const sys = record.bp_morning_systolic
  const pain = record.knee_pain
  if ((sys && sys >= 140) || (pain && pain >= 7)) return 'border-red-300'
  if ((sys && sys >= 130) || (pain && pain >= 5)) return 'border-amber-300'
  return 'border-[var(--color-primary)] border-opacity-30'
}

export default function HistoryCard({ record, onClick }: HistoryCardProps) {
  const hasBP = record.bp_morning_systolic && record.bp_morning_diastolic
  const border = cardBorder(record)

  return (
    <div
      onClick={onClick}
      className={`bg-[var(--color-surface)] rounded-2xl p-4 border-l-4 ${border} shadow-[var(--shadow-card)] cursor-pointer active:scale-[0.99] transition-transform`}
    >
      <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 capitalize">
        {formatDate(record.date)}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {hasBP && (
          <span>
            💊 {record.bp_morning_systolic}/{record.bp_morning_diastolic}
            {record.bp_status === 'high' && ' 🔴'}
            {record.bp_status === 'elevated' && ' 🟡'}
            {record.bp_status === 'normal' && ' 🟢'}
          </span>
        )}
        {record.sleep_hours != null && (
          <span>😴 {record.sleep_hours}h</span>
        )}
        {record.weight_kg != null && (
          <span>
            ⚖️ {record.weight_kg} kg
            {record.weight_delta != null && (
              <span className={record.weight_delta <= 0 ? 'text-[var(--color-primary)] ml-1' : 'text-red-400 ml-1'}>
                {record.weight_delta > 0 ? '+' : ''}{record.weight_delta.toFixed(1)}
              </span>
            )}
          </span>
        )}
        {record.knee_pain != null && (
          <span>🦵 {record.knee_pain}/10</span>
        )}
        {record.steps != null && (
          <span>👟 {record.steps.toLocaleString('de-DE')}</span>
        )}
        {record.mood != null && (
          <span>✨ {record.mood}/10</span>
        )}
      </div>
    </div>
  )
}
