import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DayPage from './pages/DayPage'
import HomePage from './pages/HomePage'
import HealthPage from './pages/HealthPage'

function PlaceholderPage({ title, emoji }: { title: string; emoji: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
      <span className="text-6xl">{emoji}</span>
      <h2 className="text-3xl text-[var(--color-text-muted)]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
        {title}
      </h2>
      <p className="text-[var(--color-text-muted)] bg-[var(--color-muted)] px-4 py-2 rounded-full text-sm">
        Demnächst verfügbar
      </p>
    </div>
  )
}

function ProtectedRoutes() {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/day" element={<DayPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/travel" element={<PlaceholderPage title="Reisen" emoji="✈️" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  const token = useAuthStore((s) => s.token)

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={token ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  )
}
