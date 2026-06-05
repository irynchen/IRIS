import React, { useRef, useState } from 'react'
import { DayTask, CATEGORIES, PRIORITY_COLORS } from '../../api/day'

interface Props {
  task: DayTask
  onToggle: (id: number) => void
  onDelete: (id: number) => void
}

export default function TaskCard({ task, onToggle, onDelete }: Props) {
  const cat = CATEGORIES[task.category ?? '']
  const [offsetX, setOffsetX] = useState(0)
  const startX = useRef<number | null>(null)
  const deleted = useRef(false)

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    deleted.current = false
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startX.current === null) return
    const dx = e.touches[0].clientX - startX.current
    if (dx < 0) setOffsetX(Math.max(dx, -80))
  }

  function handleTouchEnd() {
    if (offsetX < -60 && !deleted.current) {
      deleted.current = true
      onDelete(task.id)
    }
    setOffsetX(0)
    startX.current = null
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* swipe-to-delete background */}
      <div className="absolute inset-0 flex items-center justify-end pr-4 bg-red-400 rounded-2xl">
        <span className="text-white text-sm font-medium">Löschen</span>
      </div>

      <div
        className="relative flex items-center gap-3 bg-[var(--color-surface)] shadow-[var(--shadow-card)] rounded-2xl px-4 py-3 transition-transform"
        style={{ transform: `translateX(${offsetX}px)` }}
      >
        {/* category stripe */}
        {cat && (
          <div
            className="w-1 self-stretch rounded-full flex-shrink-0"
            style={{ backgroundColor: cat.color }}
          />
        )}

        {/* complete button */}
        <button
          onClick={() => onToggle(task.id)}
          className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
            task.completed
              ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
              : 'border-[var(--color-muted)] hover:border-[var(--color-primary)]'
          }`}
          aria-label={task.completed ? 'Wiedereröffnen' : 'Erledigen'}
        >
          {task.completed && <span className="text-white text-xs">✓</span>}
        </button>

        {/* content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-[var(--color-text-muted)]' : ''}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {task.time_from && (
              <span className="text-xs text-[var(--color-text-muted)]">
                {task.time_from.slice(0, 5)}
                {task.time_to ? ` – ${task.time_to.slice(0, 5)}` : ''}
              </span>
            )}
            {cat && (
              <span className="text-xs" style={{ color: cat.color }}>
                {cat.icon} {cat.label}
              </span>
            )}
            {task.repeat_days && (
              <span className="text-xs text-[var(--color-text-muted)]">↺ {task.repeat_days}d</span>
            )}
          </div>
        </div>

        {/* priority dot */}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: PRIORITY_COLORS[task.priority] ?? '#9ca3af' }}
        />

        {/* delete */}
        <button
          onClick={() => onDelete(task.id)}
          className="text-[var(--color-text-muted)] hover:text-red-400 transition-colors w-8 h-8 flex items-center justify-center text-lg"
          aria-label="Löschen"
        >
          ×
        </button>
      </div>
    </div>
  )
}
