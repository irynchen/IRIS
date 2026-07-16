from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import date as Date, time as Time, timedelta
from database import get_pool
from auth.jwt import get_current_user

router = APIRouter(prefix="/api/day", tags=["day"])

SELECT_COLS = (
    "id, date::text AS date, time_from::text, time_to::text, title, "
    "category, priority, completed, notes, repeat_days, parent_id, "
    "created_at::text AS created_at"
)


class DayTaskIn(BaseModel):
    date: str
    time_from: Optional[str] = None
    time_to: Optional[str] = None
    title: str
    category: Optional[str] = "personal"
    priority: int = 2
    notes: Optional[str] = None
    repeat_days: Optional[int] = None


class DayTaskPatch(BaseModel):
    date: Optional[str] = None
    completed: Optional[bool] = None
    title: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[int] = None
    notes: Optional[str] = None
    time_from: Optional[str] = None
    time_to: Optional[str] = None
    repeat_days: Optional[int] = None


class DayTaskOut(BaseModel):
    id: int
    date: str
    time_from: Optional[str] = None
    time_to: Optional[str] = None
    title: str
    category: Optional[str] = None
    priority: int
    completed: bool
    notes: Optional[str] = None
    repeat_days: Optional[int] = None
    parent_id: Optional[int] = None
    created_at: Optional[str] = None


def parse_date(s: str) -> Date:
    return Date.fromisoformat(s)


def parse_time(s: Optional[str]) -> Optional[Time]:
    if not s:
        return None
    # HTML time input gives "HH:MM"; ensure we have a valid isoformat string
    parts = s.split(":")
    h, m = int(parts[0]), int(parts[1])
    sec = int(parts[2]) if len(parts) > 2 else 0
    return Time(h, m, sec)


def coerce_updates(updates: dict) -> dict:
    for key in ("time_from", "time_to"):
        if key in updates:
            updates[key] = parse_time(updates[key])
    if "date" in updates:
        updates["date"] = parse_date(updates["date"])
    return updates


@router.get("/plans", response_model=List[DayTaskOut])
async def list_plans(
    date: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user=Depends(get_current_user),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        if date:
            rows = await conn.fetch(
                f"SELECT {SELECT_COLS} FROM day_plan WHERE date = $1 "
                "ORDER BY time_from NULLS LAST, priority, id",
                parse_date(date),
            )
        elif date_from and date_to:
            rows = await conn.fetch(
                f"SELECT {SELECT_COLS} FROM day_plan WHERE date BETWEEN $1 AND $2 "
                "ORDER BY date, time_from NULLS LAST, priority",
                parse_date(date_from), parse_date(date_to),
            )
        else:
            rows = await conn.fetch(
                f"SELECT {SELECT_COLS} FROM day_plan "
                "ORDER BY date DESC, time_from NULLS LAST LIMIT 200"
            )
        return [dict(r) for r in rows]


@router.get("/stats")
async def day_stats(date: str, user=Depends(get_current_user)):
    date_obj = parse_date(date)
    pool = await get_pool()
    async with pool.acquire() as conn:
        total = await conn.fetchval("SELECT COUNT(*) FROM day_plan WHERE date = $1", date_obj)
        done = await conn.fetchval(
            "SELECT COUNT(*) FROM day_plan WHERE date = $1 AND completed = TRUE", date_obj
        )
        return {"total": total, "done": done}


@router.post("/plans", response_model=DayTaskOut)
async def create_plan(item: DayTaskIn, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"INSERT INTO day_plan (date, time_from, time_to, title, category, priority, notes, repeat_days) "
            f"VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING {SELECT_COLS}",
            parse_date(item.date), parse_time(item.time_from), parse_time(item.time_to), item.title,
            item.category, item.priority, item.notes, item.repeat_days,
        )
        return dict(row)


@router.patch("/plans/{plan_id}", response_model=DayTaskOut)
async def patch_plan(plan_id: int, patch: DayTaskPatch, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT id, date, repeat_days, completed FROM day_plan WHERE id = $1", plan_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")

        updates = coerce_updates(patch.model_dump(exclude_none=True))
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        set_clauses = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates.keys()))
        values = list(updates.values())
        row = await conn.fetchrow(
            f"UPDATE day_plan SET {set_clauses} WHERE id = $1 RETURNING {SELECT_COLS}",
            plan_id, *values,
        )

        completing = patch.completed is True and not existing["completed"]
        if completing and existing["repeat_days"]:
            next_date = existing["date"] + timedelta(days=existing["repeat_days"])
            await conn.execute(
                "INSERT INTO day_plan (date, time_from, time_to, title, category, priority, notes, repeat_days, parent_id) "
                "SELECT $1, time_from, time_to, title, category, priority, notes, repeat_days, id "
                "FROM day_plan WHERE id = $2",
                next_date, plan_id,
            )

        return dict(row)


@router.post("/plans/{plan_id}/complete", response_model=DayTaskOut)
async def complete_plan(plan_id: int, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT id, date, repeat_days, completed FROM day_plan WHERE id = $1", plan_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")

        row = await conn.fetchrow(
            f"UPDATE day_plan SET completed = NOT completed WHERE id = $1 RETURNING {SELECT_COLS}",
            plan_id,
        )

        if not existing["completed"] and existing["repeat_days"]:
            next_date = existing["date"] + timedelta(days=existing["repeat_days"])
            await conn.execute(
                "INSERT INTO day_plan (date, time_from, time_to, title, category, priority, notes, repeat_days, parent_id) "
                "SELECT $1, time_from, time_to, title, category, priority, notes, repeat_days, id "
                "FROM day_plan WHERE id = $2",
                next_date, plan_id,
            )

        return dict(row)


@router.delete("/plans/{plan_id}")
async def delete_plan(plan_id: int, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM day_plan WHERE id = $1", plan_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True}
