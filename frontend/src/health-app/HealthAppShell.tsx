import React, { useEffect } from 'react'
import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/health-app', icon: '📝', label: 'Heute', end: true },
  { to: '/health-app/history', icon: '📜', label: 'Verlauf' },
  { to: '/health-app/charts', icon: '📊', label: 'Grafiken' },
  { to: '/health-app/doctors', icon: '🩺', label: 'Ärzte' },
  { to: '/health-app/medications', icon: '💊', label: 'Medikamente' },
]

export default function HealthAppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const titleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    const touchIcon = document.querySelector('link[rel="apple-touch-icon"]')
    const prevTitle = document.title
    const prevMetaTitle = titleMeta?.getAttribute('content') ?? null
    const prevIconHref = touchIcon?.getAttribute('href') ?? null

    document.title = 'IRIS Gesundheit'
    titleMeta?.setAttribute('content', 'IRIS Gesundheit')
    touchIcon?.setAttribute('href', '/icons/health-192.svg')

    return () => {
      document.title = prevTitle
      if (prevMetaTitle !== null) titleMeta?.setAttribute('content', prevMetaTitle)
      if (prevIconHref !== null) touchIcon?.setAttribute('href', prevIconHref)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <header className="px-5 pt-6 pb-4 bg-[var(--color-surface)] border-b border-[var(--color-muted)]">
        <h1 className="text-4xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          💚 Gesundheit
        </h1>
      </header>

      <main className="flex-1 pb-24">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-muted)] safe-bottom z-50">
        <div className="flex justify-around items-stretch">
          {TABS.map(({ to, icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 flex-1 min-h-[64px] py-2 transition-colors ${
                  isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
                }`
              }
            >
              <span className="text-2xl leading-none">{icon}</span>
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
