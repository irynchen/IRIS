import React from 'react'

export default function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="border-2 border-[var(--color-muted)] border-t-[var(--color-primary)] rounded-full animate-spin"
    />
  )
}
