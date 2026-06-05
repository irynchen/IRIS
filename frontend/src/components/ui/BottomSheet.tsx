import React, { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export default function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] rounded-t-2xl md:rounded-2xl p-6 shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          {title && (
            <h2 className="text-xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xl transition-colors"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
