import React, { useEffect, useState } from 'react'
import { THEMES, ThemeId, applyTheme, getTheme, nextTheme } from '../../theme'

// Ein Button, jeder Klick schaltet zum nächsten Design: Klassisch → Kreativ → Modern → …
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeId>(getTheme)

  useEffect(() => {
    const onChange = (e: Event) => setTheme((e as CustomEvent<ThemeId>).detail)
    window.addEventListener('iris-theme', onChange)
    return () => window.removeEventListener('iris-theme', onChange)
  }, [])

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0]
  const next = THEMES.find((t) => t.id === nextTheme(theme)) ?? THEMES[0]

  return (
    <button
      onClick={() => applyTheme(next.id)}
      title={`Design wechseln → ${next.label}`}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-[var(--color-muted)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors ${className}`}
    >
      <span className="text-base leading-none">{current.icon}</span>
      <span className="flex-1 text-left">Design: {current.label}</span>
      <span className="flex gap-1" aria-hidden>
        {THEMES.map((t) => (
          <span key={t.id} className={`w-1.5 h-1.5 rounded-full ${t.id === theme ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-muted)]'}`} />
        ))}
      </span>
    </button>
  )
}
