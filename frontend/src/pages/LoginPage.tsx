import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setToken = useAuthStore((s) => s.setToken)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<{ access_token: string }>('/auth/login', {
        username: 'irina',
        password,
      })
      setToken(res.data.access_token)
      navigate(searchParams.get('redirect') || '/')
    } catch {
      setError('Falsches Passwort. Bitte erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Logo */}
      <div className="mb-10 text-center">
        <h1
          className="text-6xl font-semibold text-[var(--color-primary)] mb-2"
          style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '0.15em' }}
        >
          IRIS
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm tracking-widest uppercase">
          Leben im Gleichgewicht
        </p>
      </div>

      {/* Login card */}
      <div
        className="w-full max-w-sm bg-[var(--color-surface)] rounded-[var(--radius-card)] p-8"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-2 tracking-wide uppercase">
              Passwort
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-muted)] bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)] text-sm transition-colors"
              placeholder="Passwort eingeben"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
              minLength={1}
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium tracking-wide hover:opacity-90 transition-opacity disabled:opacity-60 mt-2"
          >
            {loading ? 'Einloggen...' : 'Einloggen'}
          </button>
        </form>
      </div>

      <p className="mt-8 text-[var(--color-text-muted)] text-xs">
        iris.goeloria.de
      </p>
    </div>
  )
}
