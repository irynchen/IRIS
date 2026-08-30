import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from database import get_pool
from auth.jwt import get_current_user

router = APIRouter(prefix="/api/health", tags=["health"])


# ─── Pydantic models ─────────────────────────────────────────────────────────

class HealthRecordCreate(BaseModel):
    date: str
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


class HealthRecordOut(BaseModel):
    id: int
    date: str
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
    sleep_quality: Optional[int] = None
    sleep_notes: Optional[str] = None
    knee_pain: Optional[int] = None
    knee_swelling: Optional[str] = None
    knee_exercises_done: bool = False
    steps: Optional[int] = None
    mood: Optional[int] = None
    energy: Optional[int] = None
    anxiety: Optional[int] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    # computed
    weight_delta: Optional[float] = None
    bp_status: Optional[str] = None


class HealthStats(BaseModel):
    period_days: int
    weight_start: Optional[float] = None
    weight_current: Optional[float] = None
    weight_delta: Optional[float] = None
    weight_goal: float = 75.0
    weight_to_goal: Optional[float] = None
    bp_avg_systolic: Optional[float] = None
    bp_avg_diastolic: Optional[float] = None
    sleep_avg_hours: Optional[float] = None
    sleep_avg_quality: Optional[float] = None
    knee_avg_pain: Optional[float] = None
    steps_avg: Optional[float] = None
    mood_avg: Optional[float] = None
    records_count: int = 0
    streak: int = 0


class HealthInsight(BaseModel):
    type: str
    severity: str
    title: str
    message: str
    data: Optional[dict] = None


class HealthGoal(BaseModel):
    id: int
    key: str
    target_value: Optional[float] = None
    target_value2: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────

SELECT_COLS = (
    "id, date::text AS date, weight_kg, "
    "bp_morning_systolic, bp_morning_diastolic, pulse_morning, "
    "bp_evening_systolic, bp_evening_diastolic, pulse_evening, "
    "medication_taken, medication_notes, "
    "sleep_hours, sleep_quality, sleep_notes, "
    "knee_pain, knee_swelling, knee_exercises_done, steps, "
    "mood, energy, anxiety, notes, "
    "created_at::text AS created_at, updated_at::text AS updated_at"
)


def _bp_status(sys: Optional[int], dia: Optional[int]) -> Optional[str]:
    if sys is None or dia is None:
        return None
    if sys >= 140 or dia >= 90:
        return "high"
    if sys >= 130 or dia >= 80:
        return "elevated"
    return "normal"


def _enrich(row: dict, prev_weight: Optional[float] = None) -> dict:
    r = dict(row)
    bp_sys = r.get("bp_morning_systolic")
    bp_dia = r.get("bp_morning_diastolic")
    r["bp_status"] = _bp_status(bp_sys, bp_dia)
    if prev_weight is not None and r.get("weight_kg") is not None:
        r["weight_delta"] = round(float(r["weight_kg"]) - float(prev_weight), 2)
    return r


def _linear_trend(values: list[float]) -> float:
    """Returns slope (change per step) via least-squares."""
    n = len(values)
    if n < 2:
        return 0.0
    xs = list(range(n))
    x_mean = sum(xs) / n
    y_mean = sum(values) / n
    num = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, values))
    den = sum((x - x_mean) ** 2 for x in xs)
    return num / den if den else 0.0


def _streak(dates: list[datetime.date]) -> int:
    if not dates:
        return 0
    sorted_dates = sorted(set(dates), reverse=True)
    today = datetime.date.today()
    streak = 0
    expected = today
    for d in sorted_dates:
        if d == expected or (streak == 0 and d == today - datetime.timedelta(days=1)):
            streak += 1
            expected = d - datetime.timedelta(days=1)
        else:
            break
    return streak


async def _compute_insights(records: list[dict], bp_by_date: Optional[dict] = None) -> list[HealthInsight]:
    insights: list[HealthInsight] = []
    bp_by_date = bp_by_date or {}

    if len(records) < 7:
        remaining = 7 - len(records)
        insights.append(HealthInsight(
            type="info", severity="info",
            title="Daten werden gesammelt",
            message=f"Noch {remaining} Einträge bis zu deinen ersten persönlichen Erkenntnissen."
        ))
        return insights

    # 1. Steps ↔ Knee correlation
    knee_steps = [(r["steps"], r["knee_pain"]) for r in records
                  if r.get("steps") is not None and r.get("knee_pain") is not None]
    if len(knee_steps) >= 5:
        low = [(s, p) for s, p in knee_steps if s < 5000]
        mid = [(s, p) for s, p in knee_steps if 5000 <= s <= 7000]
        high = [(s, p) for s, p in knee_steps if s > 7000]
        groups = {k: v for k, v in [("low", low), ("mid", mid), ("high", high)] if len(v) >= 2}
        if len(groups) >= 2:
            avgs = {k: sum(p for _, p in v) / len(v) for k, v in groups.items()}
            min_pain_group = min(avgs, key=lambda k: avgs[k])
            max_pain_group = max(avgs, key=lambda k: avgs[k])
            diff = avgs[max_pain_group] - avgs[min_pain_group]
            if diff >= 1.5:
                ranges = {"low": (0, 4999), "mid": (5000, 7000), "high": (7001, 12000)}
                opt_min, opt_max = ranges[min_pain_group]
                insights.append(HealthInsight(
                    type="correlation", severity="warning",
                    title="Schritte und Knie",
                    message=(
                        f"Bei mehr als 7.000 Schritten ist der Schmerz im Schnitt "
                        f"{diff:.1f} Punkte höher. Optimaler Bereich: {opt_min:,}–{opt_max:,} Schritte."
                    ),
                    data={"optimal_min": opt_min, "optimal_max": opt_max}
                ))

    # 2. Sleep → BP correlation
    sleep_bp = [(r["sleep_hours"], bp_by_date[r["date"]]) for r in records
                if r.get("sleep_hours") is not None and r["date"] in bp_by_date]
    if len(sleep_bp) >= 5:
        poor = [bp for h, bp in sleep_bp if h < 6]
        good = [bp for h, bp in sleep_bp if h >= 7]
        if len(poor) >= 2 and len(good) >= 2:
            diff = sum(poor) / len(poor) - sum(good) / len(good)
            if diff >= 8:
                insights.append(HealthInsight(
                    type="correlation", severity="info",
                    title="Schlaf und Blutdruck",
                    message=(
                        f"Nach weniger als 6 Stunden Schlaf liegt der Morgendruck im Schnitt "
                        f"{diff:.0f} mmHg höher. Guter Schlaf ist die beste Vorbeugung."
                    )
                ))

    # 3. Sleep → Mood correlation
    sleep_mood = [(r["sleep_hours"], r.get("sleep_quality"), r["mood"]) for r in records
                  if r.get("sleep_hours") is not None and r.get("mood") is not None]
    if len(sleep_mood) >= 5:
        poor_mood = [m for h, q, m in sleep_mood if h < 6 or (q is not None and q <= 4)]
        good_mood = [m for h, q, m in sleep_mood if h >= 7 and (q is None or q >= 7)]
        if len(poor_mood) >= 2 and len(good_mood) >= 2:
            diff = sum(good_mood) / len(good_mood) - sum(poor_mood) / len(poor_mood)
            if diff >= 1.5:
                insights.append(HealthInsight(
                    type="correlation", severity="info",
                    title="Schlaf und Stimmung",
                    message=(
                        f"An Tagen nach gutem Schlaf ist die Stimmung im Schnitt "
                        f"{diff:.1f} Punkte besser."
                    )
                ))

    # 4. Weight trend
    weights = [(r["date"], float(r["weight_kg"])) for r in records if r.get("weight_kg") is not None]
    weights.sort()
    if len(weights) >= 7:
        values = [w for _, w in weights]
        slope_per_day = _linear_trend(values)
        slope_per_week = slope_per_day * 7
        goal = 75.0
        current = weights[-1][1]
        to_goal = current - goal
        if slope_per_week < -0.1:
            insights.append(HealthInsight(
                type="achievement", severity="success",
                title="Gewicht geht runter",
                message=(
                    f"Tempo: ca. {abs(slope_per_week):.1f} kg/Woche. "
                    f"Aktuell {current:.1f} kg — noch {to_goal:.1f} kg bis zum Ziel."
                )
            ))
        elif slope_per_week > 0.2:
            insights.append(HealthInsight(
                type="trend", severity="warning",
                title="Gewicht steigt",
                message=f"In den letzten Wochen +{slope_per_week:.1f} kg/Woche."
            ))

    # 5. BP trend
    bp_vals = [bp_by_date[r["date"]] for r in records if r["date"] in bp_by_date]
    if len(bp_vals) >= 14:
        recent7 = bp_vals[-7:]
        prev7 = bp_vals[-14:-7]
        diff = sum(recent7) / 7 - sum(prev7) / 7
        if diff > 5:
            insights.append(HealthInsight(
                type="trend", severity="warning",
                title="Blutdruck steigt",
                message=f"Morgen-Systole stieg letzte Woche um {diff:.0f} mmHg im Vergleich zur Vorwoche."
            ))

    # 6. Streak
    dates = [datetime.date.fromisoformat(r["date"]) for r in records]
    s = _streak(dates)
    if s >= 7:
        insights.append(HealthInsight(
            type="trend", severity="info",
            title=f"{s} Tage in Folge",
            message=f"Du führst das Gesundheitstagebuch seit {s} Tagen ohne Unterbrechung. Ausgezeichnet!"
        ))

    # 7. Medication missed
    recent = sorted(records, key=lambda r: r["date"], reverse=True)[:5]
    missed = sum(1 for r in recent if not r.get("medication_taken", False))
    if missed >= 3:
        insights.append(HealthInsight(
            type="trend", severity="warning",
            title="Medikament vergessen",
            message=f"In {missed} der letzten 5 Tage wurde das Medikament nicht eingetragen."
        ))

    # 8. Optimal step range (minimum knee pain)
    if len(knee_steps) >= 7:
        buckets: dict[str, list] = {}
        for s_val, p_val in knee_steps:
            bucket = str((s_val // 1000) * 1000)
            buckets.setdefault(bucket, []).append(p_val)
        best_bucket = min(
            (k for k, v in buckets.items() if len(v) >= 2),
            key=lambda k: sum(buckets[k]) / len(buckets[k]),
            default=None
        )
        if best_bucket:
            bmin = int(best_bucket)
            bmax = bmin + 1999
            avg_pain = sum(buckets[best_bucket]) / len(buckets[best_bucket])
            # Only show if not already covered by correlation insight
            if not any(i.data and "optimal_min" in i.data for i in insights):
                insights.append(HealthInsight(
                    type="info", severity="info",
                    title="Optimale Schrittanzahl",
                    message=f"Bei {bmin:,}–{bmax:,} Schritten ist der Knieschmerz am geringsten ({avg_pain:.1f}/10).",
                    data={"optimal_min": bmin, "optimal_max": bmax}
                ))

    return insights


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/records/today")
async def get_today(user=Depends(get_current_user)):
    pool = await get_pool()
    today = datetime.date.today().isoformat()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"SELECT {SELECT_COLS} FROM health_records WHERE date = $1",
            datetime.date.fromisoformat(today)
        )
        if row is None:
            return None
        return _enrich(dict(row))


@router.get("/records/{record_date}")
async def get_by_date(record_date: str, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"SELECT {SELECT_COLS} FROM health_records WHERE date = $1",
            datetime.date.fromisoformat(record_date)
        )
        if row is None:
            return None
        return _enrich(dict(row))


@router.get("/records")
async def list_records(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    user=Depends(get_current_user)
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        if from_date and to_date:
            rows = await conn.fetch(
                f"SELECT {SELECT_COLS} FROM health_records "
                "WHERE date BETWEEN $1 AND $2 ORDER BY date DESC",
                datetime.date.fromisoformat(from_date),
                datetime.date.fromisoformat(to_date)
            )
        else:
            rows = await conn.fetch(
                f"SELECT {SELECT_COLS} FROM health_records ORDER BY date DESC LIMIT 100"
            )
        records = [dict(r) for r in rows]
        # enrich with weight delta
        result = []
        for i, r in enumerate(records):
            prev_w = records[i + 1].get("weight_kg") if i + 1 < len(records) else None
            result.append(_enrich(r, prev_w))
        return result


@router.post("/records")
async def upsert_record(item: HealthRecordCreate, user=Depends(get_current_user)):
    pool = await get_pool()
    d = datetime.date.fromisoformat(item.date)
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"""
            INSERT INTO health_records (
                date, weight_kg,
                bp_morning_systolic, bp_morning_diastolic, pulse_morning,
                bp_evening_systolic, bp_evening_diastolic, pulse_evening,
                medication_taken, medication_notes,
                sleep_hours, sleep_quality, sleep_notes,
                knee_pain, knee_swelling, knee_exercises_done, steps,
                mood, energy, anxiety, notes, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW())
            ON CONFLICT (date) DO UPDATE SET
                weight_kg = EXCLUDED.weight_kg,
                bp_morning_systolic = EXCLUDED.bp_morning_systolic,
                bp_morning_diastolic = EXCLUDED.bp_morning_diastolic,
                pulse_morning = EXCLUDED.pulse_morning,
                bp_evening_systolic = EXCLUDED.bp_evening_systolic,
                bp_evening_diastolic = EXCLUDED.bp_evening_diastolic,
                pulse_evening = EXCLUDED.pulse_evening,
                medication_taken = EXCLUDED.medication_taken,
                medication_notes = EXCLUDED.medication_notes,
                sleep_hours = EXCLUDED.sleep_hours,
                sleep_quality = EXCLUDED.sleep_quality,
                sleep_notes = EXCLUDED.sleep_notes,
                knee_pain = EXCLUDED.knee_pain,
                knee_swelling = EXCLUDED.knee_swelling,
                knee_exercises_done = EXCLUDED.knee_exercises_done,
                steps = EXCLUDED.steps,
                mood = EXCLUDED.mood,
                energy = EXCLUDED.energy,
                anxiety = EXCLUDED.anxiety,
                notes = EXCLUDED.notes,
                updated_at = NOW()
            RETURNING {SELECT_COLS}
            """,
            d, item.weight_kg,
            item.bp_morning_systolic, item.bp_morning_diastolic, item.pulse_morning,
            item.bp_evening_systolic, item.bp_evening_diastolic, item.pulse_evening,
            item.medication_taken, item.medication_notes,
            item.sleep_hours, item.sleep_quality, item.sleep_notes,
            item.knee_pain, item.knee_swelling, item.knee_exercises_done, item.steps,
            item.mood, item.energy, item.anxiety, item.notes,
        )
        return _enrich(dict(row))


@router.patch("/records/{record_date}")
async def patch_record(record_date: str, payload: dict, user=Depends(get_current_user)):
    pool = await get_pool()
    d = datetime.date.fromisoformat(record_date)
    allowed = {
        "weight_kg", "bp_morning_systolic", "bp_morning_diastolic", "pulse_morning",
        "bp_evening_systolic", "bp_evening_diastolic", "pulse_evening",
        "medication_taken", "medication_notes", "sleep_hours", "sleep_quality", "sleep_notes",
        "knee_pain", "knee_swelling", "knee_exercises_done", "steps",
        "mood", "energy", "anxiety", "notes"
    }
    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        async with (await get_pool()).acquire() as conn:
            row = await conn.fetchrow(
                f"SELECT {SELECT_COLS} FROM health_records WHERE date = $1", d
            )
            return _enrich(dict(row)) if row else None
    set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates))
    values = [d] + list(updates.values())
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"UPDATE health_records SET {set_clause}, updated_at = NOW() "
            f"WHERE date = $1 RETURNING {SELECT_COLS}",
            *values
        )
        return _enrich(dict(row)) if row else None


@router.get("/stats")
async def get_stats(days: int = Query(30), user=Depends(get_current_user)) -> HealthStats:
    pool = await get_pool()
    since = (datetime.date.today() - datetime.timedelta(days=days)).isoformat()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"SELECT {SELECT_COLS} FROM health_records WHERE date >= $1 ORDER BY date ASC",
            datetime.date.fromisoformat(since)
        )
        records = [dict(r) for r in rows]
        bp_rows = await conn.fetch(
            "SELECT systolic, diastolic FROM bp_readings WHERE measured_at >= $1",
            datetime.datetime.fromisoformat(since)
        )

    if not records and not bp_rows:
        return HealthStats(period_days=days)

    weights = [float(r["weight_kg"]) for r in records if r.get("weight_kg") is not None]
    bp_sys = [r["systolic"] for r in bp_rows]
    bp_dia = [r["diastolic"] for r in bp_rows]
    sleeps = [float(r["sleep_hours"]) for r in records if r.get("sleep_hours") is not None]
    sleep_q = [r["sleep_quality"] for r in records if r.get("sleep_quality") is not None]
    knee = [r["knee_pain"] for r in records if r.get("knee_pain") is not None]
    steps_list = [r["steps"] for r in records if r.get("steps") is not None]
    moods = [r["mood"] for r in records if r.get("mood") is not None]

    goal = 75.0
    w_current = weights[-1] if weights else None
    w_start = weights[0] if weights else None

    dates = [datetime.date.fromisoformat(r["date"]) for r in records]
    s = _streak(dates)

    return HealthStats(
        period_days=days,
        weight_start=w_start,
        weight_current=w_current,
        weight_delta=round(w_current - w_start, 2) if w_current and w_start else None,
        weight_goal=goal,
        weight_to_goal=round(w_current - goal, 2) if w_current else None,
        bp_avg_systolic=round(sum(bp_sys) / len(bp_sys), 1) if bp_sys else None,
        bp_avg_diastolic=round(sum(bp_dia) / len(bp_dia), 1) if bp_dia else None,
        sleep_avg_hours=round(sum(sleeps) / len(sleeps), 2) if sleeps else None,
        sleep_avg_quality=round(sum(sleep_q) / len(sleep_q), 1) if sleep_q else None,
        knee_avg_pain=round(sum(knee) / len(knee), 1) if knee else None,
        steps_avg=round(sum(steps_list) / len(steps_list)) if steps_list else None,
        mood_avg=round(sum(moods) / len(moods), 1) if moods else None,
        records_count=len(records),
        streak=s,
    )


@router.get("/insights")
async def get_insights(days: int = Query(60), user=Depends(get_current_user)):
    pool = await get_pool()
    since = (datetime.date.today() - datetime.timedelta(days=days)).isoformat()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"SELECT {SELECT_COLS} FROM health_records WHERE date >= $1 ORDER BY date ASC",
            datetime.date.fromisoformat(since)
        )
        bp_rows = await conn.fetch(
            "SELECT measured_at::date AS date, AVG(systolic) AS avg_systolic FROM bp_readings "
            "WHERE measured_at >= $1 GROUP BY measured_at::date",
            datetime.date.fromisoformat(since)
        )
    records = [dict(r) for r in rows]
    bp_by_date = {r["date"].isoformat(): float(r["avg_systolic"]) for r in bp_rows}
    return await _compute_insights(records, bp_by_date)


@router.get("/chart/weight")
async def chart_weight(days: int = Query(90), user=Depends(get_current_user)):
    pool = await get_pool()
    since = (datetime.date.today() - datetime.timedelta(days=days)).isoformat()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT date::text AS date, weight_kg FROM health_records "
            "WHERE date >= $1 AND weight_kg IS NOT NULL ORDER BY date ASC",
            datetime.date.fromisoformat(since)
        )
    return [{"date": r["date"], "weight": float(r["weight_kg"])} for r in rows]


@router.get("/chart/knee")
async def chart_knee(days: int = Query(30), user=Depends(get_current_user)):
    pool = await get_pool()
    since = (datetime.date.today() - datetime.timedelta(days=days)).isoformat()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT date::text AS date, knee_pain, steps FROM health_records "
            "WHERE date >= $1 ORDER BY date ASC",
            datetime.date.fromisoformat(since)
        )
    return [dict(r) for r in rows]


@router.get("/chart/mood")
async def chart_mood(days: int = Query(30), user=Depends(get_current_user)):
    pool = await get_pool()
    since = (datetime.date.today() - datetime.timedelta(days=days)).isoformat()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT date::text AS date, mood, sleep_hours FROM health_records "
            "WHERE date >= $1 ORDER BY date ASC",
            datetime.date.fromisoformat(since)
        )
    return [dict(r) for r in rows]


@router.get("/goals")
async def get_goals(user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, key, target_value, target_value2, unit, notes FROM health_goals ORDER BY id")
        return [dict(r) for r in rows]


@router.patch("/goals/{key}")
async def update_goal(key: str, payload: dict, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE health_goals SET target_value = $1, updated_at = NOW() "
            "WHERE key = $2 RETURNING id, key, target_value, target_value2, unit, notes",
            payload.get("target_value"), key
        )
        return dict(row) if row else None
