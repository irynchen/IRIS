import React, { useState, useEffect } from 'react'
import { settingsApi, AppSettings } from '../api/settings'

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-2xl p-6 mb-4">
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl mb-1 text-[var(--color-text)]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{children}</h3>
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [notifyHour, setNotifyHour] = useState('8')
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const s = await settingsApi.get()
    setSettings(s)
    setNotifyHour(s.notify_hour || '8')
  }

  async function saveApiKey() {
    if (!apiKey.trim()) return
    setSaving('api')
    await settingsApi.update({ anthropic_api_key: apiKey.trim() })
    setSaving(null)
    setSaved('api')
    setApiKey('')
    setShowKey(false)
    await load()
    setTimeout(() => setSaved(null), 3000)
  }

  async function saveNotifyHour() {
    setSaving('hour')
    await settingsApi.update({ notify_hour: notifyHour })
    setSaving(null)
    setSaved('hour')
    setTimeout(() => setSaved(null), 3000)
  }

  return (
    <div className="max-w-xl mx-auto pb-24 md:pb-8 px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-4xl text-[var(--color-primary)]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Einstellungen
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Konfiguration der App</p>
      </div>

      {/* Claude API */}
      <Card>
        <SectionTitle>Claude AI — API-Schlüssel</SectionTitle>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-4">
          Wird für die Situationsanalyse im Transurfing-Modul benötigt.
          Den Schlüssel bekommst du unter{' '}
          <span className="text-[var(--color-primary)]">console.anthropic.com</span>.
        </p>

        {/* Status */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-sm ${
          settings?.anthropic_api_key_set
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-amber-50 border border-amber-200 text-amber-800'
        }`}>
          <span>{settings?.anthropic_api_key_set ? '✓' : '⚠'}</span>
          <span>
            {settings?.anthropic_api_key_set
              ? `Schlüssel gesetzt: ${settings.anthropic_api_key}`
              : 'Kein API-Schlüssel gesetzt'}
          </span>
        </div>

        <label className="block text-sm font-medium mb-2">
          {settings?.anthropic_api_key_set ? 'Schlüssel ersetzen' : 'API-Schlüssel eingeben'}
        </label>
        <div className="flex gap-2 mb-1">
          <input
            type={showKey ? 'text' : 'password'}
            className="flex-1 bg-[var(--color-bg)] border border-[var(--color-muted)] rounded-xl p-3 text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]"
            placeholder="sk-ant-api03-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveApiKey()}
          />
          <button onClick={() => setShowKey((v) => !v)}
            className="px-3 text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-muted)] rounded-xl text-sm">
            {showKey ? '🙈' : '👁'}
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          Der Schlüssel wird verschlüsselt in der Datenbank gespeichert und nie im Klartext zurückgegeben.
        </p>
        <button
          onClick={saveApiKey}
          disabled={!apiKey.trim() || saving === 'api'}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium disabled:opacity-40 transition-opacity"
        >
          {saving === 'api' ? 'Speichert...' : saved === 'api' ? '✓ Gespeichert' : 'Speichern'}
        </button>
      </Card>

      {/* Email notifications */}
      <Card>
        <SectionTitle>E-Mail-Benachrichtigungen</SectionTitle>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-4">
          Tägliche Zusammenfassung wird an <span className="font-medium">iryna.shevchenko@gmx.net</span> gesendet.
        </p>

        <label className="block text-sm font-medium mb-2">Uhrzeit der täglichen E-Mail</label>
        <div className="flex items-center gap-3">
          <input
            type="number" min={0} max={23} value={notifyHour}
            onChange={(e) => setNotifyHour(e.target.value)}
            className="w-20 bg-[var(--color-bg)] border border-[var(--color-muted)] rounded-xl p-3 text-sm text-center focus:outline-none focus:border-[var(--color-primary)]"
          />
          <span className="text-sm text-[var(--color-text-muted)]">Uhr (0–23)</span>
          <button
            onClick={saveNotifyHour}
            disabled={saving === 'hour'}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium disabled:opacity-40"
          >
            {saving === 'hour' ? 'Speichert...' : saved === 'hour' ? '✓' : 'Speichern'}
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-2">
          Änderungen werden nach einem Server-Neustart wirksam.
        </p>
      </Card>

      {/* Info */}
      <Card>
        <SectionTitle>Über IRIS</SectionTitle>
        <div className="text-sm text-[var(--color-text-muted)] space-y-1 mt-2">
          <p>Stack: FastAPI · PostgreSQL · React · Tailwind</p>
          <p>Server: iris.goeloria.de</p>
          <p className="pt-1 text-xs">Alle Daten gehören nur dir.</p>
        </div>
      </Card>
    </div>
  )
}
