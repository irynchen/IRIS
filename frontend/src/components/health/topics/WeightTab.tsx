import { useEffect, useState } from 'react'
import { useHealthStore } from '../../../store/healthStore'
import WeightSection from '../WeightSection'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function WeightTab() {
  const { todayRecord, updateRecord, isLoading } = useHealthStore()
  const [value, setValue] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setValue(todayRecord?.weight_kg?.toString() ?? '')
  }, [todayRecord])

  async function handleSave() {
    await updateRecord(todayStr(), { weight_kg: value ? parseFloat(value) : null })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <WeightSection value={value} onChange={setValue} prevWeight={todayRecord?.weight_kg} />
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
