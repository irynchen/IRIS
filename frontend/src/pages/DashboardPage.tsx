import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'

interface DayTask {
  id: number
  title: string
  category: string | null
  completed: boolean
  time_from: string | null
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Guten Morgen, Irochka ☀️'
  if (hour < 17) return 'Guten Tag, Irochka 🌿'
  if (hour < 21) return 'Guten Abend, Irochka 🌙'
  return 'Gute Nacht, Irochka ✨'
}

function formatDate(): string {
  return new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<DayTask[]>([])
  const [overdueCount, setOverdueCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const todayStr = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [tasksRes, overdueRes] = await Promise.all([
          api.get<DayTask[]>(`/day/plans?date=${todayStr}`),
          api.get<{ count: number }>('/home/overdue-count'),
        ])
        setTasks(tasksRes.data.filter((t) => !t.completed).slice(0, 3))
        setOverdueCount(overdueRes.data.count)
      } catch {
        setError('Fehler beim Laden der Daten')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [todayStr])

  const MODULE_CARDS = [
    { icon: '☀️', label: 'Mein Tag', to: '/day' },
    { icon: '🏡', label: 'Zuhause', to: '/home' },
    { icon: '💚', label: 'Gesundheit', to: '/health' },
    { icon: '✈️', label: 'Reisen', to: '/travel' },
  ]

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-4xl mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          {getGreeting()}
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm capitalize">{formatDate()}</p>
      </div>

      {/* Module shortcuts */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {MODULE_CARDS.map(({ icon, label, to }) => (
          <Card key={to} onClick={() => navigate(to)} className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <span className="font-medium text-sm">{label}</span>
          </Card>
        ))}
      </div>

      {/* Focus of the day */}
      <section className="mb-6">
        <h2 className="text-xl mb-3 text-[var(--color-text-muted)]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Fokus des Tages
        </h2>
        {loading ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : tasks.length === 0 ? (
          <Card className="text-center text-[var(--color-text-muted)] py-6 text-sm">
            Heute noch keine Aufgaben geplant
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map((t) => (
              <Card key={t.id} onClick={() => navigate('/day')} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-[var(--color-primary)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{t.title}</p>
                  {t.time_from && (
                    <p className="text-xs text-[var(--color-text-muted)]">{t.time_from.slice(0, 5)}</p>
                  )}
                </div>
                {t.category && <Badge label={t.category} variant="category" />}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Home status */}
      {overdueCount !== null && overdueCount > 0 && (
        <section>
          <Card onClick={() => navigate('/home')} className="flex items-center gap-3">
            <span className="text-2xl">🏡</span>
            <div>
              <p className="font-medium text-sm">
                {overdueCount} Putzaufgabe{overdueCount !== 1 ? 'n' : ''} überfällig
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">Zum Zuhause-Modul</p>
            </div>
          </Card>
        </section>
      )}
    </div>
  )
}
