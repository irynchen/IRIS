import React from 'react'
import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', icon: '✦', label: 'Übersicht', end: true },
  { to: '/day', icon: '☀️', label: 'Mein Tag' },
  { to: '/home', icon: '🏡', label: 'Zuhause' },
  { to: '/health', icon: '💚', label: 'Gesundheit' },
  { to: '/goals', icon: '🧭', label: 'Ziele' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-muted)] safe-bottom z-50">
      <div className="flex justify-around items-center h-16">
        {NAV_ITEMS.map(({ to, icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center px-2 transition-colors ${
                isActive
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)]'
              }`
            }
          >
            <span className="text-xl leading-none">{icon}</span>
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
