import { useEffect, useState } from 'react'
import { useHealthStore } from '../../../store/healthStore'
import SleepSection from '../SleepSection'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function SleepTab() {
  const { todayRecord, updateRecord, isLoading } = useHealthStore()
  const [hours, setHours] = useState('')
  const [quality, setQuality] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setHours(todayRecord?.sleep_hours?.toString() ?? '')
    setQuality(todayRecord?.sleep_quality ?? null)
    setNotes(todayRecord?.sleep_notes ?? '')
  }, [todayRecord])

  function onChange(field: string, val: string | number | null) {
    if (field === 'sleep_hours') setHours(val as string)
    else if (field === 'sleep_quality') setQuality(val as number | null)
    else if (field === 'sleep_notes') setNotes(val as string)
  }

  async function handleSave() {
    await updateRecord(todayStr(), {
      sleep_hours: hours ? parseFloat(hours) : null,
      sleep_quality: quality,
      sleep_notes: notes || null,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <SleepSection hours={hours} quality={quality} notes={notes} onChange={onChange} />
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
