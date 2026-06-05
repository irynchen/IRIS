import { useState, useEffect } from 'react'
import { useHealthStore } from '../store/healthStore'
import TodayForm from '../components/health/TodayForm'
import HistoryList from '../components/health/HistoryList'
import WeightChart from '../components/health/WeightChart'
import BPChart from '../components/health/BPChart'
import KneeChart from '../components/health/KneeChart'
import MoodChart from '../components/health/MoodChart'
import InsightCard from '../components/health/InsightCard'
import Card from '../components/ui/Card'

const TABS = [
  { key: 'today', label: 'Heute' },
  { key: 'history', label: 'Verlauf' },
  { key: 'charts', label: 'Grafiken' },
  { key: 'insights', label: 'Einblicke' },
]

export default function HealthPage() {
  const [activeTab, setActiveTab] = useState<string>('today')
  const { fetchToday, fetchInsights, stats, fetchStats, insights } = useHealthStore()

  useEffect(() => {
    fetchToday()
    fetchStats(30)
  }, [])

  useEffect(() => {
    if (activeTab === 'insights') fetchInsights()
  }, [activeTab])

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-3xl mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
        💚 Gesundheit
      </h1>

      {/* Stats bar */}
      {stats && stats.records_count > 0 && (
        <div className="flex gap-3 mb-4 overflow-x-auto scrollbar-none pb-1">
          {stats.streak > 0 && (
            <div className="flex-shrink-0 bg-[var(--color-surface)] rounded-xl px-3 py-2 shadow-[var(--shadow-card)] text-center">
              <p className="text-lg font-bold text-[var(--color-primary)]">{stats.streak}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Tage</p>
            </div>
          )}
          {stats.weight_current != null && (
            <div className="flex-shrink-0 bg-[var(--color-surface)] rounded-xl px-3 py-2 shadow-[var(--shadow-card)] text-center">
              <p className="text-lg font-bold">{stats.weight_current} kg</p>
              <p className="text-xs text-[var(--color-text-muted)]">Gewicht</p>
            </div>
          )}
          {stats.bp_avg_systolic != null && (
            <div className="flex-shrink-0 bg-[var(--color-surface)] rounded-xl px-3 py-2 shadow-[var(--shadow-card)] text-center">
              <p className="text-lg font-bold">{stats.bp_avg_systolic}/{stats.bp_avg_diastolic}</p>
              <p className="text-xs text-[var(--color-text-muted)]">ø Druck</p>
            </div>
          )}
          {stats.sleep_avg_hours != null && (
            <div className="flex-shrink-0 bg-[var(--color-surface)] rounded-xl px-3 py-2 shadow-[var(--shadow-card)] text-center">
              <p className="text-lg font-bold">{stats.sleep_avg_hours}h</p>
              <p className="text-xs text-[var(--color-text-muted)]">ø Schlaf</p>
            </div>
          )}
          {stats.knee_avg_pain != null && (
            <div className="flex-shrink-0 bg-[var(--color-surface)] rounded-xl px-3 py-2 shadow-[var(--shadow-card)] text-center">
              <p className="text-lg font-bold">{stats.knee_avg_pain}/10</p>
              <p className="text-xs text-[var(--color-text-muted)]">ø Knie</p>
            </div>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 bg-[var(--color-muted)] rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.key
                ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'today' && <TodayForm />}

      {activeTab === 'history' && <HistoryList />}

      {activeTab === 'charts' && (
        <div className="space-y-5">
          <Card>
            <h2 className="text-base font-semibold mb-3">⚖️ Gewicht</h2>
            <WeightChart />
          </Card>
          <Card>
            <h2 className="text-base font-semibold mb-3">💊 Blutdruck</h2>
            <BPChart />
          </Card>
          <Card>
            <h2 className="text-base font-semibold mb-3">🦵 Knie & Schritte</h2>
            <KneeChart />
          </Card>
          <Card>
            <h2 className="text-base font-semibold mb-3">✨ Stimmung & Schlaf</h2>
            <MoodChart />
          </Card>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-3">
          {insights.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-[var(--color-text-muted)] text-sm">
                Einblicke werden geladen…
              </p>
            </div>
          ) : (
            insights.map((ins, i) => <InsightCard key={i} insight={ins} />)
          )}
        </div>
      )}
    </div>
  )
}
