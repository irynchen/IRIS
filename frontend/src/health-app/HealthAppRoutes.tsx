import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import DoctorsPage from '../pages/DoctorsPage'
import MedicationsPage from '../pages/MedicationsPage'
import HealthAppShell from './HealthAppShell'
import HealthAppToday from './HealthAppToday'
import HealthAppHistory from './HealthAppHistory'
import HealthAppCharts from './HealthAppCharts'

export default function HealthAppRoutes() {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login?redirect=/health-app" replace />

  return (
    <HealthAppShell>
      <Routes>
        <Route index element={<HealthAppToday />} />
        <Route path="history" element={<HealthAppHistory />} />
        <Route path="charts" element={<HealthAppCharts />} />
        <Route path="doctors" element={<DoctorsPage />} />
        <Route path="medications" element={<MedicationsPage />} />
        <Route path="*" element={<Navigate to="/health-app" replace />} />
      </Routes>
    </HealthAppShell>
  )
}
