import React from 'react'

export default function AppShell({ children }: { children: React.ReactNode }){
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="p-4">IRIS</header>
      <main>{children}</main>
    </div>
  )
}
