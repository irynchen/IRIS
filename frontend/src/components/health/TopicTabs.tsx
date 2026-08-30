import { useState } from 'react'
import BloodPressureTab from './topics/BloodPressureTab'
import WeightTab from './topics/WeightTab'
import SleepTab from './topics/SleepTab'
import KneeTab from './topics/KneeTab'
import MoodTab from './topics/MoodTab'

const TOPICS = [
  { key: 'bp', label: 'Blutdruck', emoji: '💊', Component: BloodPressureTab },
  { key: 'weight', label: 'Gewicht', emoji: '⚖️', Component: WeightTab },
  { key: 'sleep', label: 'Schlaf', emoji: '😴', Component: SleepTab },
  { key: 'knee', label: 'Knie', emoji: '🦵', Component: KneeTab },
  { key: 'mood', label: 'Befinden', emoji: '✨', Component: MoodTab },
]

export default function TopicTabs() {
  const [active, setActive] = useState(TOPICS[0].key)
  const Active = TOPICS.find(t => t.key === active)?.Component ?? BloodPressureTab

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto scrollbar-none bg-[var(--color-muted)] rounded-xl p-1">
        {TOPICS.map(t => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active === t.key
                ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <span>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      <Active />
    </div>
  )
}
