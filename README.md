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

## Lokale Entwicklung

```bash
cd frontend && npm ci && npx tsc --noEmit && npm run dev
```

Backend lokal benötigt eine `.env` (Vorlage: `.env.example`) und eine erreichbare PostgreSQL-Instanz.
