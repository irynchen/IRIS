# IRIS — Life Dashboard

Persönliches Life-Dashboard (eine Nutzerin). React 18 + Vite + TypeScript + Tailwind (PWA) im Frontend,
FastAPI (Python 3.10) + asyncpg + PostgreSQL 14 im Backend.

> **Wichtig:** Produktiv läuft **kein Docker**. Die `docker-compose.yml` im Repo ist nur das ursprüngliche
> Scaffolding und wird nicht benutzt. Live läuft systemd + venv + nginx direkt auf dem VPS.

## Produktivumgebung

| Was | Wert |
|---|---|
| Server | Strato VPS, Ubuntu 22.04, `root@93.90.200.194` (SSH per Key) |
| Erreichbar unter | **https://iris.goeloria.com** (DNS → VPS, SSL-Zertifikat liegt auf `.com`) |
| `iris.goeloria.de` | DNS zeigt (Stand 2026-11-08) auf die Strato-Parkseite `217.160.0.192`, **nicht** auf den VPS. Im Strato-DNS prüfen/korrigieren. |
| Repo auf dem Server | `/var/www/iris` (venv: `/var/www/iris/backend/venv`, Config: `/var/www/iris/.env`) |
| Backend | systemd-Service `iris` → uvicorn auf `127.0.0.1:8000` |
| Frontend | `npm run build` → `/var/www/iris/frontend/dist`, von nginx statisch ausgeliefert |
| nginx | Konfig im Repo: `nginx/iris.goeloria.de.conf` (proxied `/api/` auf Port 8000) |
| Datenbank | PostgreSQL 14, lokal auf dem VPS: User `iris`, DB `iris_db`, Host `localhost` |
| GitHub | `irynchen/IRIS` (public). Für Push muss `gh` als **`irynchen`** aktiv sein (`gh auth switch -u irynchen`); `ishev-xtend` hat keine Push-Rechte (403). |

## Deploy (Ablauf)

Lokal: committen und nach `origin/main` pushen. Dann auf dem VPS:

```bash
ssh root@93.90.200.194
cd /var/www/iris
bash scripts/backup_db.sh                      # Backup VOR dem Deploy -> /var/backups/iris/
git fetch && git reset --hard origin/main
backend/venv/bin/pip install -r backend/requirements.txt
cd frontend && npm ci && npm run build && cd ..
systemctl restart iris
systemctl status iris --no-pager
```

Tabellen werden beim Start automatisch angelegt/migriert (`create_tables()` in `backend/database.py`, idempotent).
Nginx muss nur bei Änderungen an `nginx/iris.goeloria.de.conf` neu geladen werden (`nginx -t && systemctl reload nginx`).

## Login / Passwort

Benutzername und bcrypt-Hash stehen in `/var/www/iris/.env` (`IRIS_USERNAME`, `IRIS_PASSWORD_HASH`).
Neues Passwort setzen:

```bash
cd /var/www/iris
backend/venv/bin/python -c "import bcrypt; print(bcrypt.hashpw(b'NEUES_PASSWORT', bcrypt.gensalt()).decode())"
nano .env            # IRIS_PASSWORD_HASH='<hash>'  (in einfache Anführungszeichen wegen $)
systemctl restart iris
```

JWT-Token laufen nach `JWT_EXPIRE_HOURS` (720 h = 30 Tage) ab. Symptom: in der App überall „Fehler beim Laden",
im Log `401 Unauthorized` → einfach ab- und neu anmelden.

## Diagnose „Datenbank geht nicht"

```bash
ssh root@93.90.200.194
systemctl is-active iris postgresql nginx
pg_isready -h localhost
journalctl -u iris -n 50 --no-pager
```

Erst prüfen: 401 im Log = abgelaufener Token (kein DB-Problem). Dann DNS (`nslookup iris.goeloria.com`).

## Modul „Innere Arbeit" (`/psychology`, Frontend: `frontend/src/pages/PsychologyPage.tsx`)

Speichert alles in zwei generischen Tabellen mit JSONB-Feld `data` (Router: `backend/routers/psychology.py`):
`psych_sessions` (Verlauf der Sitzungen) und `psych_items` (typisierte Einträge, Feld `type`).

Tabs: Сейчас · Маятники · Будущая Я · **Цели** · **Принципы** · Трансёрфинг · История.
In „Цели" und „Принципы" ist das Eingabeformular hinter einem gestrichelten „＋"-Button (`AddButton`) eingeklappt,
öffnet sich per Klick und klappt nach dem Speichern wieder zu — so stehen die vorhandenen Einträge oben.
Die Tab-Leiste ist ein Grid ohne Scrollen (Handy 4+3, ab `md` alle 7 in einer Zeile, Icon über Label).

### Tab „Мои цели" (`psych_items.type = 'goal'`)

`data`: `{ title, description, period, started_at, status, achieved_at? }`

- `period`: `week | month | year | 3y | 5y | 10y`. Frist = `started_at` + Periode (im Frontend berechnet, nicht gespeichert).
- `started_at` wird einmal beim Anlegen gesetzt (ISO) und beim Bearbeiten **nicht** geändert → die Zeit zählt ab Anlegen.
- `status`: `active | achieved`. „Erreicht" setzt `achieved_at`; erreichte Ziele bleiben als Historie
  (einklappbarer Block unten, mit Dauer und „in Frist / verspätet"). Der Kreis links macht es rückgängig.
- Ansicht „nach Zeiträumen" / „Liste" und Sortierung (Frist / Anlegedatum / Titel) liegen im `localStorage`
  (`psych_goals_view`, `psych_goals_sort`).
- Getrennt von der Seite **Ziele** (`GoalsPage.tsx`, Tabellen `goals`/`life_vision`) — die bleibt unverändert.

### Tab „Мои принципы" (`psych_items.type = 'principle'`)

`data`: `{ title, description, category, order }`

- Sortierung: „мой порядок" (manuell per ▲▼, gespeichert in `data.order`), Titel, Kategorie, neueste zuerst
  (`localStorage`: `psych_principles_sort`). Kategorie-Filter erscheint, sobald Kategorien existieren.
- Beim manuellen Verschieben werden nur die geänderten `order`-Werte per PATCH `/api/psychology/items/{id}` geschrieben.

## Design-Themes (Klassisch / Kreativ / Modern / Abend)

Ein Button „Design: …" (Komponente `frontend/src/components/ui/ThemeToggle.tsx`) schaltet bei jedem Klick
zum nächsten Design: Klassisch → Kreativ → Modern → Abend → Klassisch. Desktop: in der Seitenleiste unter dem IRIS-Logo;
Handy: unten „⋯ Mehr" → ganz unten im Menü. Die Wahl wird **pro Gerät** im `localStorage` (`iris_theme`) gespeichert
und in `main.tsx` vor dem ersten Rendern angewendet (`src/theme.ts`, setzt `<html data-theme="…">` und `theme-color`).

| Theme | `data-theme` | Charakter |
|---|---|---|
| Klassisch | `classic` (Default) | Ursprüngliches IRIS: Olivgrün/Sand, Cormorant Garamond + DM Sans, Radius 16 px |
| Kreativ | `vivid` | Pastell-Verlaufshintergrund mit Farbflecken, halbtransparente Karten, Verlauf Violett→Pink auf Buttons/aktiven Elementen und Seitentiteln, Unbounded + Nunito, Radius 24 px |
| Modern | `modern` | Monochrom Zink/Schwarz mit Indigo-Akzent, Manrope (fett, enge Laufweite), kleine Radien 8–12 px, feine Schatten |
| Abend | `dark` | Dunkles Design: warmes Anthrazit `#121316`/`#1C1E23`, helles Salbeigrün als Primary (dunkler Text darauf), Cormorant + DM Sans, `color-scheme: dark` für native Felder |

Technik (alles in `frontend/src/styles/globals.css`):
- Farben, Schatten und Schriften sind CSS-Variablen (`--color-*`, `--font-heading`, `--font-body`), pro Theme überschrieben.
- Überschriften nutzen `style={{ fontFamily: 'var(--font-heading)' }}` (früher fest `Cormorant Garamond`).
  `font-size-adjust` gleicht die optische Größe der breiteren Schriften an Cormorant an.
- Theme-spezifische Overrides greifen global auf Tailwind-Klassen zu (z. B. `[data-theme="vivid"] .rounded-2xl`,
  `.bg-\[var\(--color-primary\)\]` → Verlauf). Neue Komponenten bekommen die Themes automatisch, solange sie
  die `--color-*`-Variablen statt fester Farben benutzen.
- Im Kreativ-Theme nur fixierte Ebenen (Navigation, Sheets) mit `backdrop-filter` — auf normalen Karten würde es
  darin enthaltene `position: fixed`-Dialoge einsperren.
- Pastellfarbene Akzentblöcke mit festen Tailwind-Farben (z. B. `bg-rose-50` in „Маятники") bleiben in den hellen
  Themes gleich. Im Abend-Theme werden sie zentral in `globals.css` umgefärbt (`bg-*-50/100/200` → transparente
  Tönung, `border-*-200..400` → halbtransparent, `text-*-600..900` → helles `*-300`). **Neue feste Tailwind-Farben**
  (andere Farbtöne/Stufen) dort ergänzen, sonst erscheinen im Abend-Theme helle Flecken.
- Das Abend-Theme färbt auch Recharts-Achsen und -Tooltips um (`.recharts-*`).

## Lokale Entwicklung

```bash
cd frontend && npm ci && npx tsc --noEmit && npm run dev
```

Backend lokal benötigt eine `.env` (Vorlage: `.env.example`) und eine erreichbare PostgreSQL-Instanz.
