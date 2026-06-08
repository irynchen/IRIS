import asyncpg
from config import settings

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS health_records (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    weight_kg NUMERIC(5,2),
    bp_morning_systolic INTEGER,
    bp_morning_diastolic INTEGER,
    pulse_morning INTEGER,
    bp_evening_systolic INTEGER,
    bp_evening_diastolic INTEGER,
    pulse_evening INTEGER,
    medication_taken BOOLEAN DEFAULT FALSE,
    medication_notes TEXT,
    sleep_hours NUMERIC(4,2),
    sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 10),
    sleep_notes TEXT,
    knee_pain INTEGER CHECK (knee_pain BETWEEN 0 AND 10),
    knee_swelling VARCHAR(20) CHECK (knee_swelling IN ('none','mild','moderate','severe')),
    knee_exercises_done BOOLEAN DEFAULT FALSE,
    steps INTEGER,
    mood INTEGER CHECK (mood BETWEEN 1 AND 10),
    energy INTEGER CHECK (energy BETWEEN 1 AND 10),
    anxiety INTEGER CHECK (anxiety BETWEEN 0 AND 10),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health_goals (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    target_value NUMERIC,
    target_value2 NUMERIC,
    unit VARCHAR(20),
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO health_goals (key, target_value, unit) VALUES
    ('weight', 75.0, 'kg'),
    ('steps', 6000, 'Schritte'),
    ('sleep', 7.5, 'Stunden'),
    ('bp_systolic', 120, 'mmHg')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS life_vision (
    id SERIAL PRIMARY KEY,
    horizon VARCHAR(20) UNIQUE NOT NULL,
    content TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO life_vision (horizon) VALUES
    ('10_years'), ('5_years'), ('3_years')
ON CONFLICT (horizon) DO NOTHING;

CREATE TABLE IF NOT EXISTS goal_areas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(30),
    sort_order INTEGER DEFAULT 0,
    UNIQUE (sort_order)
);

CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    area_id INTEGER REFERENCES goal_areas(id) ON DELETE SET NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    why_important TEXT,
    horizon VARCHAR(20) NOT NULL DEFAULT '1_year',
    year INTEGER,
    month INTEGER,
    progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','paused','done','dropped')),
    energy_level VARCHAR(20) DEFAULT 'ok',
    deadline DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_focus (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    theme TEXT,
    goal_1 TEXT,
    goal_2 TEXT,
    goal_3 TEXT,
    reward TEXT,
    review TEXT,
    UNIQUE(year, month)
);

CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    specialty VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doctor_appointments (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME,
    reason VARCHAR(300),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned','done','cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(200),
    stock_count INTEGER,
    notes TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS day_plan (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    time_from TIME,
    time_to TIME,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
    completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    repeat_days INTEGER,
    parent_id INTEGER REFERENCES day_plan(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS home_rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    UNIQUE (sort_order)
);

INSERT INTO goal_areas (name, icon, color, sort_order) VALUES
    ('Gesundheit & Körper', '💚', '#6B8F71',  1),
    ('Schönheit & Pflege',  '💄', '#C4A882',  2),
    ('Finanzen',            '💶', '#4A7FA5',  3),
    ('Arbeit & Beruf',      '💼', '#8B7355',  4),
    ('IT-Projekte',         '💻', '#4A5568',  5),
    ('Reisen & Freude',     '✈️', '#2E86AB',  6),
    ('Beziehung & Nähe',    '❤️', '#D4697C',  7),
    ('Zuhause & Ordnung',   '🏡', '#7B9E87',  8),
    ('Lernen & Kultur',     '📚', '#6B7280',  9),
    ('Innere Stärke',       '🌸', '#9B7EBD', 10)
ON CONFLICT (sort_order) DO NOTHING;

INSERT INTO home_rooms (name, icon, sort_order) VALUES
    ('Küche',         '🍳',  1),
    ('Bad',           '🚿',  2),
    ('Schlafzimmer',  '🛏',  3),
    ('Wohnzimmer',    '🛋',  4),
    ('Flur',          '🚪',  5),
    ('Arbeitszimmer', '💻',  6),
    ('Esszimmer',     '🍽',  7),
    ('Gästebad',      '🛁',  8),
    ('Balkon',        '🌿',  9),
    ('Keller',        '📦', 10),
    ('Auto',          '🚗', 11)
ON CONFLICT (sort_order) DO NOTHING;

-- ─── Phase 1: Architektur v2 ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS areas (
    id          SERIAL PRIMARY KEY,
    slug        VARCHAR(50) UNIQUE NOT NULL,
    name        VARCHAR(100) NOT NULL,
    icon        VARCHAR(50),
    color       VARCHAR(30),
    sort_order  INTEGER DEFAULT 0,
    has_rooms   BOOLEAN DEFAULT FALSE,
    active      BOOLEAN DEFAULT TRUE,
    UNIQUE (sort_order)
);

INSERT INTO areas (slug, name, icon, color, sort_order, has_rooms) VALUES
    ('home',       'Zuhause',      '🏡', '#7B9E87',  1, TRUE),
    ('health',     'Gesundheit',   '💚', '#6B8F71',  2, FALSE),
    ('goals',      'Ziele',        '🧭', '#4A7FA5',  3, FALSE),
    ('travel',     'Reisen',       '✈️', '#2E86AB',  4, FALSE),
    ('learning',   'Lernen',       '📚', '#6B7280',  5, FALSE),
    ('work',       'Arbeit',       '💼', '#8B7355',  6, FALSE),
    ('finance',    'Finanzen',     '💶', '#4A5568',  7, FALSE),
    ('beauty',     'Beauty',       '💄', '#C4A882',  8, FALSE),
    ('nutrition',  'Ernährung',    '🥗', '#7B9E87',  9, FALSE),
    ('car',        'Auto',         '🚗', '#6B7280', 10, FALSE),
    ('wellbeing',  'Wohlbefinden', '🌸', '#9B7EBD', 11, FALSE)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS area_categories (
    id          SERIAL PRIMARY KEY,
    area_id     INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    icon        VARCHAR(50),
    sort_order  INTEGER DEFAULT 0,
    UNIQUE (area_id, name)
);

INSERT INTO area_categories (area_id, name, icon, sort_order)
SELECT a.id, cat.name, cat.icon, cat.sort_order
FROM areas a,
(VALUES
    ('Reinigung',    '🧹', 1),
    ('Wäsche',       '👕', 2),
    ('Ordnung',      '📦', 3),
    ('Wartung',      '🔧', 4),
    ('Organisation', '📋', 5),
    ('Einkaufen',    '🛒', 6),
    ('Dekoration',   '🌺', 7)
) AS cat(name, icon, sort_order)
WHERE a.slug = 'home'
ON CONFLICT (area_id, name) DO NOTHING;

INSERT INTO area_categories (area_id, name, icon, sort_order)
SELECT a.id, cat.name, cat.icon, cat.sort_order
FROM areas a,
(VALUES
    ('Gesichtspflege', '🧴', 1),
    ('Haare',          '💇', 2),
    ('Nägel',          '💅', 3),
    ('Körperpflege',   '🛁', 4),
    ('Kosmetik',       '💄', 5),
    ('Friseur',        '✂️', 6)
) AS cat(name, icon, sort_order)
WHERE a.slug = 'beauty'
ON CONFLICT (area_id, name) DO NOTHING;

INSERT INTO area_categories (area_id, name, icon, sort_order)
SELECT a.id, cat.name, cat.icon, cat.sort_order
FROM areas a,
(VALUES
    ('Bücher',        '📚', 1),
    ('Online-Kurse',  '💻', 2),
    ('Sprachen',      '🌍', 3),
    ('Videos',        '🎬', 4),
    ('Podcasts',      '🎧', 5),
    ('Sonstiges',     '📝', 6)
) AS cat(name, icon, sort_order)
WHERE a.slug = 'learning'
ON CONFLICT (area_id, name) DO NOTHING;

INSERT INTO area_categories (area_id, name, icon, sort_order)
SELECT a.id, cat.name, cat.icon, cat.sort_order
FROM areas a,
(VALUES
    ('Wartung',          '🔧', 1),
    ('Reinigung',        '🧼', 2),
    ('TÜV & Behörden',   '📋', 3),
    ('Versicherung',     '📄', 4),
    ('Reparatur',        '🛠', 5)
) AS cat(name, icon, sort_order)
WHERE a.slug = 'car'
ON CONFLICT (area_id, name) DO NOTHING;

INSERT INTO area_categories (area_id, name, icon, sort_order)
SELECT a.id, cat.name, cat.icon, cat.sort_order
FROM areas a,
(VALUES
    ('Ausgaben',     '💸', 1),
    ('Einnahmen',    '💰', 2),
    ('Sparen',       '🏦', 3),
    ('Versicherung', '📄', 4),
    ('Steuern',      '🧾', 5),
    ('Investitionen','📈', 6)
) AS cat(name, icon, sort_order)
WHERE a.slug = 'finance'
ON CONFLICT (area_id, name) DO NOTHING;

CREATE TABLE IF NOT EXISTS tasks (
    id              SERIAL PRIMARY KEY,
    area_id         INTEGER REFERENCES areas(id) ON DELETE SET NULL,
    category_id     INTEGER REFERENCES area_categories(id) ON DELETE SET NULL,
    room_id         INTEGER REFERENCES home_rooms(id) ON DELETE SET NULL,
    title           VARCHAR(300) NOT NULL,
    notes           TEXT,
    priority        SMALLINT DEFAULT 2
                        CHECK (priority BETWEEN 1 AND 3),
    duration        VARCHAR(10)
                        CHECK (duration IN ('short', 'medium', 'long')),
    energy_level    VARCHAR(10)
                        CHECK (energy_level IN ('low', 'medium', 'high')),
    frequency_days  INTEGER,
    last_done       DATE,
    next_due        DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_area     ON tasks (area_id);
CREATE INDEX IF NOT EXISTS idx_tasks_next_due ON tasks (next_due) WHERE next_due IS NOT NULL;
"""

MIGRATE_SQL = """
ALTER TABLE day_plan ADD COLUMN IF NOT EXISTS repeat_days INTEGER;
ALTER TABLE day_plan ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES day_plan(id) ON DELETE SET NULL;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS bp_morning_systolic INTEGER;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS bp_morning_diastolic INTEGER;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS pulse_morning INTEGER;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS bp_evening_systolic INTEGER;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS bp_evening_diastolic INTEGER;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS pulse_evening INTEGER;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS medication_taken BOOLEAN DEFAULT FALSE;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS medication_notes TEXT;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS sleep_notes TEXT;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS knee_exercises_done BOOLEAN DEFAULT FALSE;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS anxiety INTEGER;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'health_records_date_key' AND conrelid = 'health_records'::regclass
  ) THEN
    ALTER TABLE health_records ADD CONSTRAINT health_records_date_key UNIQUE (date);
  END IF;
END
$$;
"""

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            database=settings.POSTGRES_DB,
            host=settings.POSTGRES_HOST,
            port=settings.POSTGRES_PORT,
            min_size=1,
            max_size=5,
        )
    return _pool


async def create_tables() -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(CREATE_TABLES_SQL)
        await conn.execute(MIGRATE_SQL)
