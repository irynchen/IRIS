# Промпт 2 — IRIS: Модули «Мой день» и «Дом»

## Контекст

Scaffolding проекта IRIS уже создан (Промпт 1).
Теперь реализуй полную логику двух модулей: **«Мой день»** и **«Дом»**.
Также доработай **Dashboard** чтобы он реально показывал живые данные из обоих модулей.

---

## Модуль 1: «Мой день» (DayPage)

### Концепция
Не просто список задач — это **структурированный день с временными блоками**.
Утром открываешь → видишь весь день. Можно добавить, переставить, отметить выполненным.

---

### Backend (`routers/day_plan.py`)

#### Pydantic схемы (`models/day_plan.py`)

```python
class TaskCategory(str, Enum):
    work = "work"
    health = "health"
    home = "home"
    learning = "learning"
    rest = "rest"
    food = "food"
    personal = "personal"

class DayTaskCreate(BaseModel):
    date: date
    time_from: Optional[time] = None
    time_to: Optional[time] = None
    title: str
    category: TaskCategory = TaskCategory.personal
    priority: int = Field(2, ge=1, le=3)
    notes: Optional[str] = None

class DayTaskUpdate(BaseModel):
    time_from: Optional[time] = None
    time_to: Optional[time] = None
    title: Optional[str] = None
    category: Optional[TaskCategory] = None
    priority: Optional[int] = None
    completed: Optional[bool] = None
    notes: Optional[str] = None

class DayTaskOut(DayTaskCreate):
    id: int
    completed: bool
    created_at: datetime
```

#### Endpoints

```
GET    /api/day/plans?date=2026-06-05          # все задачи на дату
POST   /api/day/plans                           # создать задачу
PATCH  /api/day/plans/{id}                      # обновить (в т.ч. complete)
DELETE /api/day/plans/{id}                      # удалить
GET    /api/day/plans/range?from=...&to=...     # задачи за диапазон дат
POST   /api/day/plans/{id}/complete             # быстрое переключение completed
GET    /api/day/stats?month=2026-06             # статистика за месяц:
                                                #   total tasks, completed, % by category
```

#### Логика `next_due` для повторяющихся задач
Если у задачи есть `repeat_days` (int) — при создании/complete автоматически создавать следующую запись на `date + repeat_days`. Добавь поле `repeat_days` и `parent_id` в схему и таблицу.

---

### Frontend (`pages/DayPage.tsx`)

#### Верхняя панель
```
← [Вт 3 июня]  [Ср 4 июня]  [Чт 5 июня ●]  [Пт 6 июня]  [Сб 7 июня] →
```
- Горизонтальный скролл дат (текущая подсвечена)
- Кнопка «Сегодня» если смотришь другой день
- Кнопка «+» — открыть форму добавления

#### Отображение задач

**Два режима** (переключатель):

**Timeline** (по умолчанию):
```
08:00 ─────────────────────────────────
       [💼 Работа             09:00–17:30]
17:30 ─────────────────────────────────
       [🥗 Обед               12:30–13:00] ✓
18:30 ─────────────────────────────────
       [🚶 Прогулка           18:30–19:00]
```
- Задачи без времени — в секции «Без времени» внизу
- Выполненные — зачёркнуты, полупрозрачные
- Цвет левой полоски карточки = категория

**Список** (компактный):
- Просто карточки с чекбоксом, без временной шкалы

#### Карточка задачи
```
┌─[цвет]──────────────────────────────┐
│  ○  Английский 20 минут             │
│     20:00 – 20:20  · 📚 Обучение    │
│                              ···    │
└─────────────────────────────────────┘
```
- Тап на ○ → выполнено (анимация)
- Долгое нажатие / свайп влево на мобильном → удалить
- ··· → редактировать

#### Форма добавления задачи (bottom sheet на мобильном, modal на десктопе)

Поля:
- Название (text input, autofocus)
- Категория (горизонтальные чипы с иконками и цветом)
- Время от / до (time picker, опционально)
- Приоритет (1=низкий, 2=средний, 3=высокий — 3 кнопки)
- Повтор (нет / каждые N дней — select)
- Заметка (textarea, опционально, collapsed по умолчанию)

#### Категории и цвета
```typescript
export const CATEGORIES = {
  work:     { label: 'Работа',    icon: '💼', color: '#4A7FA5' },
  health:   { label: 'Здоровье',  icon: '💚', color: '#6B8F71' },
  home:     { label: 'Дом',       icon: '🏡', color: '#C4A882' },
  learning: { label: 'Обучение',  icon: '📚', color: '#8B7BA8' },
  rest:     { label: 'Отдых',     icon: '🌿', color: '#7EB5A6' },
  food:     { label: 'Еда',       icon: '🥗', color: '#D4956A' },
  personal: { label: 'Личное',    icon: '✨', color: '#A8956B' },
}
```

#### «Фокус дня» (компонент `DayFocus`)
В верхней части страницы — небольшой блок:
```
Фокус дня
Осталось: 3 из 7 задач  ████░░░░ 43%
Следующее: 🚶 Прогулка в 18:30
```

---

## Модуль 2: «Дом» (HomePage)

### Концепция
Умная система уборки: не «убрать всё», а **«что нужно именно сегодня»**.
Каждая задача знает когда её делали последний раз и сигнализирует когда пора.

---

### Backend (`routers/home.py`)

#### Pydantic схемы (`models/home.py`)

```python
class HomeTaskCreate(BaseModel):
    room_id: int
    title: str
    frequency_days: Optional[int] = None  # None = разовая задача
    last_done: Optional[date] = None
    priority: int = Field(2, ge=1, le=3)
    notes: Optional[str] = None

class HomeTaskUpdate(BaseModel):
    title: Optional[str] = None
    frequency_days: Optional[int] = None
    last_done: Optional[date] = None
    priority: Optional[int] = None
    notes: Optional[str] = None

class HomeTaskOut(HomeTaskCreate):
    id: int
    next_due: Optional[date]
    status: str  # ok / due_soon / overdue — вычисляется на лету
    days_until_due: Optional[int]
    created_at: datetime
```

#### Логика статусов (вычислять в роутере)
```python
def compute_status(last_done, frequency_days) -> tuple[str, Optional[int]]:
    if not frequency_days:
        return "ok", None
    if not last_done:
        return "overdue", -999
    next_due = last_done + timedelta(days=frequency_days)
    days_until = (next_due - date.today()).days
    if days_until < 0:
        return "overdue", days_until
    elif days_until <= 2:
        return "due_soon", days_until
    else:
        return "ok", days_until
```

#### Endpoints

```
GET    /api/home/rooms                          # все комнаты со статистикой
GET    /api/home/rooms/{id}/tasks               # задачи комнаты
POST   /api/home/rooms                          # добавить комнату
PATCH  /api/home/rooms/{id}                     # переименовать
DELETE /api/home/rooms/{id}                     # удалить (cascade tasks)

GET    /api/home/tasks                          # все задачи (с фильтром ?status=overdue)
POST   /api/home/tasks                          # создать задачу
PATCH  /api/home/tasks/{id}                     # обновить
DELETE /api/home/tasks/{id}                     # удалить
POST   /api/home/tasks/{id}/done                # отметить сделанным (обновляет last_done = today, пересчитывает next_due)

GET    /api/home/today                          # только просроченные + due_soon — «что делать сегодня»
```

#### Стартовые задачи (seed data)
При первом запуске (`create_tables()`) добавить типичные задачи уборки:

```sql
-- Кухня (room_id=1)
INSERT INTO home_tasks (room_id, title, frequency_days, priority) VALUES
(1, 'Вымыть раковину', 2, 3),
(1, 'Протереть плиту', 3, 3),
(1, 'Вынести мусор', 2, 3),
(1, 'Холодильник — порядок', 14, 2),
(1, 'Протереть фасады', 30, 1);

-- Ванная (room_id=2)
INSERT INTO home_tasks (room_id, title, frequency_days, priority) VALUES
(2, 'Раковина и зеркало', 3, 3),
(2, 'Душевая кабина', 7, 2),
(2, 'Пол', 7, 2),
(2, 'Сменить полотенца', 7, 2);

-- Спальня (room_id=3)
INSERT INTO home_tasks (room_id, title, frequency_days, priority) VALUES
(3, 'Сменить постельное бельё', 14, 3),
(3, 'Пропылесосить', 7, 2),
(3, 'Проветрить', 3, 1);
```

---

### Frontend (`pages/HomePage.tsx`)

#### Верхний блок: «Сегодня»

```
┌─────────────────────────────────────┐
│  🏡 Сегодня дома                    │
│  Просрочено: 2   Скоро: 3           │
│                                     │
│  • Вымыть раковину    [Кухня]  ●●●  │
│  • Сменить полотенца  [Ванная] ●●○  │
│  • Пропылесосить      [Спальня]●○○  │
│                                     │
│         [Отметить всё сделанным]    │
└─────────────────────────────────────┘
```

Этот блок показывает только overdue + due_soon задачи.
Кнопка «Сделано» на каждой задаче — большая, touch-friendly.

#### Карточки комнат

Сетка карточек (2 колонки на мобильном, 3 на десктопе):

```
┌──────────────┐  ┌──────────────┐
│  🍳 Кухня    │  │  🚿 Ванная   │
│              │  │              │
│  ████████░░  │  │  ████░░░░░░  │
│  8/10 задач  │  │  4/9 задач   │
│  ✓ ok        │  │  ⚠ 2 скоро   │
└──────────────┘  └──────────────┘
```

- Прогресс-бар = процент задач в статусе `ok`
- Иконка статуса: ✓ всё ок / ⚠ есть скоро / 🔴 есть просроченные
- Тап → открывает список задач комнаты

#### Страница комнаты (modal или отдельный route `/home/room/:id`)

Список задач с:
- Статус-индикатор (зелёный / жёлтый / красный)
- Название + частота
- «Последний раз: 3 дня назад» / «Следующий раз: завтра»
- Кнопка «✓ Сделано» → POST .../done

```
🍳 Кухня
─────────────────────────────────────
🔴 Вымыть раковину
   Каждые 2 дня · Последний раз: 4 дня назад
                              [✓ Сделано]

🟡 Протереть плиту
   Каждые 3 дня · Следующий раз: завтра
                              [✓ Сделано]

🟢 Холодильник
   Каждые 14 дней · Следующий раз: через 9 дней
                              [✓ Сделано]
─────────────────────────────────────
[+ Добавить задачу]
```

#### Форма добавления задачи (bottom sheet)

Поля:
- Комната (select)
- Название
- Как часто (нет / каждые N дней) — number input
- Приоритет
- Заметка

---

## Dashboard — доработка (`DashboardPage.tsx`)

Теперь Dashboard показывает **живые данные** из обоих модулей.

### Структура главного экрана

```
Доброе утро, Ирочка ☀️
Пятница, 5 июня 2026
─────────────────────────────────────

[ПЛАН ДНЯ]
Выполнено: 2 из 6  ████░░░░░░ 33%
Следующее: 🚶 Прогулка в 18:30

[ДОМ]
🔴 2 просроченных задачи
   Вымыть раковину · Раковина в ванной

─────────────────────────────────────

[карточки модулей]
☀️ Мой день   🏡 Дом
💚 Здоровье*  ✈️ Поездки*

* — placeholder «Скоро»
```

### API вызовы на Dashboard

```typescript
// Параллельно при загрузке
const [dayTasks, homeTodayTasks] = await Promise.all([
  api.get(`/day/plans?date=${today}`),
  api.get('/home/today'),
])
```

### Компонент `DayWidget`
- Прогресс выполнения сегодняшних задач
- Следующая невыполненная задача с временем
- Ссылка «Открыть день →»

### Компонент `HomeWidget`
- Количество просроченных задач
- Список (макс 3) с названием и комнатой
- Ссылка «Открыть дом →»

---

## Общие требования к реализации

### UX / мобильный
- Все интерактивные элементы min 44×44px
- Bottom sheet анимация: `transform: translateY` с `transition: 0.3s ease`
- Swipe-to-delete на задачах (touch events)
- Pull-to-refresh на DayPage и HomePage
- Haptic feedback при complete (если доступен): `navigator.vibrate(50)`

### Состояние (Zustand stores)

Создай:
- `useDayStore` — задачи, выбранная дата, loading/error
- `useHomeStore` — комнаты, задачи, today tasks, loading/error

### Оптимистичные обновления
При нажатии «Сделано» или «✓»:
1. Сразу обновить UI (оптимистично)
2. Отправить запрос в API
3. При ошибке — откатить

### Skeleton loading
Пока данные грузятся — показывать skeleton cards (серые анимированные блоки), не spinner.

### Пустые состояния
Если задач нет — красивый empty state:
```
☀️
День свободен
Добавь первую задачу
[+ Добавить задачу]
```

---

## Файлы для создания / изменения

**Backend (новые/изменённые):**
- `models/day_plan.py` — полные схемы
- `models/home.py` — полные схемы
- `routers/day_plan.py` — все endpoints + логика повторов
- `routers/home.py` — все endpoints + статусы + seed data
- `database.py` — добавить поля `repeat_days`, `parent_id` в таблицу day_plan

**Frontend (новые/изменённые):**
- `src/store/dayStore.ts`
- `src/store/homeStore.ts`
- `src/api/day.ts` — все API функции для дня
- `src/api/home.ts` — все API функции для дома
- `src/pages/DayPage.tsx` — полная реализация
- `src/pages/HomePage.tsx` — полная реализация
- `src/pages/DashboardPage.tsx` — доработка с живыми данными
- `src/components/day/TaskCard.tsx`
- `src/components/day/TaskForm.tsx`
- `src/components/day/Timeline.tsx`
- `src/components/day/DayFocus.tsx`
- `src/components/home/RoomCard.tsx`
- `src/components/home/HomeTaskItem.tsx`
- `src/components/home/HomeTaskForm.tsx`
- `src/components/home/TodayBlock.tsx`
- `src/components/dashboard/DayWidget.tsx`
- `src/components/dashboard/HomeWidget.tsx`
- `src/components/ui/BottomSheet.tsx` — переиспользуемый компонент
- `src/components/ui/SkeletonCard.tsx`
- `src/components/ui/EmptyState.tsx`
- `src/components/ui/ProgressBar.tsx`
