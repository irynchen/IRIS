import { useState, useEffect } from 'react'
import { useHealthStore } from '../../store/healthStore'
import { HealthRecordCreate } from '../../api/health'
import BPSection from './BPSection'
import WeightSection from './WeightSection'
import SleepSection from './SleepSection'
import KneeSection from './KneeSection'
import MoodSection from './MoodSection'

const STORAGE_KEY = 'iris_health_draft'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

interface SectionProps {
  title: string
  emoji: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, emoji, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-[var(--color-muted)] rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 bg-[var(--color-surface)] text-left"
      >
        <span className="font-medium">
          {emoji} {title}
        </span>
        <span className="text-[var(--color-text-muted)] text-lg">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="p-4 bg-[var(--color-bg)] border-t border-[var(--color-muted)]">{children}</div>}
    </div>
  )
}

interface FormState {
  weight: string
  morSys: string; morDia: string; morPulse: string
  eveSys: string; eveDia: string; evePulse: string
  medTaken: boolean; medNotes: string
  sleepHours: string; sleepQuality: number | null; sleepNotes: string
  kneePain: number | null; kneeSwelling: string; kneeExercises: boolean; steps: string
  mood: number | null; energy: number | null; anxiety: number | null
  notes: string
}

function emptyForm(): FormState {
  return {
    weight: '', morSys: '', morDia: '', morPulse: '',
    eveSys: '', eveDia: '', evePulse: '',
    medTaken: false, medNotes: '',
    sleepHours: '', sleepQuality: null, sleepNotes: '',
    kneePain: null, kneeSwelling: '', kneeExercises: false, steps: '',
    mood: null, energy: null, anxiety: null, notes: '',
  }
}

function recordToForm(r: HealthRecordCreate | null): FormState {
  if (!r) return emptyForm()
  return {
    weight: r.weight_kg?.toString() ?? '',
    morSys: r.bp_morning_systolic?.toString() ?? '',
    morDia: r.bp_morning_diastolic?.toString() ?? '',
    morPulse: r.pulse_morning?.toString() ?? '',
    eveSys: r.bp_evening_systolic?.toString() ?? '',
    eveDia: r.bp_evening_diastolic?.toString() ?? '',
    evePulse: r.pulse_evening?.toString() ?? '',
    medTaken: r.medication_taken ?? false,
    medNotes: r.medication_notes ?? '',
    sleepHours: r.sleep_hours?.toString() ?? '',
    sleepQuality: r.sleep_quality ?? null,
    sleepNotes: r.sleep_notes ?? '',
    kneePain: r.knee_pain ?? null,
    kneeSwelling: r.knee_swelling ?? '',
    kneeExercises: r.knee_exercises_done ?? false,
    steps: r.steps?.toString() ?? '',
    mood: r.mood ?? null,
    energy: r.energy ?? null,
    anxiety: r.anxiety ?? null,
    notes: r.notes ?? '',
  }
}

function formToPayload(f: FormState): HealthRecordCreate {
  return {
    date: todayStr(),
    weight_kg: f.weight ? parseFloat(f.weight) : null,
    bp_morning_systolic: f.morSys ? parseInt(f.morSys) : null,
    bp_morning_diastolic: f.morDia ? parseInt(f.morDia) : null,
    pulse_morning: f.morPulse ? parseInt(f.morPulse) : null,
    bp_evening_systolic: f.eveSys ? parseInt(f.eveSys) : null,
    bp_evening_diastolic: f.eveDia ? parseInt(f.eveDia) : null,
    pulse_evening: f.evePulse ? parseInt(f.evePulse) : null,
    medication_taken: f.medTaken,
    medication_notes: f.medNotes || null,
    sleep_hours: f.sleepHours ? parseFloat(f.sleepHours) : null,
    sleep_quality: f.sleepQuality,
    sleep_notes: f.sleepNotes || null,
    knee_pain: f.kneePain,
    knee_swelling: f.kneeSwelling || null,
    knee_exercises_done: f.kneeExercises,
    steps: f.steps ? parseInt(f.steps) : null,
    mood: f.mood,
    energy: f.energy,
    anxiety: f.anxiety,
    notes: f.notes || null,
  }
}

export default function TodayForm() {
  const { todayRecord, saveRecord, isLoading } = useHealthStore()
  const [form, setForm] = useState<FormState>(() => {
    try {
      const draft = localStorage.getItem(STORAGE_KEY)
      return draft ? JSON.parse(draft) : recordToForm(todayRecord)
    } catch {
      return emptyForm()
    }
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (todayRecord) setForm(recordToForm(todayRecord))
  }, [todayRecord])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
  }, [form])

  function set(field: string, val: unknown) {
    setForm(f => ({ ...f, [field]: val }))
  }

  const BP_FIELD_MAP: Record<string, string> = {
    bp_morning_systolic: 'morSys',
    bp_morning_diastolic: 'morDia',
    pulse_morning: 'morPulse',
    bp_evening_systolic: 'eveSys',
    bp_evening_diastolic: 'eveDia',
    pulse_evening: 'evePulse',
    medication_taken: 'medTaken',
  }

  function handleBPChange(field: string, val: string | boolean) {
    set(BP_FIELD_MAP[field] ?? field, val)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await saveRecord(formToPayload(form))
    localStorage.removeItem(STORAGE_KEY)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Section title="Blutdruck" emoji="💊" defaultOpen={true}>
        <BPSection
          morSys={form.morSys} morDia={form.morDia} morPulse={form.morPulse}
          eveSys={form.eveSys} eveDia={form.eveDia} evePulse={form.evePulse}
          medTaken={form.medTaken}
          onChange={handleBPChange}
        />
      </Section>

      <Section title="Gewicht" emoji="⚖️">
        <WeightSection
          value={form.weight}
          onChange={v => set('weight', v)}
          prevWeight={todayRecord?.weight_kg}
        />
      </Section>

      <Section title="Schlaf" emoji="😴">
        <SleepSection
          hours={form.sleepHours}
          quality={form.sleepQuality}
          notes={form.sleepNotes}
          onChange={(f, v) => set(
            f === 'sleep_hours' ? 'sleepHours' :
            f === 'sleep_quality' ? 'sleepQuality' : 'sleepNotes',
            v
          )}
        />
      </Section>

      <Section title="Knie" emoji="🦵">
        <KneeSection
          pain={form.kneePain}
          swelling={form.kneeSwelling}
          exercisesDone={form.kneeExercises}
          steps={form.steps}
          onChange={(f, v) => set(
            f === 'knee_pain' ? 'kneePain' :
            f === 'knee_swelling' ? 'kneeSwelling' :
            f === 'knee_exercises_done' ? 'kneeExercises' : 'steps',
            v
          )}
        />
      </Section>

      <Section title="Befinden" emoji="✨">
        <MoodSection
          mood={form.mood}
          energy={form.energy}
          anxiety={form.anxiety}
          onChange={(f, v) => set(f, v)}
        />
        <textarea
          placeholder="Freitext-Notizen..."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={2}
          className="w-full mt-3 border border-[var(--color-muted)] rounded-xl p-2 text-sm bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
        />
      </Section>

      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-4 rounded-2xl text-white font-semibold text-lg transition-all active:scale-[0.98] ${
          saved
            ? 'bg-[var(--color-primary)]'
            : 'bg-[var(--color-primary)] hover:brightness-95'
        } disabled:opacity-50`}
      >
        {saved ? '✅ Gespeichert!' : isLoading ? 'Wird gespeichert…' : 'Eintrag speichern'}
      </button>
    </form>
  )
}
