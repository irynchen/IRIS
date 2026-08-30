import { useEffect } from 'react'
import { useHealthStore } from '../store/healthStore'
import TopicTabs from '../components/health/TopicTabs'
import InsightCard from '../components/health/InsightCard'

export default function HealthAppToday() {
  const { fetchToday, fetchStats, fetchInsights, stats, insights } = useHealthStore()

  useEffect(() => {
    fetchToday()
    fetchStats(30)
    fetchInsights()
  }, [])

  return (
    <div className="p-5 max-w-2xl mx-auto space-y-5">
      {stats && stats.records_count > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {stats.streak > 0 && (
            <div className="bg-[var(--color-surface)] rounded-2xl px-4 py-4 shadow-[var(--shadow-card)] text-center">
              <p className="text-3xl font-bold text-[var(--color-primary)]">{stats.streak}</p>
              <p className="text-sm text-[var(--color-text-muted)]">Tage Streak</p>
            </div>
          )}
          {stats.weight_current != null && (
            <div className="bg-[var(--color-surface)] rounded-2xl px-4 py-4 shadow-[var(--shadow-card)] text-center">
              <p className="text-3xl font-bold">{stats.weight_current} kg</p>
              <p className="text-sm text-[var(--color-text-muted)]">Gewicht</p>
            </div>
          )}
          {stats.bp_avg_systolic != null && (
            <div className="bg-[var(--color-surface)] rounded-2xl px-4 py-4 shadow-[var(--shadow-card)] text-center">
              <p className="text-3xl font-bold">{stats.bp_avg_systolic}/{stats.bp_avg_diastolic}</p>
              <p className="text-sm text-[var(--color-text-muted)]">ø Blutdruck</p>
            </div>
          )}
          {stats.sleep_avg_hours != null && (
            <div className="bg-[var(--color-surface)] rounded-2xl px-4 py-4 shadow-[var(--shadow-card)] text-center">
              <p className="text-3xl font-bold">{stats.sleep_avg_hours}h</p>
              <p className="text-sm text-[var(--color-text-muted)]">ø Schlaf</p>
            </div>
          )}
        </div>
      )}

      {insights.length > 0 && (
        <div className="space-y-3">
          {insights.map((ins, i) => (
            <InsightCard key={i} insight={ins} />
          ))}
        </div>
      )}

      <TopicTabs />
    </div>
  )
}
