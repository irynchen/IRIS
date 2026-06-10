import React, { useEffect } from 'react'
import BottomNav from './BottomNav'
import SideNav from './SideNav'
import { useNotificationStore } from '../../store/notificationStore'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const startPolling = useNotificationStore((s) => s.startPolling)
  useEffect(() => startPolling(), [])
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <SideNav />
      </div>

      {/* Main content */}
      <main className="md:ml-60 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  )
}
