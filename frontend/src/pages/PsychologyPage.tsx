import React, { useState, useEffect, useRef } from 'react'
import { psychApi, PsychSession, PsychItem } from '../api/psychology'

type Tab = 'jetzt' | 'pendulums' | 'future' | 'transurfing' | 'history'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-2xl p-5 mb-4 ${className}`}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{children}</h3>
}

function CollapsibleCard({ title, subtitle, children, defaultOpen = true }: {
  title: React.ReactNode; subtitle?: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-2xl mb-4 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--color-muted)]/30 transition-colors"
      >
        <div>
          <h3 className="text-xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{title}</h3>
          {subtitle && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>}
        </div>
        <span className="text-xs text-[var(--color-text-muted)] ml-4 flex-shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

function Btn({ children, onClick, variant = 'primary', className = '', disabled = false }: {
  children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  className?: string; disabled?: boolean
}) {
  const base = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40'
  const variants = {
    primary:   'bg-[var(--color-primary)] text-white hover:opacity-90',
    secondary: 'bg-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)]/70',
    danger:    'bg-red-100 text-red-700 hover:bg-red-200',
    ghost:     'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-muted)]',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-1.5 mb-5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
          i < current ? 'bg-[var(--color-primary)]' : i === current ? 'bg-[var(--color-primary)] opacity-60' : 'bg-[var(--color-muted)]'
        }`} />
      ))}
    </div>
  )
}

// ── Данные ────────────────────────────────────────────────────────────────────

const EMOTIONS = ['Страх', 'Злость', 'Грусть', 'Одиночество', 'Стыд', 'Тоска', 'Паника', 'Растерянность', 'Беспомощность']

const ACT_PHRASES = [
  'Я замечаю, что у меня есть эта эмоция — и это нормально.',
  'Эта эмоция — волна, она пройдёт.',
  'Я больше, чем эта ситуация.',
  'Мне не нужно ничего решать прямо сейчас.',
  'Я в безопасности, даже если так не ощущается.',
  'Я даю себе время и сострадание.',
]

const GROUNDING_STEPS = [
  { icon: '🌬', title: 'Дыхание', desc: 'Вдох 4 сек → задержка 4 сек → выдох 6 сек. Три раза.' },
  { icon: '👣', title: 'Заземление тела', desc: 'Ступни на полу. 5 вещей вижу, 4 слышу, 3 ощущаю.' },
  { icon: '💧', title: 'Холодная вода', desc: 'Умыть руки или лицо — активирует блуждающий нерв.' },
]

const DEFAULT_PENDULUMS = [
  { text: 'Саша', triggers: 'Тишина, нет сообщения, воспоминания', typical_thoughts: 'Может, он напишет. Что он делает?', what_feeds: 'Ожидание, проверки, фантазии', exit_strategy: 'Вернуть внимание в тело', counter_slide: 'Я живу свою полную собственную жизнь.', dismissed: false },
  { text: 'Работа', triggers: 'Ошибки, критика, дедлайны, сравнения', typical_thoughts: 'Я всё потеряю. Я недостаточно хороша.', what_feeds: 'Страх провала', exit_strategy: 'Один конкретный маленький шаг, не героизм', counter_slide: 'Сегодня я делаю один шаг. Этого достаточно.', dismissed: false },
  { text: 'Одиночество', triggers: 'Выходные одна, соцсети, сравнения', typical_thoughts: 'Никого не будет. У всех есть кто-то.', what_feeds: 'Драма «я никому не нужна»', exit_strategy: 'Контакт с живым миром', counter_slide: 'Я достойна своего собственного общества.', dismissed: false },
  { text: 'Возраст', triggers: 'День рождения, фото, сравнения с молодыми', typical_thoughts: 'Слишком поздно. Я упустила лучшее время.', what_feeds: 'Мысль «уже поздно»', exit_strategy: 'Действие «я всё ещё могу»', counter_slide: 'Я именно такая, какой нужно быть сейчас.', dismissed: false },
  { text: 'Здоровье', triggers: 'Боли, новости о болезнях, визиты к врачу', typical_thoughts: 'Что если это что-то серьёзное?', what_feeds: 'Страх и катастрофизация', exit_strategy: 'Мягкая дисциплина, один шаг', counter_slide: 'Я с любовью забочусь о своём теле.', dismissed: false },
  { text: 'Деньги', triggers: 'Счета, расходы, сравнения', typical_thoughts: 'Не хватит. Я никогда не выберусь.', what_feeds: 'Мышление дефицита', exit_strategy: 'Одно конкретное маленькое финансовое действие', counter_slide: 'Я управляю деньгами спокойно и ясно.', dismissed: false },
  { text: 'Страх будущего', triggers: 'Неопределённость, новости, большие решения', typical_thoughts: 'Что будет? Я не знаю.', what_feeds: 'Потребность контролировать неконтролируемое', exit_strategy: 'Вернуться в настоящий момент', counter_slide: 'Я доверяю своему пути, шаг за шагом.', dismissed: false },
]

// ── Режим «Меня накрыло» ──────────────────────────────────────────────────────

function CrisisFlow({ onSaved }: { onSaved: () => void }) {
  const [step, setStep] = useState(0)
  const [what, setWhat] = useState('')
  const [emotion, setEmotion] = useState('')
  const [emotionCustom, setEmotionCustom] = useState('')
  const [bodyWhere, setBodyWhere] = useState('')
  const [intensity, setIntensity] = useState(5)
  const [impulse, setImpulse] = useState<boolean | null>(null)
  const [actPhrase, setActPhrase] = useState(ACT_PHRASES[0])
  const [smallAction, setSmallAction] = useState('')
  const [saving, setSaving] = useState(false)

  const finalEmotion = emotion === 'Другое' ? emotionCustom : emotion

  async function save() {
    setSaving(true)
    await psychApi.createSession('crisis', `${finalEmotion} — интенсивность ${intensity}`, {
      what, emotion: finalEmotion, body_where: bodyWhere, intensity, impulse,
      act_phrase: actPhrase, small_action: smallAction,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div>
      <StepDots total={4} current={step} />

      {step === 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Шаг 1 / 4 — Что случилось?</p>
          <label className="block text-sm font-medium mb-2">Опиши кратко ситуацию</label>
          <textarea
            className="w-full bg-[var(--color-bg)] border border-[var(--color-muted)] rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-[var(--color-primary)]"
            rows={4} value={what} onChange={(e) => setWhat(e.target.value)}
            placeholder="Что произошло? Как ты себя чувствуешь?"
            autoFocus
          />
          <div className="flex justify-end mt-4">
            <Btn onClick={() => setStep(1)} disabled={!what.trim()}>Далее →</Btn>
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Шаг 2 / 4 — Эмоция и тело</p>
          <label className="block text-sm font-medium mb-2">Какая эмоция?</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {[...EMOTIONS, 'Другое'].map((e) => (
              <button key={e} onClick={() => setEmotion(e)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  emotion === e ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-muted)] hover:border-[var(--color-primary)]'
                }`}>{e}</button>
            ))}
          </div>
          {emotion === 'Другое' && (
            <input className="w-full bg-[var(--color-bg)] border border-[var(--color-muted)] rounded-xl p-3 text-sm mb-4 focus:outline-none focus:border-[var(--color-primary)]"
              placeholder="Твоя эмоция..." value={emotionCustom} onChange={(e) => setEmotionCustom(e.target.value)} />
          )}
          <label className="block text-sm font-medium mb-2">Где в теле ощущаешь?</label>
          <input className="w-full bg-[var(--color-bg)] border border-[var(--color-muted)] rounded-xl p-3 text-sm mb-4 focus:outline-none focus:border-[var(--color-primary)]"
            placeholder="Грудь, горло, живот..." value={bodyWhere} onChange={(e) => setBodyWhere(e.target.value)} />
          <label className="block text-sm font-medium mb-1">Насколько сильно: <span className="text-[var(--color-primary)] text-lg font-bold">{intensity}</span></label>
          <input type="range" min={1} max={10} value={intensity} onChange={(e) => setIntensity(+e.target.value)}
            className="w-full accent-[var(--color-primary)] mb-4" />
          <label className="block text-sm font-medium mb-2">Есть ли импульс написать / проверить / уйти в фантазии?</label>
          <div className="flex gap-3">
            <button onClick={() => setImpulse(true)}
              className={`flex-1 py-2 rounded-xl border text-sm transition-colors ${impulse === true ? 'bg-[var(--color-primary)] text-white' : 'border-[var(--color-muted)]'}`}>
              Да
            </button>
            <button onClick={() => setImpulse(false)}
              className={`flex-1 py-2 rounded-xl border text-sm transition-colors ${impulse === false ? 'bg-[var(--color-primary)] text-white' : 'border-[var(--color-muted)]'}`}>
              Нет
            </button>
          </div>
          <div className="flex justify-between mt-4">
            <Btn variant="ghost" onClick={() => setStep(0)}>← Назад</Btn>
            <Btn onClick={() => setStep(2)} disabled={!emotion.trim()}>Далее →</Btn>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Шаг 3 / 4 — Заземление</p>
          <div className="space-y-3 mb-5">
            {GROUNDING_STEPS.map((g) => (
              <div key={g.title} className="flex gap-3 p-3 bg-[var(--color-bg)] rounded-xl border border-[var(--color-muted)]">
                <span className="text-2xl">{g.icon}</span>
                <div>
                  <p className="text-sm font-medium">{g.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <label className="block text-sm font-medium mb-2">Выбери АКТ-фразу</label>
          <div className="space-y-2 mb-4">
            {ACT_PHRASES.map((p) => (
              <button key={p} onClick={() => setActPhrase(p)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                  actPhrase === p ? 'bg-violet-50 border-violet-300 text-violet-800' : 'border-[var(--color-muted)] hover:border-violet-300'
                }`}>{p}</button>
            ))}
          </div>
          <label className="block text-sm font-medium mb-2">Маленькое действие: что ты можешь сделать сейчас?</label>
          <input className="w-full bg-[var(--color-bg)] border border-[var(--color-muted)] rounded-xl p-3 text-sm focus:outline-none focus:border-[var(--color-primary)]"
            placeholder="Прогулка, выпить чай, поесть..." value={smallAction} onChange={(e) => setSmallAction(e.target.value)} />
          <div className="flex justify-between mt-4">
            <Btn variant="ghost" onClick={() => setStep(1)}>← Назад</Btn>
            <Btn onClick={() => setStep(3)}>Далее →</Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Шаг 4 / 4 — Итог</p>
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-4 space-y-2 text-sm">
            <p><span className="font-medium">Эмоция:</span> {finalEmotion}, интенсивность {intensity}/10</p>
            {bodyWhere && <p><span className="font-medium">В теле:</span> {bodyWhere}</p>}
            <p className="italic text-violet-800">«{actPhrase}»</p>
            {smallAction && <p><span className="font-medium">Следующий шаг:</span> {smallAction}</p>}
          </div>
          <div className="flex justify-between mt-4">
            <Btn variant="ghost" onClick={() => setStep(2)}>← Назад</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Сохраняю...' : 'Сохранить ✓'}</Btn>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Снижение важности ─────────────────────────────────────────────────────────

function ImportanceFlow({ onSaved }: { onSaved: () => void }) {
  const [object, setObject] = useState('')
  const [howInflate, setHowInflate] = useState('')
  const [fearLose, setFearLose] = useState('')
  const [alreadyHave, setAlreadyHave] = useState('')
  const [smallStep, setSmallStep] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await psychApi.createSession('importance', `Важность: ${object.slice(0, 40)}`, {
      object, how_inflate: howInflate, fear_lose: fearLose, already_have: alreadyHave, small_step: smallStep,
    })
    setSaving(false)
    onSaved()
  }

  const fields = [
    { label: 'Объект важности', hint: 'Что или кто получил слишком большой вес?', val: object, set: setObject },
    { label: 'Чем я его раздуваю?', hint: 'Мысли, поведение, ритуалы...', val: howInflate, set: setHowInflate },
    { label: 'Что я боюсь потерять?', hint: 'Какой настоящий страх стоит за этим?', val: fearLose, set: setFearLose },
    { label: 'Что уже есть у меня без этого?', hint: 'Собственные качества, ресурсы, красивые моменты...', val: alreadyHave, set: setAlreadyHave },
    { label: 'Какой маленький шаг возвращает меня к себе', hint: 'Одно конкретное маленькое действие прямо сейчас', val: smallStep, set: setSmallStep },
  ]

  return (
    <div>
      <div className="space-y-4 mb-5">
        {fields.map((f, i) => (
          <div key={i}>
            <label className="block text-sm font-medium mb-1">{f.label}</label>
            <textarea
              className="w-full bg-[var(--color-bg)] border border-[var(--color-muted)] rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-[var(--color-primary)]"
              rows={2} placeholder={f.hint} value={f.val} onChange={(e) => f.set(e.target.value)}
            />
          </div>
        ))}
      </div>
      <Btn onClick={save} disabled={saving || !object.trim()} className="w-full">
        {saving ? 'Сохраняю...' : 'Сохранить ✓'}
      </Btn>
    </div>
  )
}

// ── Вкладка «Сейчас» ──────────────────────────────────────────────────────────

function JetztTab({ onSessionSaved }: { onSessionSaved: () => void }) {
  const [mode, setMode] = useState<'menu' | 'crisis' | 'importance'>('menu')

  function handleSaved() {
    onSessionSaved()
    setMode('menu')
  }

  if (mode === 'crisis') {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Меня накрыло</SectionTitle>
          <Btn variant="ghost" onClick={() => setMode('menu')}>✕</Btn>
        </div>
        <CrisisFlow onSaved={handleSaved} />
      </Card>
    )
  }

  if (mode === 'importance') {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Снижение важности</SectionTitle>
          <Btn variant="ghost" onClick={() => setMode('menu')}>✕</Btn>
        </div>
        <ImportanceFlow onSaved={handleSaved} />
      </Card>
    )
  }

  return (
    <>
      <div className="text-center mb-6">
        <p className="text-[var(--color-text-muted)] text-sm">Что тебе нужно прямо сейчас?</p>
      </div>

      <button onClick={() => setMode('crisis')}
        className="w-full mb-4 p-5 bg-rose-50 border-2 border-rose-200 rounded-2xl text-left hover:border-rose-400 transition-colors group">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🌊</span>
          <span className="text-xl font-semibold text-rose-800" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Меня накрыло
          </span>
        </div>
        <p className="text-sm text-rose-700">Для острых состояний — назвать эмоцию, заземлить тело, выбрать АКТ-фразу, сделать маленький шаг.</p>
      </button>

      <button onClick={() => setMode('importance')}
        className="w-full p-5 bg-amber-50 border-2 border-amber-200 rounded-2xl text-left hover:border-amber-400 transition-colors group">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">⚖️</span>
          <span className="text-xl font-semibold text-amber-800" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Снижение важности
          </span>
        </div>
        <p className="text-sm text-amber-700">Когда что-то или кто-то получает слишком много веса — метод трансёрфинга для снижения важности.</p>
      </button>
    </>
  )
}

// ── Вкладка «Маятники» ────────────────────────────────────────────────────────

function PendulumsTab() {
  const [items, setItems] = useState<PsychItem[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [editData, setEditData] = useState<Record<string, string>>({})
  const [newText, setNewText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const rows = await psychApi.getItems('pendulum')
    if (rows.length === 0) await seedDefaults()
    else { setItems(rows); setLoading(false) }
  }

  async function seedDefaults() {
    const created: PsychItem[] = []
    for (const p of DEFAULT_PENDULUMS) {
      const item = await psychApi.createItem('pendulum', p)
      created.push(item)
    }
    setItems(created)
    setLoading(false)
  }

  async function reseedDefaults() {
    setLoading(true)
    const created: PsychItem[] = []
    for (const p of DEFAULT_PENDULUMS) {
      const item = await psychApi.createItem('pendulum', p)
      created.push(item)
    }
    setItems((prev) => [...created, ...prev])
    setLoading(false)
  }

  async function toggleDismissed(item: PsychItem) {
    const updated = await psychApi.updateItem(item.id, { data: { ...item.data, dismissed: !item.data.dismissed } })
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
  }

  async function saveEdit(id: number) {
    const updated = await psychApi.updateItem(id, { data: editData as Record<string, unknown> })
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)))
    setEditing(null)
  }

  async function addPendulum() {
    if (!newText.trim()) return
    const item = await psychApi.createItem('pendulum', {
      text: newText.trim(), triggers: '', typical_thoughts: '', what_feeds: '', exit_strategy: '', counter_slide: '', dismissed: false,
    })
    setItems((prev) => [item, ...prev])
    setNewText('')
  }

  async function deleteItem(id: number) {
    await psychApi.deleteItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  if (loading) return <p className="text-center text-[var(--color-text-muted)] py-8">Загружается...</p>

  const FIELDS = [
    { key: 'triggers',         label: 'Триггеры',       rows: 5, icon: '⚡', bg: 'bg-rose-50',    border: 'border-rose-300',    labelCls: 'text-rose-600' },
    { key: 'typical_thoughts', label: 'Типичные мысли', rows: 6, icon: '💭', bg: 'bg-amber-50',   border: 'border-amber-300',   labelCls: 'text-amber-700' },
    { key: 'what_feeds',       label: 'Чем кормится',   rows: 4, icon: '🔥', bg: 'bg-orange-50',  border: 'border-orange-300',  labelCls: 'text-orange-700' },
    { key: 'exit_strategy',    label: 'Как выйти',      rows: 3, icon: '🌿', bg: 'bg-emerald-50', border: 'border-emerald-300', labelCls: 'text-emerald-700' },
    { key: 'counter_slide',    label: 'Контр-слайд',    rows: 3, icon: '✨', bg: 'bg-violet-50',  border: 'border-violet-300',  labelCls: 'text-violet-700' },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[var(--color-text-muted)]">
          Нажми на маятник чтобы раскрыть. «Отпустить» — отключить питание.
        </p>
        <button onClick={reseedDefaults}
          className="flex-shrink-0 ml-3 px-3 py-1.5 text-xs border border-[var(--color-muted)] rounded-full hover:border-[var(--color-primary)] transition-colors whitespace-nowrap">
          🔄 Примеры
        </button>
      </div>
      {items.map((item) => {
        const d = item.data as Record<string, string>
        const isExpanded = expanded === item.id
        const isEditing = editing === item.id
        return (
          <Card key={item.id} className={d.dismissed ? 'opacity-50' : ''}>
            <div className="flex items-start justify-between gap-2 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : item.id)}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🎭</span>
                <span className={`font-medium ${d.dismissed ? 'line-through' : ''}`}>{d.text}</span>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">{isExpanded ? '▲' : '▼'}</span>
            </div>

            {isExpanded && !isEditing && (
              <div className="mt-4 space-y-2">
                {FIELDS.map(({ key, label, icon, bg, border, labelCls }) => d[key] ? (
                  <div key={key} className={`rounded-xl border-l-4 ${border} ${bg} px-4 py-3`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 ${labelCls}`}>
                      <span>{icon}</span>{label}
                    </p>
                    <p className={`text-sm whitespace-pre-wrap leading-relaxed ${key === 'counter_slide' ? 'italic font-medium' : ''}`}>
                      {key === 'counter_slide' ? `«${d[key]}»` : d[key]}
                    </p>
                  </div>
                ) : null)}
                <div className="flex gap-2 pt-2 flex-wrap">
                  <Btn variant="ghost" className="text-xs" onClick={() => { setEditing(item.id); setEditData(d) }}>✏️ Изменить</Btn>
                  <Btn variant={d.dismissed ? 'secondary' : 'ghost'} className="text-xs" onClick={() => toggleDismissed(item)}>
                    {d.dismissed ? '🔄 Активировать' : '🕊 Отпустить'}
                  </Btn>
                  <Btn variant="danger" className="text-xs ml-auto" onClick={() => deleteItem(item.id)}>✕</Btn>
                </div>
              </div>
            )}

            {isEditing && (
              <div className="mt-3 space-y-3">
                {[{ key: 'text', label: 'Название', rows: 2 }, ...FIELDS].map(({ key, label, rows }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium mb-1">{label}</label>
                    <textarea
                      className="w-full bg-[var(--color-bg)] border border-[var(--color-muted)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] resize-y"
                      rows={rows}
                      value={editData[key] || ''}
                      onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="flex gap-2">
                  <Btn onClick={() => saveEdit(item.id)}>Сохранить</Btn>
                  <Btn variant="ghost" onClick={() => setEditing(null)}>Отмена</Btn>
                </div>
              </div>
            )}
          </Card>
        )
      })}

      <Card>
        <SectionTitle>Добавить маятник</SectionTitle>
        <div className="flex gap-2 mt-3">
          <input className="flex-1 bg-[var(--color-bg)] border border-[var(--color-muted)] rounded-xl p-3 text-sm focus:outline-none focus:border-[var(--color-primary)]"
            placeholder="Название маятника..." value={newText} onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPendulum()} />
          <Btn onClick={addPendulum} disabled={!newText.trim()}>+</Btn>
        </div>
      </Card>
    </>
  )
}

// ── Вкладка «Будущая Я» ───────────────────────────────────────────────────────

interface FutureData {
  letter_1yr: string
  image_3yr: string
  values: string[]
  decisions: string[]
  support_phrases: string[]
  progress_evidence: string[]
}

function FutureSelfTab() {
  const [item, setItem] = useState<PsychItem | null>(null)
  const [data, setData] = useState<FutureData>({
    letter_1yr: '', image_3yr: '', values: [], decisions: [], support_phrases: [], progress_evidence: [],
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newInputs, setNewInputs] = useState({ value: '', decision: '', phrase: '', evidence: '' })
  const [editingItem, setEditingItem] = useState<{ key: keyof FutureData; idx: number; val: string } | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemRef = useRef<PsychItem | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const rows = await psychApi.getItems('future_self')
    if (rows.length > 0) {
      setItem(rows[0])
      itemRef.current = rows[0]
      setData(rows[0].data as unknown as FutureData)
    }
  }

  async function autosave(newData: FutureData) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      const current = itemRef.current
      if (current) {
        await psychApi.updateItem(current.id, { data: newData as unknown as Record<string, unknown> })
      } else {
        const created = await psychApi.createItem('future_self', newData as unknown as Record<string, unknown>)
        setItem(created)
        itemRef.current = created
      }
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 800)
  }

  function update(patch: Partial<FutureData>) {
    const next = { ...data, ...patch }
    setData(next)
    autosave(next)
  }

  function addToList(key: keyof FutureData, val: string, inputKey: keyof typeof newInputs) {
    if (!val.trim()) return
    update({ [key]: [...(data[key] as string[]), val.trim()] } as Partial<FutureData>)
    setNewInputs({ ...newInputs, [inputKey]: '' })
  }

  function removeFromList(key: keyof FutureData, idx: number) {
    update({ [key]: (data[key] as string[]).filter((_, i) => i !== idx) } as Partial<FutureData>)
  }

  function startEdit(key: keyof FutureData, idx: number, val: string) {
    setEditingItem({ key, idx, val })
  }

  function saveItemEdit() {
    if (!editingItem || !editingItem.val.trim()) { setEditingItem(null); return }
    const list = [...(data[editingItem.key] as string[])]
    list[editingItem.idx] = editingItem.val.trim()
    update({ [editingItem.key]: list } as Partial<FutureData>)
    setEditingItem(null)
  }

  const listSections = [
    { title: 'Мои ценности', key: 'values' as const, inputKey: 'value' as const, placeholder: 'Свобода, честность, рост...' },
    { title: 'Мои решения', key: 'decisions' as const, inputKey: 'decision' as const, placeholder: 'Я больше не проверяю его.' },
    { title: 'Фразы поддержки', key: 'support_phrases' as const, inputKey: 'phrase' as const, placeholder: 'Я достаточна.' },
    { title: 'Доказательства прогресса', key: 'progress_evidence' as const, inputKey: 'evidence' as const, placeholder: 'Я съездила во Фройденберг — мне было красиво.' },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[var(--color-text-muted)]">Сохраняется автоматически</p>
        {saving && <span className="text-xs text-[var(--color-text-muted)]">Сохраняю...</span>}
        {saved && <span className="text-xs text-green-600">✓ Сохранено</span>}
      </div>

      <CollapsibleCard
        title="Письмо от меня через год"
        subtitle="Пиши себе сегодняшней — от лица себя через год."
      >
        <textarea
          className="w-full bg-[var(--color-bg)] border border-[var(--color-muted)] rounded-xl p-3 text-sm resize-y focus:outline-none focus:border-[var(--color-primary)]"
          rows={12} placeholder="Дорогая Ирина, я пишу тебе из июня 2027..."
          value={data.letter_1yr} onChange={(e) => update({ letter_1yr: e.target.value })}
        />
      </CollapsibleCard>

      <CollapsibleCard
        title="Образ себя через 3 года"
        subtitle="Как ты живёшь? Как себя чувствуешь? Что изменилось? Писать в настоящем времени."
      >
        <textarea
          className="w-full bg-[var(--color-bg)] border border-[var(--color-muted)] rounded-xl p-3 text-sm resize-y focus:outline-none focus:border-[var(--color-primary)]"
          rows={12} placeholder="Я живу в уютной квартире, я чувствую..."
          value={data.image_3yr} onChange={(e) => update({ image_3yr: e.target.value })}
        />
      </CollapsibleCard>

      {listSections.map(({ title, key, inputKey, placeholder }) => (
        <CollapsibleCard key={key} title={title}>
          <ul className="space-y-0 mb-3">
            {(data[key] as string[]).map((val, i) => {
              const isEditing = editingItem?.key === key && editingItem.idx === i
              return (
                <li key={i} className="border-b border-[var(--color-muted)] last:border-0">
                  {isEditing ? (
                    <div className="flex items-center gap-2 py-1.5">
                      <input
                        autoFocus
                        value={editingItem.val}
                        onChange={(e) => setEditingItem({ ...editingItem, val: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveItemEdit()
                          if (e.key === 'Escape') setEditingItem(null)
                        }}
                        className="flex-1 bg-[var(--color-bg)] border border-[var(--color-primary)] rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      />
                      <button onClick={saveItemEdit} className="text-[var(--color-primary)] text-sm font-medium px-1 flex-shrink-0">✓</button>
                      <button onClick={() => setEditingItem(null)} className="text-[var(--color-text-muted)] text-xs px-1 flex-shrink-0">✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 py-2 group">
                      <span
                        className="text-sm flex-1 cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                        onClick={() => startEdit(key, i, val)}
                        title="Klicken zum Bearbeiten"
                      >
                        {val}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(key, i, val)} className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] text-xs px-1">✏️</button>
                        <button onClick={() => removeFromList(key, i)} className="text-[var(--color-text-muted)] hover:text-red-500 text-xs px-1">✕</button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-[var(--color-bg)] border border-[var(--color-muted)] rounded-xl p-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
              placeholder={placeholder}
              value={newInputs[inputKey]}
              onChange={(e) => setNewInputs({ ...newInputs, [inputKey]: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addToList(key, newInputs[inputKey], inputKey)}
            />
            <Btn onClick={() => addToList(key, newInputs[inputKey], inputKey)}>+</Btn>
          </div>
        </CollapsibleCard>
      ))}
    </>
  )
}

// ── Трансёрфинг ───────────────────────────────────────────────────────────────

const RITUAL_STEPS = [
  { title: 'Состояние дня', hint: 'Три глубоких вдоха. «Я наблюдаю мир спокойно. Я выбираю свою линию жизни.»', duration: '2 мин' },
  { title: 'Снижение важности', hint: 'Главная задача дня. «Мне это важно — но не критично. В любом случае всё будет хорошо.»', duration: '2 мин' },
  { title: 'Слайд дня', hint: 'Закрыть глаза. Увидеть себя в конце дня в желаемом состоянии. Не мечтать — вспоминать.', duration: '3 мин' },
  { title: 'Намерение дня', hint: 'Одна фраза в настоящем времени. «Сегодня я действую из спокойной уверенности.»', duration: '1 мин' },
  { title: 'Проверка маятников', hint: 'Что уже с утра тянет энергию? «Я не участвую в этой игре.»', duration: '2 мин' },
]

const AFFIRMATIONS = [
  'Я скольжу по пространству вариантов спокойно и уверенно.',
  'Мне это важно — но не критично. Я справлюсь в любом случае.',
  'Я выбираю свою линию жизни осознанно.',
  'Я наблюдатель, а не участник чужих маятников.',
  'Желаемое уже существует — я двигаюсь к нему.',
  'Лёгкость — это мой сигнал правильного направления.',
  'Я снижаю важность и открываю пространство для действия.',
  'Сегодня я действую из состояния уверенности и покоя.',
]

const SCALE_TEXTS: Record<number, string> = {
  1: 'Полный штиль — никакого напряжения', 2: 'Лёгкий интерес, без давления',
  3: 'Умеренно интересно — пространство открыто', 4: 'Чуть вовлечённо, без напряжения',
  5: 'Умеренная важность — есть простор для манёвра', 6: 'Начинается напряжение — стоит снизить',
  7: 'Высокая важность — создаёт сопротивление', 8: 'Очень высокая — вероятно блокирует ситуацию',
  9: 'Критично — сильное давление', 10: 'Экстремальная важность — нужно срочно снижать',
}

function TranssurfingTab() {
  const [ritualDone, setRitualDone] = useState<boolean[]>(new Array(RITUAL_STEPS.length).fill(false))
  const [affIdx, setAffIdx] = useState<number>(
    () => parseInt(localStorage.getItem('iris_affirmation_idx') || '0', 10)
  )
  const [customAffirmation, setCustomAffirmation] = useState<string | null>(
    () => localStorage.getItem('iris_affirmation')
  )
  const [aiAffirmations, setAiAffirmations] = useState<string[]>([])
  const [affGenLoading, setAffGenLoading] = useState(false)
  const [slides, setSlides] = useState<PsychItem[]>([])
  const [sitStep, setSitStep] = useState(0)
  const [sitData, setSitData] = useState({ situation: '', importance: 5, what_remains: '', slide: '' })
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiIntention, setAiIntention] = useState('')
  const [newSlide, setNewSlide] = useState({ name: '', body: '' })
  const [showSlideForm, setShowSlideForm] = useState(false)

  const [savedAffirmations, setSavedAffirmations] = useState<PsychItem[]>([])
  const [showSaved, setShowSaved] = useState(false)

  const displayAffirmation = customAffirmation ?? AFFIRMATIONS[affIdx]
  const isSaved = savedAffirmations.some((s) => (s.data as Record<string, string>).text === displayAffirmation)

  async function generateAffirmations() {
    setAffGenLoading(true)
    setAiAffirmations([])
    try {
      const result = await psychApi.generateAffirmations()
      setAiAffirmations(result.affirmations)
    } finally {
      setAffGenLoading(false)
    }
  }

  function selectAffirmation(a: string) {
    setCustomAffirmation(a)
    localStorage.setItem('iris_affirmation', a)
    setAiAffirmations([])
  }

  function nextBuiltIn() {
    setCustomAffirmation(null)
    localStorage.removeItem('iris_affirmation')
    setAiAffirmations([])
    setAffIdx((prev) => {
      const next = (prev + 1) % AFFIRMATIONS.length
      localStorage.setItem('iris_affirmation_idx', String(next))
      return next
    })
  }

  async function toggleSave(text: string) {
    const existing = savedAffirmations.find((s) => (s.data as Record<string, string>).text === text)
    if (existing) {
      await psychApi.deleteItem(existing.id)
      setSavedAffirmations((prev) => prev.filter((s) => s.id !== existing.id))
    } else {
      const item = await psychApi.createItem('affirmation', { text })
      setSavedAffirmations((prev) => [item, ...prev])
    }
  }

  async function deleteSaved(id: number) {
    await psychApi.deleteItem(id)
    setSavedAffirmations((prev) => prev.filter((s) => s.id !== id))
  }

  useEffect(() => { loadSlides(); loadSavedAffirmations() }, [])

  async function loadSlides() {
    const rows = await psychApi.getItems('slide')
    setSlides(rows)
  }

  async function loadSavedAffirmations() {
    const rows = await psychApi.getItems('affirmation')
    setSavedAffirmations(rows)
  }

  async function addSlide() {
    if (!newSlide.name.trim() || !newSlide.body.trim()) return
    const item = await psychApi.createItem('slide', newSlide)
    setSlides((prev) => [item, ...prev])
    setNewSlide({ name: '', body: '' })
    setShowSlideForm(false)
  }

  async function deleteSlide(id: number) {
    await psychApi.deleteItem(id)
    setSlides((prev) => prev.filter((s) => s.id !== id))
  }

  async function analyze() {
    if (!sitData.situation.trim()) return
    setAiLoading(true)
    setAiText('')
    const result = await psychApi.analyze(sitData.situation, sitData.importance, sitData.what_remains)
    setAiText(result.text)
    const match = result.text.match(/НАМЕРЕНИЕ:\s*(.+)/s)
    if (match) setAiIntention(match[1].trim().split('\n')[0])
    setAiLoading(false)
    setSitStep(3)
  }

  async function saveSituation() {
    await psychApi.createSession('transurfing', sitData.situation.slice(0, 60), {
      ...sitData, ai_analysis: aiText,
    })
    setSitStep(0)
    setSitData({ situation: '', importance: 5, what_remains: '', slide: '' })
    setAiText('')
    setAiIntention('')
    loadSlides()
  }

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Аффирмация</SectionTitle>
          <button
            onClick={generateAffirmations}
            disabled={affGenLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-violet-300 text-violet-600 rounded-full hover:bg-violet-50 transition-colors disabled:opacity-40"
          >
            {affGenLoading ? <span className="animate-pulse">✦ Генерирую...</span> : '✦ Claude'}
          </button>
        </div>

        <div className="flex gap-2 items-stretch">
          <button onClick={nextBuiltIn}
            className="flex-1 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center italic text-amber-900 hover:border-amber-400 transition-colors"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem' }}>
            {displayAffirmation}
          </button>
          <button
            onClick={() => toggleSave(displayAffirmation)}
            title={isSaved ? 'Удалить из избранного' : 'Сохранить'}
            className={`flex-shrink-0 w-11 rounded-xl border transition-colors flex items-center justify-center text-lg ${
              isSaved
                ? 'bg-rose-50 border-rose-300 text-rose-500 hover:bg-rose-100'
                : 'bg-[var(--color-bg)] border-[var(--color-muted)] text-[var(--color-text-muted)] hover:border-rose-300 hover:text-rose-400'
            }`}
          >
            {isSaved ? '♥' : '♡'}
          </button>
        </div>
        <p className="text-xs text-center text-[var(--color-text-muted)] mt-2">
          {customAffirmation ? '✓ выбрано — нажми текст чтобы вернуться к списку' : '→ нажми текст для следующей'}
        </p>

        {aiAffirmations.length > 0 && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-widest text-violet-500 font-semibold mb-2">Выбери аффирмацию</p>
            <div className="space-y-2">
              {aiAffirmations.map((a, i) => {
                const alreadySaved = savedAffirmations.some((s) => (s.data as Record<string, string>).text === a)
                return (
                  <div key={i} className="flex gap-2 items-stretch">
                    <button
                      onClick={() => selectAffirmation(a)}
                      className="flex-1 text-left p-3 bg-violet-50 border border-violet-200 rounded-xl text-sm italic text-violet-900 hover:bg-violet-100 hover:border-violet-400 transition-colors"
                      style={{ fontFamily: 'Cormorant Garamond, serif' }}
                    >
                      {a}
                    </button>
                    <button
                      onClick={() => toggleSave(a)}
                      className={`flex-shrink-0 w-10 rounded-xl border transition-colors flex items-center justify-center text-base ${
                        alreadySaved
                          ? 'bg-rose-50 border-rose-300 text-rose-500'
                          : 'bg-[var(--color-bg)] border-[var(--color-muted)] text-[var(--color-text-muted)] hover:border-rose-300 hover:text-rose-400'
                      }`}
                    >
                      {alreadySaved ? '♥' : '♡'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {savedAffirmations.length > 0 && (
          <div className="mt-5 border-t border-[var(--color-muted)] pt-4">
            <button
              onClick={() => setShowSaved((v) => !v)}
              className="flex items-center gap-2 w-full text-left mb-3"
            >
              <p className="text-xs uppercase tracking-widest text-rose-400 font-semibold">♥ Избранные ({savedAffirmations.length})</p>
              <span className="text-xs text-rose-300 ml-auto">{showSaved ? '▲' : '▼'}</span>
            </button>
            {showSaved && <div className="space-y-2">
              {savedAffirmations.map((item) => {
                const text = (item.data as Record<string, string>).text
                const isActive = displayAffirmation === text
                return (
                  <div key={item.id} className={`flex gap-2 items-center p-3 rounded-xl border transition-colors ${
                    isActive ? 'bg-amber-50 border-amber-300' : 'bg-[var(--color-bg)] border-[var(--color-muted)]'
                  }`}>
                    <button
                      onClick={() => selectAffirmation(text)}
                      className="flex-1 text-left text-sm italic"
                      style={{ fontFamily: 'Cormorant Garamond, serif' }}
                    >
                      {text}
                    </button>
                    <button onClick={() => deleteSaved(item.id)}
                      className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-red-400 text-xs px-1">✕</button>
                  </div>
                )
              })}
            </div>}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Утренний ритуал</SectionTitle>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">12–15 минут. Нажми на каждый шаг, чтобы отметить выполнение.</p>
        {RITUAL_STEPS.map((s, i) => (
          <div key={i} onClick={() => setRitualDone((prev) => prev.map((v, j) => j === i ? !v : v))}
            className={`flex gap-3 py-3 border-b border-[var(--color-muted)] last:border-0 cursor-pointer transition-opacity ${ritualDone[i] ? 'opacity-40' : ''}`}>
            <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-bold transition-colors mt-0.5 ${
              ritualDone[i] ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-muted)]'
            }`}>{ritualDone[i] ? '✓' : ''}</div>
            <div className="flex-1">
              <p className="text-sm font-medium">{s.title}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.hint}</p>
            </div>
            <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0 pt-0.5">{s.duration}</span>
          </div>
        ))}
      </Card>

      <Card>
        <SectionTitle>Анализ ситуации</SectionTitle>
        <StepDots total={4} current={sitStep} />

        {sitStep === 0 && (
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Шаг 1 — Опиши ситуацию</p>
            <textarea className="w-full bg-[var(--color-bg)] border border-[var(--color-muted)] rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-[var(--color-primary)]"
              rows={4} placeholder="Что тебя занимает? Как это ощущается?"
              value={sitData.situation} onChange={(e) => setSitData({ ...sitData, situation: e.target.value })} />
            <div className="flex justify-end mt-3">
              <Btn onClick={() => setSitStep(1)} disabled={!sitData.situation.trim()}>Далее →</Btn>
            </div>
          </div>
        )}

        {sitStep === 1 && (
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Шаг 2 — Уровень важности</p>
            <p className="text-sm text-[var(--color-text-muted)] mb-3">Насколько важна эта ситуация прямо сейчас? Высокая важность создаёт сопротивление.</p>
            <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-2"><span>Спокойно</span><span>Критично</span></div>
            <input type="range" min={1} max={10} value={sitData.importance} className="w-full accent-[var(--color-primary)]"
              onChange={(e) => setSitData({ ...sitData, importance: +e.target.value })} />
            <p className="text-4xl text-center font-bold text-[var(--color-primary)] my-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{sitData.importance}</p>
            <p className="text-sm text-center text-[var(--color-text-muted)] mb-4">{SCALE_TEXTS[sitData.importance]}</p>
            <div className="flex justify-between">
              <Btn variant="ghost" onClick={() => setSitStep(0)}>← Назад</Btn>
              <Btn onClick={() => setSitStep(2)}>Далее →</Btn>
            </div>
          </div>
        )}

        {sitStep === 2 && (
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Шаг 3 — Снижение важности</p>
            <label className="block text-sm font-medium mb-2">Что останется, даже если всё пойдёт не так?</label>
            <textarea className="w-full bg-[var(--color-bg)] border border-[var(--color-muted)] rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-[var(--color-primary)]"
              rows={3} placeholder="Что остаётся неизменным — твоя ценность, твои близкие, твоя жизнь..."
              value={sitData.what_remains} onChange={(e) => setSitData({ ...sitData, what_remains: e.target.value })} />
            <div className="flex justify-between mt-3">
              <Btn variant="ghost" onClick={() => setSitStep(1)}>← Назад</Btn>
              <Btn onClick={analyze} disabled={aiLoading}>
                {aiLoading ? <span className="animate-pulse">Анализирую...</span> : '✦ Анализ Claude'}
              </Btn>
            </div>
            {aiLoading && <p className="text-xs text-center text-[var(--color-text-muted)] mt-3 animate-pulse">Claude думает...</p>}
          </div>
        )}

        {sitStep === 3 && (
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Шаг 4 — Создай слайд</p>
            {aiText && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-4 text-sm whitespace-pre-wrap text-[var(--color-text)]">
                <p className="text-xs text-violet-600 font-medium mb-2">✦ Анализ</p>
                {aiText}
              </div>
            )}
            {aiIntention && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-xs text-amber-600 font-medium mb-1">Намерение</p>
                <p className="text-sm italic text-amber-900">{aiIntention}</p>
              </div>
            )}
            <label className="block text-sm font-medium mb-2">Опиши слайд (образ из будущего)</label>
            <textarea className="w-full bg-[var(--color-bg)] border border-[var(--color-muted)] rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-[var(--color-primary)]"
              rows={3} placeholder="Я сижу... Я чувствую... Вокруг меня..."
              value={sitData.slide} onChange={(e) => setSitData({ ...sitData, slide: e.target.value })} />
            <div className="flex justify-between mt-3">
              <Btn variant="ghost" onClick={() => setSitStep(2)}>← Назад</Btn>
              <Btn onClick={saveSituation}>Сохранить ✓</Btn>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Библиотека слайдов</SectionTitle>
          <Btn variant="ghost" className="text-xs" onClick={() => setShowSlideForm((v) => !v)}>+ Новый</Btn>
        </div>
        {showSlideForm && (
          <div className="mb-4 p-3 bg-[var(--color-bg)] border border-[var(--color-muted)] rounded-xl space-y-2">
            <input className="w-full bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-lg p-2.5 text-sm focus:outline-none"
              placeholder="Название / цель" value={newSlide.name} onChange={(e) => setNewSlide({ ...newSlide, name: e.target.value })} />
            <textarea className="w-full bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-lg p-2.5 text-sm resize-none focus:outline-none"
              rows={3} placeholder="Образ в настоящем времени..." value={newSlide.body} onChange={(e) => setNewSlide({ ...newSlide, body: e.target.value })} />
            <div className="flex gap-2">
              <Btn onClick={addSlide} disabled={!newSlide.name.trim() || !newSlide.body.trim()}>Добавить</Btn>
              <Btn variant="ghost" onClick={() => setShowSlideForm(false)}>Отмена</Btn>
            </div>
          </div>
        )}
        {slides.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-4">Слайдов пока нет. Создай через анализ ситуации или вручную.</p>
        ) : (
          <div className="space-y-3">
            {slides.map((s) => {
              const d = s.data as Record<string, string>
              return (
                <div key={s.id} className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-amber-900">{d.name}</p>
                    <button onClick={() => deleteSlide(s.id)} className="text-[var(--color-text-muted)] hover:text-red-500 text-xs">✕</button>
                  </div>
                  <p className="text-sm italic text-amber-800 mt-1">{d.body}</p>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </>
  )
}

// ── История ───────────────────────────────────────────────────────────────────

const MODE_LABELS: Record<string, string> = {
  crisis:      '🌊 Меня накрыло',
  importance:  '⚖️ Важность',
  transurfing: '✦ Трансёрфинг',
}

const FIELD_LABELS: Record<string, string> = {
  what: 'Что случилось', emotion: 'Эмоция', body_where: 'В теле', intensity: 'Интенсивность',
  impulse: 'Импульс', act_phrase: 'АКТ-фраза', small_action: 'Маленькое действие',
  object: 'Объект важности', how_inflate: 'Чем раздуваю', fear_lose: 'Боюсь потерять',
  already_have: 'Уже есть без этого', small_step: 'Маленький шаг',
  situation: 'Ситуация', importance: 'Важность', what_remains: 'Что остаётся',
  ai_analysis: 'Анализ Claude', slide: 'Слайд',
}

const SKIP_KEYS = new Set(['dismissed', 'ai_analysis'])

function HistoryTab() {
  const [sessions, setSessions] = useState<PsychSession[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [editData, setEditData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const rows = await psychApi.getSessions()
    setSessions(rows)
    setLoading(false)
  }

  function startEdit(s: PsychSession) {
    const flat: Record<string, string> = {}
    for (const [k, v] of Object.entries(s.data)) {
      if (!SKIP_KEYS.has(k)) flat[k] = String(v ?? '')
    }
    setEditData(flat)
    setEditing(s.id)
  }

  async function saveEdit(s: PsychSession) {
    setSaving(true)
    const merged: Record<string, unknown> = { ...s.data }
    for (const [k, v] of Object.entries(editData)) merged[k] = v
    const updated = await psychApi.updateSession(s.id, s.mode, s.title, merged)
    setSessions((prev) => prev.map((x) => x.id === s.id ? updated : x))
    setEditing(null)
    setSaving(false)
  }

  async function deleteSession(id: number) {
    await psychApi.deleteSession(id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (expanded === id) setExpanded(null)
  }

  const filtered = filter === 'all' ? sessions : sessions.filter((s) => s.mode === filter)

  function renderView(data: Record<string, unknown>) {
    return Object.entries(data)
      .filter(([k, v]) => v !== null && v !== '' && v !== undefined && !SKIP_KEYS.has(k))
      .map(([key, val]) => (
        <div key={key} className="mb-3">
          <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">
            {FIELD_LABELS[key] || key.replace(/_/g, ' ')}
          </p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {typeof val === 'boolean' ? (val ? 'Да' : 'Нет') : String(val)}
          </p>
        </div>
      ))
  }

  function renderEdit(s: PsychSession) {
    const numericKeys = new Set(['intensity', 'importance'])
    const boolKeys = new Set(['impulse'])
    return (
      <div className="space-y-3">
        {Object.entries(editData).map(([key, val]) => {
          const label = FIELD_LABELS[key] || key.replace(/_/g, ' ')
          if (boolKeys.has(key)) {
            return (
              <div key={key}>
                <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">{label}</p>
                <div className="flex gap-2">
                  {['true', 'false'].map((v) => (
                    <button key={v} onClick={() => setEditData({ ...editData, [key]: v })}
                      className={`flex-1 py-2 rounded-xl border text-sm transition-colors ${
                        val === v ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-muted)]'
                      }`}>
                      {v === 'true' ? 'Да' : 'Нет'}
                    </button>
                  ))}
                </div>
              </div>
            )
          }
          if (numericKeys.has(key)) {
            return (
              <div key={key}>
                <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">
                  {label}: <span className="text-[var(--color-primary)] font-bold">{val}</span>
                </p>
                <input type="range" min={1} max={10} value={val}
                  onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                  className="w-full accent-[var(--color-primary)]" />
              </div>
            )
          }
          const isLong = val.length > 80 || key === 'what' || key === 'situation'
          return (
            <div key={key}>
              <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">{label}</p>
              {isLong ? (
                <textarea
                  rows={3}
                  value={val}
                  onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-muted)] rounded-xl p-2.5 text-sm resize-y focus:outline-none focus:border-[var(--color-primary)]"
                />
              ) : (
                <input
                  value={val}
                  onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-muted)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              )}
            </div>
          )
        })}
        <div className="flex gap-2 pt-1">
          <Btn onClick={() => saveEdit(s)} disabled={saving}>{saving ? 'Сохраняю...' : 'Сохранить ✓'}</Btn>
          <Btn variant="ghost" onClick={() => setEditing(null)}>Отмена</Btn>
        </div>
      </div>
    )
  }

  if (loading) return <p className="text-center text-[var(--color-text-muted)] py-8">Загружается...</p>

  return (
    <>
      <div className="flex gap-2 flex-wrap mb-4">
        {['all', 'crisis', 'importance', 'transurfing'].map((m) => (
          <button key={m} onClick={() => setFilter(m)}
            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
              filter === m ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-muted)]'
            }`}>
            {m === 'all' ? 'Все' : MODE_LABELS[m]}
          </button>
        ))}
        <button onClick={() => window.print()} className="ml-auto px-3 py-1.5 rounded-full text-xs border border-[var(--color-muted)] hover:border-[var(--color-primary)]">
          🖨 Распечатать
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-text-muted)]">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm">Сессий пока нет.</p>
        </div>
      ) : (
        filtered.map((s) => (
          <Card key={s.id}>
            <div className="flex items-start justify-between gap-2 cursor-pointer"
              onClick={() => { setExpanded(expanded === s.id ? null : s.id); setEditing(null) }}>
              <div>
                <span className="text-xs font-medium text-[var(--color-primary)]">{MODE_LABELS[s.mode] || s.mode}</span>
                {s.title && <p className="text-sm font-medium mt-0.5">{s.title}</p>}
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{formatDate(s.created_at)}</p>
              </div>
              <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">{expanded === s.id ? '▲' : '▼'}</span>
            </div>

            {expanded === s.id && (
              <div className="mt-3 pt-3 border-t border-[var(--color-muted)]">
                {editing === s.id ? renderEdit(s) : (
                  <>
                    {renderView(s.data)}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Btn variant="ghost" className="text-xs" onClick={() => startEdit(s)}>✏️ Изменить</Btn>
                      <Btn variant="danger" className="text-xs" onClick={() => deleteSession(s.id)}>Удалить</Btn>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        ))
      )}
    </>
  )
}

// ── Главная страница ──────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'jetzt',       label: 'Сейчас',       icon: '🌊' },
  { id: 'pendulums',   label: 'Маятники',     icon: '🎭' },
  { id: 'future',      label: 'Будущая Я',    icon: '🌸' },
  { id: 'transurfing', label: 'Трансёрфинг',  icon: '✦' },
  { id: 'history',     label: 'История',      icon: '📋' },
]

export default function PsychologyPage() {
  const [tab, setTab] = useState<Tab>('jetzt')
  const [historyKey, setHistoryKey] = useState(0)

  function handleSessionSaved() {
    setHistoryKey((k) => k + 1)
    setTimeout(() => setTab('history'), 1200)
  }

  return (
    <div className="max-w-2xl mx-auto pb-24 md:pb-8 px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-4xl text-[var(--color-primary)]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Внутренняя работа
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Психологические практики — трансёрфинг, АКТ, работа с собой</p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-none">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'jetzt'       && <JetztTab onSessionSaved={handleSessionSaved} />}
      {tab === 'pendulums'   && <PendulumsTab />}
      {tab === 'future'      && <FutureSelfTab />}
      {tab === 'transurfing' && <TranssurfingTab />}
      {tab === 'history'     && <HistoryTab key={historyKey} />}
    </div>
  )
}
