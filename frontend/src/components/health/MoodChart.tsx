import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { healthApi } from '../../api/health'

const PERIODS = [{ label: '14T', days: 14 }, { label: '30T', days: 30 }]

function shortDate(d: ReactNode): string {
  const dt = new Date(String(d) + 'T12:00:00')
  return dt.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

export default function MoodChart() {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [days, setDays] = useState(14)

  useEffect(() => {
    healthApi.getChartMood(days).then(d => setData(d as Record<string, unknown>[])).catch(() => {})
  }, [days])

  if (data.length === 0) return (
    <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">Noch keine Stimmungsdaten.</div>
  )

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {PERIODS.map(p => (
          <button key={p.days} onClick={() => setDays(p.days)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${days === p.days ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-muted)] text-[var(--color-text-muted)]'}`}>
            {p.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-muted)" />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis yAxisId="mood" domain={[0, 10]} tick={{ fontSize: 11 }} />
          <YAxis yAxisId="sleep" orientation="right" domain={[0, 12]} tick={{ fontSize: 10 }} />
          <Tooltip labelFormatter={shortDate} />
          <Line yAxisId="mood" type="monotone" dataKey="mood" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Stimmung" />
          <Line yAxisId="sleep" type="monotone" dataKey="sleep_hours" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" name="Schlaf (h)" />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
