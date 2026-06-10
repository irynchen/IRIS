import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

const MAIN_ITEMS = [
  { to: '/', icon: '✦', label: 'Übersicht', end: true },
  { to: '/day', icon: '☀️', label: 'Mein Tag' },
  { to: '/home', icon: '🏡', label: 'Zuhause' },
  { to: '/health', icon: '💚', label: 'Gesundheit' },
]

const MORE_ITEMS = [
  { to: '/calendar',  icon: '📅', label: 'Kalender' },
  { to: '/goals',     icon: '🧭', label: 'Ziele' },
  { to: '/travel',    icon: '✈️', label: 'Reisen' },
  { to: '/beauty',    icon: '💅', label: 'Beauty' },
  { to: '/learning',  icon: '📚', label: 'Lernen' },
  { to: '/finance',   icon: '💰', label: 'Finanzen' },
  { to: '/car',       icon: '🚗', label: 'Auto' },
  { to: '/nutrition', icon: '🥗', label: 'Ernährung' },
  { to: '/wellbeing', icon: '🧘', label: 'Wohlbefinden' },
  { to: '/work',      icon: '💼', label: 'Arbeit' },
]

export default function BottomNav() {
  const [showMore, setShowMore] = useState(false)
  const navigate = useNavigate()

  function handleMoreNav(to: string) {
    setShowMore(false)
    navigate(to)
  }

  return (
    <>
      {/* More overlay */}
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setShowMore(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-muted)] px-4 pt-4 pb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-medium mb-3 px-1">
              Weitere Bereiche
            </p>
            <div className="grid grid-cols-4 gap-2 pb-2">
              {MORE_ITEMS.map(({ to, icon, label }) => (
                <button
                  key={to}
                  onClick={() => handleMoreNav(to)}
                  className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl hover:bg-[var(--color-muted)] transition-colors"
                >
                  <span className="text-2xl leading-none">{icon}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-muted)] safe-bottom z-50">
        <div className="flex justify-around items-center h-16">
          {MAIN_ITEMS.map(({ to, icon, label, end }) => (
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

          <button
            onClick={() => setShowMore((v) => !v)}
            className={`flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center px-2 transition-colors ${
              showMore ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
            }`}
          >
            <span className="text-xl leading-none font-bold">⋯</span>
            <span className="text-[10px] font-medium">Mehr</span>
          </button>
        </div>
      </nav>
    </>
  )
}
