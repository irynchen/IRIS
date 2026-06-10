import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const MAIN_ITEMS = [
  { to: '/', icon: '✦', label: 'Übersicht', end: true },
  { to: '/day', icon: '☀️', label: 'Mein Tag' },
  { to: '/calendar', icon: '📅', label: 'Kalender' },
  { to: '/home', icon: '🏡', label: 'Zuhause' },
  { to: '/health', icon: '💚', label: 'Gesundheit' },
  { to: '/goals', icon: '🧭', label: 'Ziele' },
  { to: '/travel', icon: '✈️', label: 'Reisen' },
]

const MORE_ITEMS = [
  { to: '/beauty',    icon: '💅', label: 'Beauty' },
  { to: '/learning',  icon: '📚', label: 'Lernen' },
  { to: '/finance',   icon: '💰', label: 'Finanzen' },
  { to: '/car',       icon: '🚗', label: 'Auto' },
  { to: '/nutrition', icon: '🥗', label: 'Ernährung' },
  { to: '/wellbeing', icon: '🧘', label: 'Wohlbefinden' },
  { to: '/work',      icon: '💼', label: 'Arbeit' },
]

function NavItem({ to, icon, label, end }: { to: string; icon: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-xl mb-0.5 transition-colors text-sm font-medium ${
          isActive
            ? 'bg-[var(--color-primary)] text-white'
            : 'text-[var(--color-text)] hover:bg-[var(--color-muted)]'
        }`
      }
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}

export default function SideNav() {
  const setToken = useAuthStore((s) => s.setToken)

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-60 bg-[var(--color-surface)] border-r border-[var(--color-muted)] flex flex-col z-50">
      <div className="px-6 py-6">
        <h1 className="text-3xl font-semibold text-[var(--color-primary)]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          IRIS
        </h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">Leben im Gleichgewicht</p>
      </div>

      <div className="flex-1 px-3 overflow-y-auto">
        {MAIN_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        <div className="mt-3 mb-1 px-4">
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-medium">Weitere Bereiche</p>
        </div>

        {MORE_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>

      <div className="px-6 py-5 border-t border-[var(--color-muted)]">
        <button
          onClick={() => setToken(null)}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          Abmelden
        </button>
      </div>
    </nav>
  )
}
