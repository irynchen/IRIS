import { ReactNode, useEffect, useState } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceArea, ResponsiveContainer, Legend,
} from 'recharts'
import { healthApi } from '../../api/health'

const PERIODS = [{ label: '14T', days: 14 }, { label: '30T', days: 30 }]

function shortDate(d: ReactNode): string {
  const dt = new Date(String(d) + 'T12:00:00')
  return dt.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

export default function BPChart() {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [days, setDays] = useState(14)

  useEffect(() => {
    healthApi.getChartBP(days).then(d => setData(d as Record<string, unknown>[])).catch(() => {})
  }, [days])

  if (data.length === 0) return (
    <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">Noch keine Blutdruckdaten.</div>
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
          <YAxis domain={[60, 180]} tick={{ fontSize: 11 }} />
          <Tooltip labelFormatter={shortDate} />
          {/* Normal zone */}
          <ReferenceArea y1={60} y2={130} fill="#6B8F71" fillOpacity={0.05} />
          {/* Elevated zone */}
          <ReferenceArea y1={130} y2={140} fill="#C4A882" fillOpacity={0.1} />
          {/* High zone */}
          <ReferenceArea y1={140} y2={180} fill="#ef4444" fillOpacity={0.07} />
          <Line type="monotone" dataKey="bp_morning_systolic" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Systole (m)" connectNulls={false} />
          <Line type="monotone" dataKey="bp_morning_diastolic" stroke="#4A7FA5" strokeWidth={2} dot={{ r: 3 }} name="Diastole (m)" connectNulls={false} />
          <Line type="monotone" dataKey="bp_evening_systolic" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 2 }} name="Systole (a)" connectNulls={false} />
          <Line type="monotone" dataKey="bp_evening_diastolic" stroke="#4A7FA5" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 2 }} name="Diastole (a)" connectNulls={false} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
