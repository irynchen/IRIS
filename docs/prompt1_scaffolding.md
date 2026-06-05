# Промпт 1 — Goeloria IRIS: Scaffolding

## Контекст проекта

Создай полную структуру веб-приложения **IRIS** (личный life dashboard) для деплоя на VPS Ubuntu 22.04 (Strato) по адресу `iris.goeloria.de`.

Приложение — личный центр управления жизнью: здоровье, день, дом, финансы, путешествия. Используется только одним пользователем (owner). Доступ с любого устройства: MacBook, iPhone, iPad.

---

## Технический стек

- **Frontend**: React 18 + Vite, TypeScript, Tailwind CSS — PWA (installable на iPhone/iPad)
- **Backend**: FastAPI (Python 3.11)
- **Database**: PostgreSQL 16 + pgvector extension
- **Deploy**: Docker Compose
- **Proxy**: Nginx (уже есть на сервере) — конфиг для субдомена `iris.goeloria.de`
- **Auth**: простой JWT (один пользователь, один пароль — не нужен полноценный auth)

---

## Структура проекта

Создай следующую файловую структуру:

```
iris/
├── docker-compose.yml
├── .env.example
├── nginx/
│   └── iris.goeloria.de.conf        # nginx конфиг для субдомена
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py                       # FastAPI app entry point
│   ├── config.py                     # settings из .env
│   ├── database.py                   # PostgreSQL connection (asyncpg / SQLAlchemy async)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── health.py
│   │   ├── day_plan.py
│   │   └── home.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── health.py
│   │   ├── day_plan.py
│   │   └── home.py
│   └── auth/
│       ├── __init__.py
│       └── jwt.py                    # простой JWT для одного пользователя
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── public/
    │   ├── manifest.json             # PWA manifest
    │   └── icons/                    # PWA иконки (192x192, 512x512)
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── api/
        │   └── client.ts             # axios instance с базовым URL и JWT interceptor
        ├── store/
        │   └── authStore.ts          # Zustand store для auth
        ├── pages/
        │   ├── LoginPage.tsx
        │   ├── DashboardPage.tsx     # главный экран
        │   ├── DayPage.tsx           # Мой день
        │   └── HomePage.tsx          # Дом
        ├── components/
        │   ├── layout/
        │   │   ├── AppShell.tsx      # общая оболочка с навигацией
        │   │   ├── BottomNav.tsx     # мобильная навигация (iPhone)
        │   │   └── SideNav.tsx       # десктопная навигация (MacBook)
        │   └── ui/
        │       ├── Card.tsx
        │       ├── Badge.tsx
        │       └── LoadingSpinner.tsx
        └── styles/
            └── globals.css
```

---

## Docker Compose

`docker-compose.yml` должен содержать три сервиса:

1. **db** — `pgvector/pgvector:pg16-ubuntu`, volume для данных, healthcheck
2. **backend** — FastAPI, зависит от db, переменные из `.env`
3. **frontend** — Vite build → nginx static serve

Порты: backend на `8000` (только внутри Docker сети), frontend на `3000` (проксируется nginx).

---

## .env.example

```
POSTGRES_USER=iris
POSTGRES_PASSWORD=changeme
POSTGRES_DB=iris_db
POSTGRES_HOST=db
POSTGRES_PORT=5432

JWT_SECRET=changeme_secret
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=720

IRIS_USERNAME=irina
IRIS_PASSWORD_HASH=         # bcrypt hash

VITE_API_URL=https://iris.goeloria.de/api
```

---

## База данных — схема (первые модули)

В `database.py` создай функцию `create_tables()` которая при старте создаёт:

```sql
-- Расширение для будущего RAG
CREATE EXTENSION IF NOT EXISTS vector;

-- Здоровье: давление, вес, сон, колено
CREATE TABLE IF NOT EXISTS health_records (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    weight_kg NUMERIC(5,2),
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    pulse INTEGER,
    sleep_hours NUMERIC(4,2),
    sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 10),
    knee_pain INTEGER CHECK (knee_pain BETWEEN 0 AND 10),
    knee_swelling VARCHAR(20),  -- none / mild / moderate / severe
    steps INTEGER,
    mood INTEGER CHECK (mood BETWEEN 1 AND 10),
    energy INTEGER CHECK (energy BETWEEN 1 AND 10),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Мой день: задачи и временные блоки
CREATE TABLE IF NOT EXISTS day_plan (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    time_from TIME,
    time_to TIME,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50),  -- work / health / home / learning / rest / food
    priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
    completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Дом: комнаты и задачи по уборке
CREATE TABLE IF NOT EXISTS home_rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,     -- Кухня, Ванная, Спальня...
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS home_tasks (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES home_rooms(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    frequency_days INTEGER,         -- как часто нужно делать (в днях)
    last_done DATE,
    next_due DATE,
    priority INTEGER DEFAULT 2,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Стартовые данные для комнат
INSERT INTO home_rooms (name, icon, sort_order) VALUES
    ('Кухня', '🍳', 1),
    ('Ванная', '🚿', 2),
    ('Спальня', '🛏', 3),
    ('Гостиная', '🛋', 4),
    ('Коридор', '🚪', 5),
    ('Кабинет', '💻', 6)
ON CONFLICT DO NOTHING;
```

---

## FastAPI Backend

### `main.py`
- CORS для `iris.goeloria.de` и `localhost:5173`
- Подключить роутеры: `/api/health`, `/api/day`, `/api/home`
- При старте вызвать `create_tables()`
- Endpoint `GET /api/health-check` → `{"status": "ok"}`

### Auth (`auth/jwt.py`)
- Один пользователь из `.env` (`IRIS_USERNAME` / `IRIS_PASSWORD_HASH`)
- `POST /api/auth/login` → возвращает JWT token
- Dependency `get_current_user` для защищённых роутов

### Роутеры — базовые CRUD:
- `GET/POST /api/health/records` — записи здоровья
- `GET/POST/PATCH /api/day/plans` — план дня (фильтр по дате)
- `GET/POST/PATCH /api/home/rooms` — комнаты
- `GET/POST/PATCH/DELETE /api/home/tasks` — задачи уборки

---

## Frontend — навигация и дизайн

### Дизайн-система
Палитра: **пудровый, оливковый, песочный, морской** (как указано в концепции).

CSS переменные в `globals.css`:
```css
:root {
  --color-bg: #F7F4EF;          /* тёплый белый */
  --color-surface: #FFFFFF;
  --color-primary: #6B8F71;     /* оливковый */
  --color-secondary: #C4A882;   /* песочный */
  --color-accent: #4A7FA5;      /* морской */
  --color-muted: #E8E2D9;
  --color-text: #2C2C2C;
  --color-text-muted: #7A7A7A;
  --radius-card: 16px;
  --shadow-card: 0 2px 12px rgba(0,0,0,0.07);
}
```

Шрифты (Google Fonts):
- Display: `Cormorant Garamond` (заголовки, приветствие)
- Body: `DM Sans` (весь текст интерфейса)

### AppShell
- **Мобильный** (< 768px): `BottomNav` с иконками внизу экрана (5 вкладок)
- **Десктоп** (≥ 768px): `SideNav` слева (фиксированная, 240px)

Вкладки навигации:
```
🏠 Главная    → /
☀️ Мой день  → /day
🏡 Дом       → /home
💚 Здоровье  → /health  (placeholder — модуль 2)
✈️ Поездки   → /travel  (placeholder — модуль 3)
```

### LoginPage
- Минималистичная, красивая
- Логотип / название IRIS
- Поле пароля + кнопка войти
- При успехе → redirect на `/`

### DashboardPage (главный экран)
Показывает:
- Приветствие с датой: `Доброе утро, Ирочка ☀️ / Добрый вечер...` (в зависимости от времени)
- Карточки-shortcuts на все модули
- «Фокус дня» — первые 3 задачи из day_plan на сегодня
- Статус дома — сколько задач просрочено (next_due < today)

### DayPage
- Список временных блоков на выбранную дату (по умолчанию сегодня)
- Переключатель дат (< сегодня >)
- Добавить задачу: модальное окно с полями (время, название, категория, приоритет)
- Отметить выполненным (checkbox / swipe на мобильном)
- Цветовая маркировка по категории

### HomePage
- Карточки комнат с прогресс-баром чистоты (на основе просроченных задач)
- При клике на комнату — список задач с датой последней уборки и статусом
- Добавить задачу уборки
- Кнопка «Сделано сегодня» — обновляет `last_done` и пересчитывает `next_due`

---

## PWA (manifest.json)

```json
{
  "name": "IRIS — Жизнь в порядке",
  "short_name": "IRIS",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F7F4EF",
  "theme_color": "#6B8F71",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Добавить в `vite.config.ts` плагин `vite-plugin-pwa`.

---

## Nginx конфиг (`nginx/iris.goeloria.de.conf`)

```nginx
server {
    listen 80;
    server_name iris.goeloria.de;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name iris.goeloria.de;

    ssl_certificate     /etc/letsencrypt/live/iris.goeloria.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/iris.goeloria.de/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

> После деплоя: `certbot --nginx -d iris.goeloria.de` для SSL.

---

## README.md

Создай `README.md` с инструкцией деплоя:

1. Клонировать репо на сервер
2. Скопировать `.env.example` → `.env`, заполнить пароли
3. Сгенерировать bcrypt hash для пароля: `python3 -c "import bcrypt; print(bcrypt.hashpw(b'mypassword', bcrypt.gensalt()).decode())"`
4. `docker-compose up -d --build`
5. Скопировать nginx конфиг, получить SSL сертификат
6. Открыть `https://iris.goeloria.de`

---

## Важные требования

- Весь код TypeScript строго типизирован (no `any`)
- Все API calls через `src/api/client.ts` (axios с interceptor для JWT)
- Мобильная версия — главный приоритет (touch-friendly, min tap target 44px)
- Загрузка состояний везде (skeleton или spinner)
- Обработка ошибок API с понятными сообщениями
- Placeholder страницы для модулей которых ещё нет (Health, Travel) — красивые, с надписью «Скоро»
