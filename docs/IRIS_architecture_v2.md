# IRIS — Architektur v2: Persönliches Lebens-Cockpit

**Stand:** 2026-06-08  
**Status:** Konzept & Migrationsplan — noch nicht implementiert

---

## Ziel

IRIS entwickelt sich von einer Aufgabenverwaltung zu einem **persönlichen Lebensmanagement-System**.

Die Anwendung bildet alle wichtigen Lebensbereiche strukturiert ab, bleibt dabei übersichtlich — auch bei mehreren tausend Einträgen — und ist so gebaut, dass neue Bereiche jederzeit ohne Datenbankänderungen ergänzt werden können.

---

## Teil 1: Zielarchitektur

### 1.1 Bereiche (Hauptmodule)

Jeder Eintrag gehört genau einem Bereich. Bereiche entsprechen dem linken Hauptmenü.

| Slug | Name | Icon |
|---|---|---|
| `home` | Zuhause | 🏡 |
| `health` | Gesundheit | 💚 |
| `goals` | Ziele | 🧭 |
| `travel` | Reisen | ✈️ |
| `learning` | Lernen | 📚 |
| `work` | Arbeit | 💼 |
| `finance` | Finanzen | 💶 |
| `beauty` | Beauty | 💄 |
| `nutrition` | Ernährung | 🥗 |
| `car` | Auto | 🚗 |
| `wellbeing` | Wohlbefinden | 🌸 |

Die Liste ist durch die Nutzerin erweiterbar und wird **datengetrieben** aus der Datenbank geladen — nicht hardcodiert im Frontend.

---

### 1.2 Hierarchie

```
Bereich
   ↓
Kategorie
   ↓
Raum (optional, nur Zuhause)
   ↓
Aufgabe
```

Beispiel:

```
Bereich:    Zuhause
Kategorie:  Reinigung
Raum:       Schlafzimmer
Aufgabe:    Fenster putzen
```

---

### 1.3 Kategorien je Bereich

Kategorien strukturieren die Aufgaben fachlich innerhalb eines Bereichs. Sie sind ebenfalls datengetrieben und individuell erweiterbar.

**Zuhause**
```
Reinigung · Wäsche · Ordnung · Wartung · Organisation · Einkaufen · Dekoration
```

**Gesundheit**
```
Arzttermine · Medikamente · Bewegung · Vorsorge · Ernährung · Physiotherapie
```

**Ziele**
```
Persönliche Ziele · Finanzielle Ziele · Karriere · Gesundheit · Reisen · Lernen
```

**Reisen**
```
Ideen · Planung · Gebucht · Vorbereitung · Erledigt
```

**Beauty**
```
Gesichtspflege · Haare · Nägel · Epilieren · Kosmetik · Friseur
```

Weitere Bereiche bekommen ihre Kategorien bei der jeweiligen Modul-Implementierung.

---

### 1.4 Räume (nur Zuhause)

Räume werden ausschließlich innerhalb des Bereichs **Zuhause** verwendet. Für alle anderen Bereiche ist das Feld ausgeblendet.

```
Küche · Esszimmer · Wohnzimmer · Schlafzimmer · Arbeitszimmer
Flur · Bad · Gästebad · Balkon · Keller · Auto
```

Die `home_rooms`-Tabelle bleibt unverändert bestehen.

---

### 1.5 Neue Aufgaben-Attribute

#### Priorität

| Wert | Label | Farbe |
|---|---|---|
| 1 | Niedrig | Grün |
| 2 | Mittel | Orange |
| 3 | Hoch | Rot |

Sichtbar in: Aufgabenlisten, Dashboard, Kalender, Detailansicht.

#### Geschätzte Dauer

| Wert (DB) | Label | Zeit | Icon |
|---|---|---|---|
| `short` | Kurz | 15 Minuten | ⚡ |
| `medium` | Mittel | 60 Minuten | 🕐 |
| `long` | Lang | 120 Minuten | ⏳ |

Wird später für automatische Kalenderblöcke genutzt.

#### Energiebedarf

| Wert (DB) | Label | Beispiel |
|---|---|---|
| `low` | Niedrig | Rechnung bezahlen, Termin vereinbaren |
| `medium` | Mittel | Staubsaugen, Küche reinigen |
| `high` | Hoch | Fenster putzen, Gardinen waschen |

Ziel: Die Nutzerin wählt Aufgaben passend zur aktuellen Tagesenergie.

---

### 1.6 Wiederholungen (erweitert)

Das bestehende `frequency_days`-Feld (INTEGER) bleibt unverändert. Die UI wird um zwei neue Optionen erweitert:

| Label | `frequency_days` |
|---|---|
| Keine | `NULL` |
| Täglich | `1` |
| 3 Tage | `3` |
| 1 Woche | `7` |
| 2 Wochen | `14` |
| 1 Monat | `30` |
| **3 Monate** *(neu)* | `90` |
| **6 Monate** *(neu)* | `180` |

---

### 1.7 Neue Module

#### Kalender

Neues Modul mit drei Ansichten: **Tag · Woche · Monat**

- Aufgaben werden automatisch anhand ihrer Fälligkeit (`next_due`) angezeigt
- Blockdauer ergibt sich aus dem `duration`-Feld (short=15min, medium=60min, long=120min)
- Filter nach: Bereich, Kategorie, Raum (nur Zuhause), Priorität, Dauer, Energiebedarf

#### Reisen-Modul

Einfacher Ideen-Manager — keine Vollplanung (dafür existiert Goeloria).

Felder:
```
Titel · Land · Ort · Beschreibung · Budget · Jahreszeit · Priorität · Status
```

Status-Workflow:
```
Idee → Geplant → Gebucht → Erledigt
```

Optional: Button **„In Goeloria öffnen"** für spätere Integration.

#### Dashboard „Mein Tag" — intelligent

Statt einer langen offenen Liste zeigt IRIS gezielte Empfehlungen:

```
3 wichtige Aufgaben heute
2 schnelle Aufgaben unter 15 Minuten
1 Gesundheitsaufgabe
1 überfällige Aufgabe
1 Aufgabe mit niedrigem Energiebedarf
```

---

## Teil 2: Migrationspfad

### 2.1 Abgrenzung — Was NICHT migriert wird

Folgende Tabellen bleiben bewusst separat:

| Tabelle | Begründung |
|---|---|
| `day_plan` | Zeitgesteuerte Kalenderblöcke mit date/time_from/time_to — anderes Konzept als Wartungsaufgaben |
| `health_records` | Metrik-Tracking (Messwerte, Blutdruck, Gewicht) — kein Task-Konzept |
| `doctors`, `doctor_appointments`, `medications` | Spezialisierte Gesundheitsdaten mit eigener Logik |
| `goals`, `life_vision`, `monthly_focus` | Langzeitziele mit Fortschritt %, Horizont, Lebensvision |
| `goal_areas` | Bleibt intern für das Ziele-Modul — wird nicht mit `areas` zusammengeführt |
| `home_rooms` | Bleibt als Referenztabelle, wird von `tasks` referenziert |

**Was migriert wird:** `home_tasks` → `tasks`

---

### 2.2 Neue Tabellen

#### Tabelle: `areas`

```sql
CREATE TABLE areas (
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
```

Seed:

```sql
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
ON CONFLICT (sort_order) DO NOTHING;
```

> `goal_areas` bleibt unverändert. Die beiden "Bereiche"-Konzepte sind bewusst getrennt: `areas` für Navigation und Tasks, `goal_areas` für das Ziele-Modul intern.

---

#### Tabelle: `area_categories`

```sql
CREATE TABLE area_categories (
    id          SERIAL PRIMARY KEY,
    area_id     INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    icon        VARCHAR(50),
    sort_order  INTEGER DEFAULT 0,
    UNIQUE (area_id, name)
);
```

Seed für Zuhause:

```sql
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
```

Weitere Kategorien werden beim jeweiligen Modul geseedet — kein Vorab-Seed nötig.

---

#### Tabelle: `tasks`

```sql
CREATE TABLE tasks (
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

CREATE INDEX idx_tasks_area     ON tasks (area_id);
CREATE INDEX idx_tasks_next_due ON tasks (next_due) WHERE next_due IS NOT NULL;
```

---

### 2.3 Datenmigration: `home_tasks` → `tasks`

Die Migration läuft in einer einzigen Transaktion — alles oder nichts:

```sql
BEGIN;

INSERT INTO tasks (
    area_id,
    room_id,
    title,
    notes,
    priority,
    frequency_days,
    last_done,
    next_due,
    created_at
)
SELECT
    (SELECT id FROM areas WHERE slug = 'home'),
    ht.room_id,
    ht.title,
    ht.notes,
    ht.priority,
    ht.frequency_days,
    ht.last_done,
    ht.next_due,
    ht.created_at
FROM home_tasks ht;

-- Verifikation vor COMMIT (manuell prüfen):
-- SELECT COUNT(*) FROM home_tasks;
-- SELECT COUNT(*) FROM tasks WHERE area_id = (SELECT id FROM areas WHERE slug = 'home');
-- Beide Zahlen müssen übereinstimmen. Bei Abweichung: ROLLBACK;

COMMIT;
```

Die alten IDs aus `home_tasks` werden nicht übernommen. Das ist unkritisch — IDs werden nur in der laufenden Session gehalten (kein externer Link, kein Lesezeichen).

---

### 2.4 Backend-Änderungen

#### Phase A: Übergangsphase — API bleibt kompatibel

Der Router `backend/routers/home.py` wird auf die `tasks`-Tabelle umgestellt. Die Endpunkte bleiben identisch — das Frontend merkt nichts.

| Endpunkt | Neue Abfrage |
|---|---|
| `GET /api/home/tasks` | `SELECT ... FROM tasks WHERE area_id = $home_area_id` |
| `POST /api/home/tasks` | `INSERT INTO tasks (..., area_id = $home_area_id)` |
| `PATCH /api/home/tasks/{id}` | `UPDATE tasks WHERE id = $1` |
| `DELETE /api/home/tasks/{id}` | `DELETE FROM tasks WHERE id = $1` |
| `POST /api/home/tasks/{id}/done` | `UPDATE tasks SET last_done, next_due WHERE id = $1` |
| `GET /api/home/today` | `... FROM tasks WHERE area_id = $home_area_id AND next_due <= $two_days` |
| `GET /api/home/overdue-count` | `... FROM tasks WHERE area_id = $home_area_id AND next_due < CURRENT_DATE` |

#### Phase B: Neuer universeller Endpunkt (für neue Bereiche)

Jeder neue Bereich nutzt denselben Router — kein neuer Python-Router nötig:

```
GET    /api/tasks?area_slug=beauty
POST   /api/tasks
PATCH  /api/tasks/{id}
DELETE /api/tasks/{id}
```

---

### 2.5 Frontend-Änderungen

#### Phase A: Keine Änderung nötig

`api/home.ts` und `store/homeStore.ts` bleiben unverändert, solange das Backend die gleiche Response-Struktur liefert.

#### Phase B: Typ-Erweiterung (additiv, nicht breaking)

```typescript
// frontend/src/api/home.ts
export interface HomeTask {
  id: number
  room_id: number
  title: string
  frequency_days: number | null
  last_done: string | null
  next_due: string | null
  priority: number
  notes: string | null
  status: TaskStatus
  // Neue optionale Felder:
  category_id?: number | null
  duration?: 'short' | 'medium' | 'long' | null
  energy_level?: 'low' | 'medium' | 'high' | null
}
```

#### Phase C: Generischer Store für neue Bereiche

Für Beauty, Lernen, Auto etc. wird kein eigener Store pro Bereich nötig — ein generischer `useTasksStore(areaSlug: string)` reicht für alle.

---

### 2.6 Risiken und Gegenmaßnahmen

| Risiko | Wahrscheinlichkeit | Gegenmaßnahme |
|---|---|---|
| Migration schlägt fehl, Daten verloren | Niedrig | Transaktion + manuelle Verifikation vor COMMIT; vorher `pg_dump` |
| IDs ändern sich → UI-Fehler | Niedrig | IDs nur in laufender Session, nach Reload neu geladen |
| `overdue_count` vergisst `WHERE area_id` → zu hohe Zahl | Mittel | Explizit im Code-Review prüfen |
| Zwei "Bereiche"-Konzepte (`areas` vs. `goal_areas`) verursachen Verwirrung | Mittel | `goal_areas` bleibt intern im Ziele-Modul; `areas` ist für Navigation und Tasks — im Code dokumentieren |
| `duration`/`energy_level` NULL bei bestehenden Tasks | Niedrig | Optional-Felder; NULL ist gültiger Zustand; Formulare ergänzen sie schrittweise |
| Neue Bereiche setzen `room_id` versehentlich | Niedrig | Application-Level-Validierung: `room_id` nur setzen wenn `area.has_rooms = TRUE` |

---

### 2.7 Migrations-Reihenfolge

```
Phase 1 — DB-Schema (kein Risiko, keine Datenverluste)
  ├── CREATE TABLE areas          (+ Seed 11 Bereiche)
  ├── CREATE TABLE area_categories (+ Seed Zuhause-Kategorien)
  └── CREATE TABLE tasks          (+ Indexes)

Phase 2 — Datenmigration
  └── INSERT INTO tasks SELECT FROM home_tasks  (Transaktion mit Verifikation)

Phase 3 — Backend umstellen
  └── home.py: alle Queries auf tasks umstellen
      (API-Endpunkte identisch, Frontend unverändert)

Phase 4 — Verifikation im Betrieb
  └── home_tasks bleibt leer vorhanden, 1–2 Wochen beobachten

Phase 5 — Aufräumen
  └── DROP TABLE home_tasks

Phase 6 — Neue Bereiche aktivieren
  ├── Universeller /api/tasks-Router
  ├── Navigation um neue Bereiche erweitern
  └── Neue Seiten nutzen generischen tasksStore
```

---

## Teil 3: Offene Entscheidungen

Die folgenden Punkte sind konzeptuell beschrieben, aber noch nicht final entschieden:

| Thema | Frage | Empfehlung |
|---|---|---|
| `day_plan` + `tasks` | Sollen Tagesplan-Einträge langfristig in `tasks` überführt werden? | Nein — `day_plan` ist zeitgesteuert (time blocks), `tasks` sind wiederkehrende Wartungsaufgaben. Getrennt lassen. |
| Kalender-Datenquelle | Zeigt der Kalender nur `tasks` oder auch `day_plan`? | Beide — mit eigenen Filtern je Typ |
| `goal_areas` → `areas` | Sollen Ziele-Bereiche auf `areas` referenzieren? | Langfristig ja, aber separate Migration — nicht Teil dieser Phase |
| Travel-Tabelle | Eigene `travel_ideas`-Tabelle oder generisch via `tasks` + Kategorie? | Eigene Tabelle — Reisen hat Sonderfelder (Land, Budget, Jahreszeit) die nicht in `tasks` passen |
| Intelligentes Dashboard | Wann wird die Empfehlungs-Logik implementiert? | Nach Phase 6 — wenn `duration` und `energy_level` in ausreichend Datensätzen befüllt sind |

---

## Teil 4: Was bestehende Funktionen bewahrt

| Funktion | Status nach Migration |
|---|---|
| Zuhause — Raum-Grid mit RoomCard | ✅ Unverändert |
| Zuhause — TodayBlock (überfällige Tasks) | ✅ Unverändert (anderer Query, gleiche API) |
| Zuhause — Task erstellen/bearbeiten/löschen | ✅ Unverändert |
| Zuhause — Als erledigt markieren + Wiederholung | ✅ Unverändert |
| Gesundheit — health_records, Blutdruck, Schlaf | ✅ Unverändert (eigene Tabelle) |
| Ärzte & Medikamente | ✅ Unverändert (eigene Tabellen) |
| Ziele — Goals, Bereiche, Monatsfokus | ✅ Unverändert (eigene Tabellen) |
| Mein Tag — day_plan | ✅ Unverändert (eigene Tabelle) |
| Dashboard-Widgets | ✅ Unverändert |
| Authentifizierung | ✅ Unverändert |
