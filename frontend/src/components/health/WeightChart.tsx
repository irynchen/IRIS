import { ReactNode, useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { healthApi } from '../../api/health'

const PERIODS = [
  { label: '30T', days: 30 },
  { label: '90T', days: 90 },
]

function shortDate(d: ReactNode): string {
  const dt = new Date(String(d) + 'T12:00:00')
  return dt.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

export default function WeightChart() {
  const [data, setData] = useState<{ date: string; weight: number }[]>([])
  const [days, setDays] = useState(30)

  useEffect(() => {
    healthApi.getChartWeight(days).then(setData).catch(() => {})
  }, [days])

  if (data.length === 0) return (
    <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">Noch keine Gewichtsdaten.</div>
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
          <XAxis dataKey="date" tickFormatter={(d) => shortDate(d)} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
          <Tooltip
            labelFormatter={shortDate}
            formatter={(v) => [`${v} kg`, 'Gewicht']}
          />
          <ReferenceLine y={75} stroke="var(--color-primary)" strokeDasharray="4 4" label={{ value: 'Ziel 75kg', fontSize: 10, fill: 'var(--color-primary)' }} />
          <Line type="monotone" dataKey="weight" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Gewicht" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
