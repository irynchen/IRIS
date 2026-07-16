import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DayPage from './pages/DayPage'
import HomePage from './pages/HomePage'
import HealthPage from './pages/HealthPage'
import DoctorsPage from './pages/DoctorsPage'
import MedicationsPage from './pages/MedicationsPage'
import GoalsPage from './pages/GoalsPage'
import AreaTaskPage from './pages/AreaTaskPage'
import TravelPage from './pages/TravelPage'
import CalendarPage from './pages/CalendarPage'
import PsychologyPage from './pages/PsychologyPage'
import SettingsPage from './pages/SettingsPage'
import ShoppingPage from './pages/ShoppingPage'

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
        <Route path="/health/doctors" element={<DoctorsPage />} />
        <Route path="/health/medications" element={<MedicationsPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/travel" element={<TravelPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/psychology" element={<PsychologyPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/shopping" element={<ShoppingPage />} />
        <Route path="/beauty"    element={<AreaTaskPage />} />
        <Route path="/learning"  element={<AreaTaskPage />} />
        <Route path="/car"       element={<AreaTaskPage />} />
        <Route path="/finance"   element={<AreaTaskPage />} />
        <Route path="/nutrition" element={<AreaTaskPage />} />
        <Route path="/wellbeing" element={<AreaTaskPage />} />
        <Route path="/work"      element={<AreaTaskPage />} />
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
