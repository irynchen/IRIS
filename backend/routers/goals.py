import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from database import get_pool
from auth.jwt import get_current_user

router = APIRouter(prefix="/api/goals", tags=["goals"])


# ─── Models ───────────────────────────────────────────────────────────────────

class VisionUpdate(BaseModel):
    content: Optional[str] = None


class GoalIn(BaseModel):
    area_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    why_important: Optional[str] = None
    horizon: str = "1_year"
    year: Optional[int] = None
    month: Optional[int] = None
    progress: int = Field(0, ge=0, le=100)
    status: str = "active"
    energy_level: str = "ok"
    deadline: Optional[str] = None
    notes: Optional[str] = None


class GoalPatch(BaseModel):
    area_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    why_important: Optional[str] = None
    progress: Optional[int] = Field(None, ge=0, le=100)
    status: Optional[str] = None
    energy_level: Optional[str] = None
    deadline: Optional[str] = None
    notes: Optional[str] = None


class MonthlyFocusIn(BaseModel):
    theme: Optional[str] = None
    goal_1: Optional[str] = None
    goal_2: Optional[str] = None
    goal_3: Optional[str] = None
    reward: Optional[str] = None
    review: Optional[str] = None


def _row_to_goal(row) -> dict:
    return {
        "id": row["id"],
        "area_id": row["area_id"],
        "title": row["title"],
        "description": row["description"],
        "why_important": row["why_important"],
        "horizon": row["horizon"],
        "year": row["year"],
        "month": row["month"],
        "progress": row["progress"],
        "status": row["status"],
        "energy_level": row["energy_level"],
        "deadline": str(row["deadline"]) if row["deadline"] else None,
        "notes": row["notes"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
    }


# ─── Vision ───────────────────────────────────────────────────────────────────

@router.get("/vision")
async def get_vision(user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT horizon, content, updated_at FROM life_vision ORDER BY id")
    return {r["horizon"]: r["content"] for r in rows}


@router.put("/vision/{horizon}")
async def update_vision(horizon: str, body: VisionUpdate, user=Depends(get_current_user)):
    if horizon not in ("10_years", "5_years", "3_years"):
        raise HTTPException(400, "Ungültiger Horizont")
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE life_vision SET content=$1, updated_at=NOW() WHERE horizon=$2",
            body.content, horizon
        )
    return {"ok": True}


# ─── Areas ────────────────────────────────────────────────────────────────────

@router.get("/areas")
async def get_areas(user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM goal_areas ORDER BY sort_order")
    return [dict(r) for r in rows]


# ─── Monthly Focus ─────────────────────────────────────────────────────────────

@router.get("/monthly-focus/{year}/{month}")
async def get_monthly_focus(year: int, month: int, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM monthly_focus WHERE year=$1 AND month=$2", year, month
        )
    if not row:
        return {"year": year, "month": month, "theme": None, "goal_1": None,
                "goal_2": None, "goal_3": None, "reward": None, "review": None}
    return dict(row)


@router.put("/monthly-focus/{year}/{month}")
async def upsert_monthly_focus(year: int, month: int, body: MonthlyFocusIn, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO monthly_focus (year, month, theme, goal_1, goal_2, goal_3, reward, review)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
               ON CONFLICT (year, month) DO UPDATE SET
                 theme=$3, goal_1=$4, goal_2=$5, goal_3=$6, reward=$7, review=$8""",
            year, month,
            body.theme, body.goal_1, body.goal_2, body.goal_3, body.reward, body.review
        )
    return {"ok": True}


# ─── Goals CRUD ───────────────────────────────────────────────────────────────

@router.get("")
async def list_goals(
    horizon: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    user=Depends(get_current_user),
):
    pool = await get_pool()
    clauses = []
    vals = []
    if horizon:
        clauses.append(f"horizon=${len(vals)+1}")
        vals.append(horizon)
    if year is not None:
        clauses.append(f"year=${len(vals)+1}")
        vals.append(year)
    if month is not None:
        clauses.append(f"month=${len(vals)+1}")
        vals.append(month)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"SELECT * FROM goals {where} ORDER BY status ASC, area_id ASC, id ASC", *vals
        )
    return [_row_to_goal(r) for r in rows]


@router.post("")
async def create_goal(body: GoalIn, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO goals
               (area_id, title, description, why_important, horizon, year, month,
                progress, status, energy_level, deadline, notes)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
               RETURNING *""",
            body.area_id, body.title, body.description, body.why_important,
            body.horizon, body.year, body.month, body.progress, body.status,
            body.energy_level,
            datetime.date.fromisoformat(body.deadline) if body.deadline else None,
            body.notes
        )
    return _row_to_goal(row)


@router.patch("/{goal_id}")
async def update_goal(goal_id: int, body: GoalPatch, user=Depends(get_current_user)):
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(400, "Keine Änderungen")
    if "deadline" in data:
        data["deadline"] = datetime.date.fromisoformat(data["deadline"]) if data["deadline"] else None
    data["updated_at"] = datetime.datetime.now(datetime.timezone.utc)
    pool = await get_pool()
    async with pool.acquire() as conn:
        sets = ", ".join(f"{k}=${i+2}" for i, k in enumerate(data))
        vals = list(data.values())
        row = await conn.fetchrow(
            f"UPDATE goals SET {sets} WHERE id=$1 RETURNING *", goal_id, *vals
        )
        if not row:
            raise HTTPException(404, "Ziel nicht gefunden")
    return _row_to_goal(row)


@router.delete("/{goal_id}")
async def delete_goal(goal_id: int, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM goals WHERE id=$1", goal_id)
    return {"ok": True}
