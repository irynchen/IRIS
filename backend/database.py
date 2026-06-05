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

CREATE TABLE IF NOT EXISTS home_tasks (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES home_rooms(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    frequency_days INTEGER,
    last_done DATE,
    next_due DATE,
    priority INTEGER DEFAULT 2,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

SEED_HOME_TASKS_SQL = """
INSERT INTO home_tasks (room_id, title, frequency_days, priority) VALUES
    ((SELECT id FROM home_rooms WHERE sort_order=1 ORDER BY id LIMIT 1), 'Arbeitsplatte abwischen', 1, 1),
    ((SELECT id FROM home_rooms WHERE sort_order=1 ORDER BY id LIMIT 1), 'Herd reinigen', 7, 2),
    ((SELECT id FROM home_rooms WHERE sort_order=1 ORDER BY id LIMIT 1), 'Kühlschrank aufräumen', 14, 3),
    ((SELECT id FROM home_rooms WHERE sort_order=2 ORDER BY id LIMIT 1), 'WC reinigen', 7, 1),
    ((SELECT id FROM home_rooms WHERE sort_order=2 ORDER BY id LIMIT 1), 'Dusche reinigen', 7, 1),
    ((SELECT id FROM home_rooms WHERE sort_order=2 ORDER BY id LIMIT 1), 'Spiegel putzen', 14, 2),
    ((SELECT id FROM home_rooms WHERE sort_order=3 ORDER BY id LIMIT 1), 'Bettzeug wechseln', 14, 1),
    ((SELECT id FROM home_rooms WHERE sort_order=3 ORDER BY id LIMIT 1), 'Stauben', 14, 2),
    ((SELECT id FROM home_rooms WHERE sort_order=4 ORDER BY id LIMIT 1), 'Saugen', 7, 1),
    ((SELECT id FROM home_rooms WHERE sort_order=4 ORDER BY id LIMIT 1), 'Stauben', 14, 2),
    ((SELECT id FROM home_rooms WHERE sort_order=5 ORDER BY id LIMIT 1), 'Boden wischen', 7, 2),
    ((SELECT id FROM home_rooms WHERE sort_order=6 ORDER BY id LIMIT 1), 'Schreibtisch aufräumen', 7, 2)
;
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
        count = await conn.fetchval("SELECT COUNT(*) FROM home_tasks")
        if count == 0:
            await conn.execute(SEED_HOME_TASKS_SQL)
