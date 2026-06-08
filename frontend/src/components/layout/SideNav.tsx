import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const NAV_ITEMS = [
  { to: '/', icon: '✦', label: 'Übersicht', end: true },
  { to: '/day', icon: '☀️', label: 'Mein Tag' },
  { to: '/home', icon: '🏡', label: 'Zuhause' },
  { to: '/health', icon: '💚', label: 'Gesundheit' },
  { to: '/goals', icon: '🧭', label: 'Ziele' },
  { to: '/travel', icon: '✈️', label: 'Reisen' },
]

export default function SideNav() {
  const setToken = useAuthStore((s) => s.setToken)

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-60 bg-[var(--color-surface)] border-r border-[var(--color-muted)] flex flex-col z-50">
      <div className="px-6 py-8">
        <h1 className="text-3xl font-semibold text-[var(--color-primary)]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          IRIS
        </h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">Leben im Gleichgewicht</p>
      </div>

      <div className="flex-1 px-3">
        {NAV_ITEMS.map(({ to, icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-colors text-sm font-medium ${
                isActive
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text)] hover:bg-[var(--color-muted)]'
              }`
            }
          >
            <span className="text-lg">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      <div className="px-6 py-6">
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
