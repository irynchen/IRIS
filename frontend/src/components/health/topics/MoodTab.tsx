import { useEffect, useState } from 'react'
import { useHealthStore } from '../../../store/healthStore'
import MoodSection from '../MoodSection'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function MoodTab() {
  const { todayRecord, updateRecord, isLoading } = useHealthStore()
  const [mood, setMood] = useState<number | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [anxiety, setAnxiety] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setMood(todayRecord?.mood ?? null)
    setEnergy(todayRecord?.energy ?? null)
    setAnxiety(todayRecord?.anxiety ?? null)
    setNotes(todayRecord?.notes ?? '')
  }, [todayRecord])

  function onChange(field: string, val: number | null) {
    if (field === 'mood') setMood(val)
    else if (field === 'energy') setEnergy(val)
    else if (field === 'anxiety') setAnxiety(val)
  }

  async function handleSave() {
    await updateRecord(todayStr(), { mood, energy, anxiety, notes: notes || null })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <MoodSection mood={mood} energy={energy} anxiety={anxiety} onChange={onChange} />
      <textarea
        placeholder="Freitext-Notizen..."
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={2}
        className="w-full border border-[var(--color-muted)] rounded-xl p-2 text-sm bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
      />
      <button
        onClick={handleSave}
        disabled={isLoading}
        className="w-full py-4 rounded-2xl text-white font-semibold text-lg transition-all active:scale-[0.98] bg-[var(--color-primary)] hover:brightness-95 disabled:opacity-50"
      >
        {saved ? '✅ Gespeichert!' : isLoading ? 'Wird gespeichert…' : 'Speichern'}
      </button>
    </div>
  )
}
