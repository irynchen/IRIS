import { useEffect, useState } from 'react'
import { useHealthStore } from '../../../store/healthStore'
import KneeSection from '../KneeSection'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function KneeTab() {
  const { todayRecord, updateRecord, isLoading } = useHealthStore()
  const [pain, setPain] = useState<number | null>(null)
  const [swelling, setSwelling] = useState('')
  const [exercisesDone, setExercisesDone] = useState(false)
  const [steps, setSteps] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setPain(todayRecord?.knee_pain ?? null)
    setSwelling(todayRecord?.knee_swelling ?? '')
    setExercisesDone(todayRecord?.knee_exercises_done ?? false)
    setSteps(todayRecord?.steps?.toString() ?? '')
  }, [todayRecord])

  function onChange(field: string, val: number | string | boolean | null) {
    if (field === 'knee_pain') setPain(val as number | null)
    else if (field === 'knee_swelling') setSwelling(val as string)
    else if (field === 'knee_exercises_done') setExercisesDone(val as boolean)
    else if (field === 'steps') setSteps(val as string)
  }

  async function handleSave() {
    await updateRecord(todayStr(), {
      knee_pain: pain,
      knee_swelling: swelling || null,
      knee_exercises_done: exercisesDone,
      steps: steps ? parseInt(steps) : null,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <KneeSection pain={pain} swelling={swelling} exercisesDone={exercisesDone} steps={steps} onChange={onChange} />
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
