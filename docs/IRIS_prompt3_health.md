# Промпт 3 — IRIS: Модуль «Здоровье»

## Контекст

Scaffolding и модули «Мой день» + «Дом» уже реализованы (Промпты 1 и 2).
Теперь реализуй полный модуль **«Здоровье»** — самый важный для пользователя.

Пользователь отслеживает:
- Артериальное давление (утро / вечер)
- Вес (цель: снижение)
- Сон (часы + качество)
- Колено (боль + отёк + шаги — правое колено, восстановление после травмы)
- Настроение и энергия
- Лекарства (принято / не принято)

Главная ценность модуля — **умная аналитика**: не просто графики, а выводы.
Например: «В дни когда шагов > 7000 — колено отекает чаще».

---

## Backend

### Расширить таблицу `health_records`

Добавить недостающие поля (ALTER TABLE или обновить `create_tables()`):

```sql
ALTER TABLE health_records
  ADD COLUMN IF NOT EXISTS bp_morning_systolic INTEGER,
  ADD COLUMN IF NOT EXISTS bp_morning_diastolic INTEGER,
  ADD COLUMN IF NOT EXISTS bp_evening_systolic INTEGER,
  ADD COLUMN IF NOT EXISTS bp_evening_diastolic INTEGER,
  ADD COLUMN IF NOT EXISTS pulse_morning INTEGER,
  ADD COLUMN IF NOT EXISTS pulse_evening INTEGER,
  ADD COLUMN IF NOT EXISTS medication_taken BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS medication_notes TEXT;

-- Убрать старые общие поля bp_systolic, bp_diastolic, pulse если есть
```

Итоговая структура `health_records`:
```sql
CREATE TABLE IF NOT EXISTS health_records (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,  -- одна запись в день
    
    -- Вес
    weight_kg NUMERIC(5,2),
    weight_goal_kg NUMERIC(5,2) DEFAULT 75.0,
    
    -- Давление утро
    bp_morning_systolic INTEGER,
    bp_morning_diastolic INTEGER,
    pulse_morning INTEGER,
    
    -- Давление вечер
    bp_evening_systolic INTEGER,
    bp_evening_diastolic INTEGER,
    pulse_evening INTEGER,
    
    -- Лекарства
    medication_taken BOOLEAN DEFAULT FALSE,
    medication_notes TEXT,
    
    -- Сон
    sleep_hours NUMERIC(4,2),
    sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 10),
    sleep_notes TEXT,
    
    -- Колено
    knee_pain INTEGER CHECK (knee_pain BETWEEN 0 AND 10),
    knee_swelling VARCHAR(20) CHECK (knee_swelling IN ('none','mild','moderate','severe')),
    knee_exercises_done BOOLEAN DEFAULT FALSE,
    steps INTEGER,
    
    -- Самочувствие
    mood INTEGER CHECK (mood BETWEEN 1 AND 10),
    energy INTEGER CHECK (energy BETWEEN 1 AND 10),
    anxiety INTEGER CHECK (anxiety BETWEEN 0 AND 10),
    
    -- Свободные заметки
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Добавить таблицу целей:
```sql
CREATE TABLE IF NOT EXISTS health_goals (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,  -- 'weight', 'steps', 'sleep', 'bp'
    target_value NUMERIC,
    target_value2 NUMERIC,            -- для давления: диастолическое
    unit VARCHAR(20),
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO health_goals (key, target_value, unit) VALUES
    ('weight', 75.0, 'кг'),
    ('steps', 6000, 'шагов'),
    ('sleep', 7.5, 'часов'),
    ('bp_systolic', 120, 'мм рт.ст.')
ON CONFLICT (key) DO NOTHING;
```

---

### Pydantic схемы (`models/health.py`)

```python
class HealthRecordCreate(BaseModel):
    date: date
    weight_kg: Optional[float] = None
    bp_morning_systolic: Optional[int] = None
    bp_morning_diastolic: Optional[int] = None
    pulse_morning: Optional[int] = None
    bp_evening_systolic: Optional[int] = None
    bp_evening_diastolic: Optional[int] = None
    pulse_evening: Optional[int] = None
    medication_taken: bool = False
    medication_notes: Optional[str] = None
    sleep_hours: Optional[float] = None
    sleep_quality: Optional[int] = Field(None, ge=1, le=10)
    sleep_notes: Optional[str] = None
    knee_pain: Optional[int] = Field(None, ge=0, le=10)
    knee_swelling: Optional[str] = None
    knee_exercises_done: bool = False
    steps: Optional[int] = None
    mood: Optional[int] = Field(None, ge=1, le=10)
    energy: Optional[int] = Field(None, ge=1, le=10)
    anxiety: Optional[int] = Field(None, ge=0, le=10)
    notes: Optional[str] = None

class HealthRecordOut(HealthRecordCreate):
    id: int
    created_at: datetime
    updated_at: datetime
    # Вычисляемые поля
    weight_delta: Optional[float] = None      # разница с предыдущим днём
    bp_status: Optional[str] = None           # normal / elevated / high
    knee_trend: Optional[str] = None          # improving / stable / worsening

class HealthStats(BaseModel):
    period_days: int
    weight_start: Optional[float]
    weight_current: Optional[float]
    weight_delta: Optional[float]
    weight_goal: float
    weight_to_goal: Optional[float]
    bp_avg_systolic: Optional[float]
    bp_avg_diastolic: Optional[float]
    bp_trend: Optional[str]
    sleep_avg_hours: Optional[float]
    sleep_avg_quality: Optional[float]
    knee_avg_pain: Optional[float]
    knee_trend: Optional[str]
    steps_avg: Optional[float]
    steps_optimal_range: Optional[tuple]   # вычисляется из корреляции
    mood_avg: Optional[float]
    records_count: int

class HealthInsight(BaseModel):
    type: str       # 'correlation' | 'trend' | 'warning' | 'achievement'
    severity: str   # 'info' | 'warning' | 'success'
    title: str
    message: str
    data: Optional[dict] = None
```

---

### Endpoints (`routers/health.py`)

```
GET    /api/health/records?from=&to=         # записи за период
GET    /api/health/records/today             # запись за сегодня (или null)
GET    /api/health/records/{date}            # запись за конкретную дату
POST   /api/health/records                   # создать (upsert по дате)
PATCH  /api/health/records/{date}            # обновить запись дня

GET    /api/health/stats?days=30             # агрегированная статистика
GET    /api/health/insights                  # умные выводы (см. ниже)
GET    /api/health/chart/weight?days=90      # данные для графика веса
GET    /api/health/chart/bp?days=30          # данные для графика давления
GET    /api/health/chart/knee?days=30        # данные для графика колена + шаги
GET    /api/health/goals                     # текущие цели
PATCH  /api/health/goals/{key}              # обновить цель
```

### Логика insights (`/api/health/insights`)

Это самый ценный endpoint. Анализирует данные и возвращает список инсайтов:

```python
async def compute_insights(records: list[HealthRecord]) -> list[HealthInsight]:
    insights = []
    
    # Нужно минимум 7 записей для анализа
    if len(records) < 7:
        return [HealthInsight(
            type='info', severity='info',
            title='Накапливаем данные',
            message=f'Добавь ещё {7 - len(records)} записей — и появятся персональные наблюдения.'
        )]
    
    # 1. КОРРЕЛЯЦИЯ: шаги → колено
    # Разделить дни на группы: шаги < 5000 / 5000-7000 / > 7000
    # Посчитать средний knee_pain и % moderate/severe swelling в каждой группе
    # Если разница значимая (> 1.5 балла) → инсайт
    
    # 2. КОРРЕЛЯЦИЯ: сон → давление
    # Сравнить среднее утреннее давление в дни после сна < 6ч vs ≥ 7ч
    # Если разница > 8 мм рт.ст. → инсайт
    
    # 3. КОРРЕЛЯЦИЯ: сон → настроение
    # Средний mood в дни после хорошего сна (≥7ч, quality ≥7) vs плохого
    
    # 4. ТРЕНД ВЕСА
    # Линейная регрессия за последние 30 дней
    # Если снижение > 0.1 кг/нед → achievement
    # Если рост > 0.2 кг/нед → warning
    
    # 5. ТРЕНД ДАВЛЕНИЯ
    # Среднее за последние 7 дней vs предыдущие 7 дней
    # Если рост > 5 мм рт.ст. → warning
    
    # 6. СЕРИЯ (streak)
    # Подсчитать consecutive дни с записями
    # Если streak >= 7 → achievement
    
    # 7. ПРОПУСК ЛЕКАРСТВ
    # Если medication_taken = False более 2х дней подряд → warning
    
    # 8. ОПТИМАЛЬНЫЙ ДИАПАЗОН ШАГОВ
    # Найти диапазон шагов где knee_pain минимальный
    # Вернуть как рекомендацию
    
    return insights
```

Пример возвращаемых инсайтов:
```json
[
  {
    "type": "correlation",
    "severity": "warning", 
    "title": "Шаги и колено",
    "message": "В дни когда шагов больше 7 000, боль в колене в среднем выше на 2.3 балла. Оптимальный диапазон сейчас: 4 500–6 500 шагов.",
    "data": {"optimal_min": 4500, "optimal_max": 6500}
  },
  {
    "type": "correlation",
    "severity": "info",
    "title": "Сон и давление",
    "message": "После ночи меньше 6 часов утреннее давление в среднем на 11 мм выше. Хороший сон — лучшая профилактика."
  },
  {
    "type": "achievement",
    "severity": "success",
    "title": "Вес идёт вниз",
    "message": "За последние 3 недели −1.8 кг. Темп: примерно −0.6 кг в неделю. До цели (75 кг) осталось 7.4 кг."
  },
  {
    "type": "trend",
    "severity": "info",
    "title": "12 дней подряд",
    "message": "Ты заполняешь дневник здоровья 12 дней без пропусков. Отличная привычка."
  }
]
```

---

## Frontend (`pages/HealthPage.tsx`)

### Структура страницы — 4 таба

```
[Сегодня]  [История]  [Графики]  [Инсайты]
```

---

### Таб 1: «Сегодня» — форма ввода

Главный экран модуля. Открываешь утром — заполняешь за 2 минуты.

Дизайн: **карточки-секции**, каждая разворачивается.

#### Секция «Давление»
```
💓 Давление
────────────────────────────────
Утро:    [126] / [78]   пульс [72]   ✓ Принято лекарство
Вечер:   [   ] / [  ]   пульс [  ]
```
- Числа вводятся в большие поля (крупный шрифт, number keyboard на iPhone)
- Статус-индикатор рядом: 🟢 норма / 🟡 повышено / 🔴 высокое
  - Норма: < 130/80
  - Повышено: 130–139/80–89
  - Высокое: ≥ 140/90

#### Секция «Вес»
```
⚖️ Вес
────────────────────────────────
[82.4] кг      △ −0.2 кг вчера
До цели: 7.4 кг  ████████░░░░ 
```
- Одно поле, decimal keyboard
- Дельта от вчерашнего значения (зелёная/красная)
- Прогресс-бар к цели

#### Секция «Сон»
```
😴 Сон
────────────────────────────────
Часов:   [7] ч [10] мин
Качество: ○ ○ ● ○ ○ ○ ○ ○ ○ ○   3/10
```
- Часы + минуты (или просто decimal: 7.2)
- Качество: горизонтальная шкала 1–10 (тап)

#### Секция «Колено»
```
🦵 Колено
────────────────────────────────
Боль:    ○─────────●──────○  4/10
Отёк:    [нет] [слабый] [умер.] [сильный]
Шаги:    [6 200]
Упражнения: ○ Нет  ● Да
```
- Боль: горизонтальный слайдер 0–10
- Отёк: 4 кнопки-чипа
- Шаги: number input

#### Секция «Самочувствие»
```
✨ Самочувствие
────────────────────────────────
Настроение:  😔 ○ ○ ○ ○ ● ○ ○ ○ ○ 😊  6/10
Энергия:     🪫 ○ ○ ● ○ ○ ○ ○ ○ ○ ⚡  3/10
Тревога:     ○ ○ ○ ● ○ ○ ○ ○ ○ ○     3/10
```

#### Кнопка сохранения
```
[  Сохранить запись  ]
```
Большая, зелёная, внизу страницы. При сохранении — конфетти или приятная анимация.

---

### Таб 2: «История»

Список карточек по дням (последние 30 дней, lazy load):

```
Чт, 5 июня
────────────────────────────────
💓 128/79  😴 7ч10мин  ⚖️ 82.4 кг
🦵 боль 2/10  шаги 6200  😊 7/10
────────────────────────────────
Ср, 4 июня
...
```

- Тап на запись → открыть на редактирование
- Цвет рамки карточки: по общему статусу дня
  - Зелёный — всё хорошо
  - Жёлтый — есть повышенные показатели
  - Красный — давление высокое или боль ≥ 7

---

### Таб 3: «Графики»

Четыре графика. Используй **Recharts** (уже в зависимостях React).

#### 1. График веса (LineChart)
- Ось X: даты (последние 90 дней)
- Ось Y: вес в кг
- Линия тренда (пунктирная)
- Горизонтальная линия — цель (75 кг)
- Тултип: дата + вес + дельта

#### 2. График давления (ComposedChart)
- Ось X: даты (30 дней)
- Две линии: систолическое (красная) + диастолическое (синяя)
- Зоны фона: норма (зелёная зона) / повышено / высокое
- Тултип: дата + утро + вечер

#### 3. График колена + шаги (ComposedChart)
- Ось X: даты
- Bar chart: шаги (серые столбцы, фоновый слой)
- Line chart: боль в колене (оранжевая линия)
- Этот график показывает корреляцию визуально

#### 4. График настроения и сна (LineChart)
- Две линии: настроение (фиолетовая) + часы сна (бирюзовая, правая ось)
- Позволяет визуально увидеть связь

Все графики:
- Responsive (адаптируются под ширину экрана)
- Переключатель периода: 7д / 30д / 90д
- На мобильном — вертикальный скролл графиков

---

### Таб 4: «Инсайты»

Карточки инсайтов из `/api/health/insights`:

```
┌─────────────────────────────────┐
│ 🦵  Шаги и колено          ⚠️   │
│                                 │
│ В дни когда шагов больше 7 000, │
│ боль в среднем выше на 2.3 б.   │
│                                 │
│ Оптимальный диапазон:           │
│ ░░░░[████ 4500–6500 ████]░░░░  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🏆  Вес идёт вниз          ✅   │
│                                 │
│ За 3 недели: −1.8 кг            │
│ Темп: −0.6 кг/нед               │
│ До цели: ████████░░  7.4 кг     │
└─────────────────────────────────┘
```

- Цвет рамки: зелёный (success) / жёлтый (warning) / синий (info)
- Если данных мало → мотивирующий empty state с прогресс-баром «до первых инсайтов»

---

### Быстрый ввод (Quick Log)

На Dashboard добавить виджет **«Быстрая запись»**:

```
[+ Записать давление]  [+ Вес сегодня]
```

Тап → маленький bottom sheet с одной секцией, без перехода на страницу здоровья.

---

## Dashboard — добавить виджет здоровья

В `DashboardPage.tsx` добавить `HealthWidget`:

```
💓 Здоровье
────────────────────
Сегодня: нет записи
[+ Записать сейчас]

или если есть:

Давление: 128/79 🟢
Вес: 82.4 кг  △ −0.2
Колено: 2/10  💊 ✓
```

---

## Store (`src/store/healthStore.ts`)

```typescript
interface HealthStore {
  todayRecord: HealthRecord | null
  records: HealthRecord[]
  stats: HealthStats | null
  insights: HealthInsight[]
  isLoading: boolean
  error: string | null
  
  fetchToday: () => Promise<void>
  fetchRecords: (from: string, to: string) => Promise<void>
  fetchStats: (days: number) => Promise<void>
  fetchInsights: () => Promise<void>
  saveRecord: (data: HealthRecordCreate) => Promise<void>
  updateRecord: (date: string, data: Partial<HealthRecordCreate>) => Promise<void>
}
```

---

## API (`src/api/health.ts`)

```typescript
export const healthApi = {
  getToday: () => api.get<HealthRecord>('/health/records/today'),
  getRecords: (from: string, to: string) => api.get('/health/records', { params: { from, to } }),
  getStats: (days = 30) => api.get<HealthStats>('/health/stats', { params: { days } }),
  getInsights: () => api.get<HealthInsight[]>('/health/insights'),
  getChartData: (metric: 'weight'|'bp'|'knee'|'mood', days: number) =>
    api.get(`/health/chart/${metric}`, { params: { days } }),
  saveRecord: (data: HealthRecordCreate) => api.post('/health/records', data),
  updateRecord: (date: string, data: Partial<HealthRecordCreate>) =>
    api.patch(`/health/records/${date}`, data),
  getGoals: () => api.get('/health/goals'),
  updateGoal: (key: string, value: number) => api.patch(`/health/goals/${key}`, { target_value: value }),
}
```

---

## Файлы для создания / изменения

**Backend:**
- `models/health.py` — полные схемы включая HealthInsight, HealthStats
- `routers/health.py` — все endpoints + логика insights + корреляции
- `database.py` — обновлённая схема таблицы health_records + health_goals

**Frontend:**
- `src/store/healthStore.ts`
- `src/api/health.ts`
- `src/pages/HealthPage.tsx` — 4 таба
- `src/components/health/TodayForm.tsx` — форма ввода
- `src/components/health/BPSection.tsx`
- `src/components/health/WeightSection.tsx`
- `src/components/health/SleepSection.tsx`
- `src/components/health/KneeSection.tsx`
- `src/components/health/MoodSection.tsx`
- `src/components/health/HistoryList.tsx`
- `src/components/health/HistoryCard.tsx`
- `src/components/health/WeightChart.tsx`
- `src/components/health/BPChart.tsx`
- `src/components/health/KneeChart.tsx`
- `src/components/health/MoodChart.tsx`
- `src/components/health/InsightCard.tsx`
- `src/components/health/QuickLog.tsx`
- `src/components/dashboard/HealthWidget.tsx`
- `src/components/ui/ScaleInput.tsx` — переиспользуемая шкала 1–10
- `src/components/ui/SliderInput.tsx` — слайдер для боли

---

## Важные детали

- Все числовые поля на iPhone открывают цифровую клавиатуру (`inputMode="decimal"` или `type="number"`)
- Форма сохраняет прогресс в localStorage — если закрыл не сохранив, данные не теряются
- Давление: автоматически вычислять статус при вводе, показывать индикатор в реальном времени
- Корреляции считаются на бэкенде (Python), не на фронтенде
- Recharts графики: использовать `ResponsiveContainer` везде
