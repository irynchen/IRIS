import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import DayWidget from '../components/dashboard/DayWidget'
import HealthWidget from '../components/dashboard/HealthWidget'
import SmartDay from '../components/dashboard/SmartDay'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Guten Morgen, Irochka ☀️'
  if (h < 17) return 'Guten Tag, Irochka 🌿'
  if (h < 21) return 'Guten Abend, Irochka 🌙'
  return 'Gute Nacht, Irochka ✨'
}

function formatDate(): string {
  return new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
}

const MORE_MODULES = [
  { icon: '💅', label: 'Beauty',       to: '/beauty' },
  { icon: '📚', label: 'Lernen',       to: '/learning' },
  { icon: '💰', label: 'Finanzen',     to: '/finance' },
  { icon: '🚗', label: 'Auto',         to: '/car' },
  { icon: '✈️', label: 'Reisen',       to: '/travel' },
  { icon: '🥗', label: 'Ernährung',    to: '/nutrition' },
  { icon: '🧘', label: 'Wohlbefinden', to: '/wellbeing' },
  { icon: '💼', label: 'Arbeit',       to: '/work' },
]

export default function DashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="p-4 max-w-2xl mx-auto pb-8">

      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-3xl mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          {getGreeting()}
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm capitalize">{formatDate()}</p>
      </div>

      {/* Smart Day — Für heute */}
      <section className="mb-5">
        <h2
          className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-3"
        >
          Für heute
        </h2>
        <SmartDay />
      </section>

      {/* Two small widgets side by side */}
      <section className="grid grid-cols-2 gap-3 mb-5">
        <Card onClick={() => navigate('/day')} className="cursor-pointer">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
            ☀️ Mein Tag
          </p>
          <DayWidget />
        </Card>

        <Card onClick={() => navigate('/health')} className="cursor-pointer">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
            💚 Gesundheit
          </p>
          <HealthWidget />
        </Card>
      </section>

      {/* Quick nav — main areas */}
      <section className="mb-2">
        <h2
          className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-3"
        >
          Bereiche
        </h2>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => navigate('/home')}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-muted)] hover:border-[var(--color-primary)] transition-colors"
          >
            <span className="text-xl">🏡</span>
            <span className="text-[10px] text-[var(--color-text-muted)] font-medium">Zuhause</span>
          </button>
          <button
            onClick={() => navigate('/goals')}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-muted)] hover:border-[var(--color-primary)] transition-colors"
          >
            <span className="text-xl">🧭</span>
            <span className="text-[10px] text-[var(--color-text-muted)] font-medium">Ziele</span>
          </button>
          {MORE_MODULES.map(({ icon, label, to }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-muted)] hover:border-[var(--color-primary)] transition-colors"
            >
              <span className="text-xl">{icon}</span>
              <span className="text-[10px] text-[var(--color-text-muted)] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
