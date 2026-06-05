interface BPSectionProps {
  morSys: string
  morDia: string
  morPulse: string
  eveSys: string
  eveDia: string
  evePulse: string
  medTaken: boolean
  onChange: (field: string, val: string | boolean) => void
}

function bpStatus(sys: string, dia: string): { label: string; color: string; icon: string } | null {
  const s = parseInt(sys)
  const d = parseInt(dia)
  if (!s || !d) return null
  if (s >= 140 || d >= 90) return { label: 'Hoch', color: 'text-red-500', icon: '🔴' }
  if (s >= 130 || d >= 80) return { label: 'Erhöht', color: 'text-orange-500', icon: '🟡' }
  return { label: 'Normal', color: 'text-[var(--color-primary)]', icon: '🟢' }
}

function BPRow({
  label, sys, dia, pulse, prefix, onChange,
}: {
  label: string
  sys: string
  dia: string
  pulse: string
  prefix: string
  onChange: (f: string, v: string) => void
}) {
  const status = bpStatus(sys, dia)
  return (
    <div className="mb-2">
      <p className="text-xs text-[var(--color-text-muted)] mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          placeholder="120"
          value={sys}
          onChange={e => onChange(`${prefix}_systolic`, e.target.value)}
          className="w-16 text-center text-lg font-semibold border border-[var(--color-muted)] rounded-lg p-2 bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
        />
        <span className="text-[var(--color-text-muted)] font-bold">/</span>
        <input
          type="number"
          inputMode="numeric"
          placeholder="80"
          value={dia}
          onChange={e => onChange(`${prefix}_diastolic`, e.target.value)}
          className="w-16 text-center text-lg font-semibold border border-[var(--color-muted)] rounded-lg p-2 bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
        />
        <span className="text-xs text-[var(--color-text-muted)] ml-1">Puls</span>
        <input
          type="number"
          inputMode="numeric"
          placeholder="72"
          value={pulse}
          onChange={e => onChange(`pulse_${prefix.split('_')[1] || prefix}`, e.target.value)}
          className="w-14 text-center border border-[var(--color-muted)] rounded-lg p-2 bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
        />
        {status && <span className={`text-sm font-medium ${status.color}`}>{status.icon} {status.label}</span>}
      </div>
    </div>
  )
}

export default function BPSection({
  morSys, morDia, morPulse, eveSys, eveDia, evePulse, medTaken, onChange,
}: BPSectionProps) {
  return (
    <div className="space-y-3">
      <BPRow
        label="Morgens"
        sys={morSys} dia={morDia} pulse={morPulse}
        prefix="bp_morning"
        onChange={(f, v) => onChange(f, v)}
      />
      <BPRow
        label="Abends"
        sys={eveSys} dia={eveDia} pulse={evePulse}
        prefix="bp_evening"
        onChange={(f, v) => onChange(f, v)}
      />
      <label className="flex items-center gap-2 cursor-pointer mt-1">
        <input
          type="checkbox"
          checked={medTaken}
          onChange={e => onChange('medication_taken', e.target.checked)}
          className="w-4 h-4 accent-[var(--color-primary)]"
        />
        <span className="text-sm">Medikament eingenommen</span>
      </label>
    </div>
  )
}
