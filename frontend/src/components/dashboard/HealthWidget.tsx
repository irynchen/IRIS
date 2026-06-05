import { useEffect } from 'react'
import { useHealthStore } from '../../store/healthStore'

function bpColor(status?: string | null) {
  if (status === 'high') return 'text-red-500'
  if (status === 'elevated') return 'text-orange-400'
  return 'text-[var(--color-primary)]'
}

function bpIcon(status?: string | null) {
  if (status === 'high') return '🔴'
  if (status === 'elevated') return '🟡'
  if (status === 'normal') return '🟢'
  return ''
}

export default function HealthWidget() {
  const { todayRecord, fetchToday } = useHealthStore()

  useEffect(() => {
    fetchToday()
  }, [])

  if (!todayRecord) {
    return (
      <p className="text-xs text-[var(--color-text-muted)]">Noch kein Eintrag heute</p>
    )
  }

  const r = todayRecord
  return (
    <div className="space-y-1 text-sm">
      {(r.bp_morning_systolic && r.bp_morning_diastolic) && (
        <p className={bpColor(r.bp_status)}>
          💊 {r.bp_morning_systolic}/{r.bp_morning_diastolic} {bpIcon(r.bp_status)}
        </p>
      )}
      {r.weight_kg != null && (
        <p>
          ⚖️ {r.weight_kg} kg
          {r.weight_delta != null && (
            <span className={`ml-1 text-xs ${r.weight_delta <= 0 ? 'text-[var(--color-primary)]' : 'text-red-400'}`}>
              {r.weight_delta > 0 ? '+' : ''}{r.weight_delta.toFixed(1)}
            </span>
          )}
        </p>
      )}
      {r.knee_pain != null && (
        <p>🦵 Knie: {r.knee_pain}/10{r.knee_exercises_done ? ' ✓' : ''}</p>
      )}
    </div>
  )
}
