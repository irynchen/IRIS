import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import DayWidget from '../components/dashboard/DayWidget'
import HomeWidget from '../components/dashboard/HomeWidget'
import HealthWidget from '../components/dashboard/HealthWidget'

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

const MODULE_CARDS = [
  { icon: '☀️', label: 'Mein Tag', to: '/day' },
  { icon: '🏡', label: 'Zuhause', to: '/home' },
  { icon: '💚', label: 'Gesundheit', to: '/health' },
  { icon: '✈️', label: 'Reisen', to: '/travel' },
]

export default function DashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-3xl mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          {getGreeting()}
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm capitalize">{formatDate()}</p>
      </div>

      {/* Live widgets */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card onClick={() => navigate('/day')} className="cursor-pointer">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
            ☀️ Mein Tag
          </p>
          <DayWidget />
        </Card>

        <Card onClick={() => navigate('/home')} className="cursor-pointer">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
            🏡 Zuhause
          </p>
          <HomeWidget />
        </Card>

        <Card onClick={() => navigate('/health')} className="cursor-pointer col-span-2">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
            💚 Gesundheit
          </p>
          <HealthWidget />
        </Card>
      </div>

      {/* Module shortcuts */}
      <h2
        className="text-lg mb-3 text-[var(--color-text-muted)]"
        style={{ fontFamily: 'Cormorant Garamond, serif' }}
      >
        Module
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {MODULE_CARDS.map(({ icon, label, to }) => (
          <Card key={to} onClick={() => navigate(to)} className="flex items-center gap-3 cursor-pointer">
            <span className="text-2xl">{icon}</span>
            <span className="font-medium text-sm">{label}</span>
          </Card>
        ))}
      </div>
    </div>
  )
}
