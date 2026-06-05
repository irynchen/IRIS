import React from 'react'

const CATEGORY_COLORS: Record<string, string> = {
  work: 'bg-blue-100 text-blue-700',
  health: 'bg-green-100 text-green-700',
  home: 'bg-amber-100 text-amber-700',
  learning: 'bg-purple-100 text-purple-700',
  rest: 'bg-pink-100 text-pink-700',
  food: 'bg-orange-100 text-orange-700',
}

interface BadgeProps {
  label: string
  variant?: 'category' | 'default'
}

export default function Badge({ label, variant = 'default' }: BadgeProps) {
  const colorClass =
    variant === 'category'
      ? (CATEGORY_COLORS[label] ?? 'bg-gray-100 text-gray-600')
      : 'bg-[var(--color-muted)] text-[var(--color-text-muted)]'

  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
      {label}
    </span>
  )
}
