import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { healthApi } from '../../api/health'

const PERIODS = [{ label: '14T', days: 14 }, { label: '30T', days: 30 }]

function shortDate(d: ReactNode): string {
  const dt = new Date(String(d) + 'T12:00:00')
  return dt.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

export default function KneeChart() {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [days, setDays] = useState(14)

  useEffect(() => {
    healthApi.getChartKnee(days).then(d => setData(d as Record<string, unknown>[])).catch(() => {})
  }, [days])

  if (data.length === 0) return (
    <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">Noch keine Kniedaten.</div>
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
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-muted)" />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis yAxisId="steps" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} />
          <YAxis yAxisId="pain" domain={[0, 10]} tick={{ fontSize: 11 }} />
          <Tooltip labelFormatter={shortDate} />
          <Bar yAxisId="steps" dataKey="steps" fill="var(--color-muted)" opacity={0.6} name="Schritte" radius={[3, 3, 0, 0]} />
          <Line yAxisId="pain" type="monotone" dataKey="knee_pain" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="Knieschmerz" />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
