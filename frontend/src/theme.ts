// Design-Themes: werden über <html data-theme="..."> umgeschaltet, die Werte stehen in styles/globals.css.
// Gespeichert pro Gerät im localStorage.

export type ThemeId = 'classic' | 'vivid' | 'modern'

export const THEMES: { id: ThemeId; label: string; icon: string; metaColor: string }[] = [
  { id: 'classic', label: 'Klassisch', icon: '🏛', metaColor: '#6B8F71' },
  { id: 'vivid',   label: 'Kreativ',   icon: '🎨', metaColor: '#8B3DFF' },
  { id: 'modern',  label: 'Modern',    icon: '◼️', metaColor: '#18181B' },
]

const STORAGE_KEY = 'iris_theme'

export function getTheme(): ThemeId {
  try {
    const t = localStorage.getItem(STORAGE_KEY)
    if (t === 'vivid' || t === 'modern') return t
  } catch { /* ignore */ }
  return 'classic'
}

export function applyTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id
  const meta = THEMES.find((t) => t.id === id)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', meta?.metaColor ?? '#6B8F71')
  try { localStorage.setItem(STORAGE_KEY, id) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('iris-theme', { detail: id }))
}

export function nextTheme(current: ThemeId): ThemeId {
  const idx = THEMES.findIndex((t) => t.id === current)
  return THEMES[(idx + 1) % THEMES.length].id
}
